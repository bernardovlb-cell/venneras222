import "server-only";
import { timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { users } from "../db/schema";
import { AppError, isUniqueViolation } from "../errors";
import { hashPassword, passwordProblem } from "../auth/password";
import { createSession } from "../auth/session";
import { enforceRateLimit } from "../rate-limit";
import { audit } from "../audit";

/**
 * Primeiro acesso: cria o usuário PROPRIETÁRIO pelo navegador, sem terminal.
 * Só funciona enquanto não existe nenhum proprietário ativo e exige o código SETUP_TOKEN
 * (variável de ambiente, mínimo de 16 caracteres). Depois disso a página deixa de existir (404).
 */
export async function ownerExists(): Promise<boolean> {
  const r = await db.select({ id: users.id }).from(users).where(and(eq(users.roleKey, "owner"), eq(users.isActive, true))).limit(1);
  return r.length > 0;
}

export function setupTokenConfigured(): boolean {
  return (process.env.SETUP_TOKEN ?? "").length >= 16;
}

function tokenMatches(given: string): boolean {
  const want = Buffer.from(process.env.SETUP_TOKEN ?? "");
  const got = Buffer.from(given);
  return want.length >= 16 && got.length === want.length && timingSafeEqual(got, want);
}

const schema = z.object({
  token: z.string().min(1, "Informe o código de configuração"),
  name: z.string().trim().min(3, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  password: z.string(),
});

export async function createFirstOwner(input: z.input<typeof schema>, meta: { ip: string; userAgent: string }) {
  await enforceRateLimit(`setup:${meta.ip}`, 5, 3600);
  const d = schema.parse(input);
  if (!setupTokenConfigured()) throw new AppError("not_configured", "Defina SETUP_TOKEN (16+ caracteres) nas variáveis de ambiente.", 503);
  if (!tokenMatches(d.token)) throw new AppError("bad_token", "Código de configuração incorreto.", 403, "token");
  const p = passwordProblem(d.password);
  if (p) throw new AppError("weak", p, 400, "password");
  const hash = await hashPassword(d.password);
  const userId = await db.transaction(async (tx) => {
    // trava global: duas requisições simultâneas não criam dois proprietários
    await tx.execute(sql`select pg_advisory_xact_lock(7461001)`);
    const existing = await tx.select({ id: users.id }).from(users).where(and(eq(users.roleKey, "owner"), eq(users.isActive, true))).limit(1);
    if (existing.length) throw new AppError("done", "O proprietário já foi criado. Use a tela de login.", 409);
    try {
      const [u] = await tx.insert(users).values({ name: d.name, email: d.email, passwordHash: hash, roleKey: "owner", acceptedTermsAt: new Date() }).returning({ id: users.id });
      return u.id;
    } catch (e) {
      if (isUniqueViolation(e, "users_email_lower_uq")) throw new AppError("dup", "Já existe uma conta com este e-mail.", 400, "email");
      throw e;
    }
  });
  await audit({ userId, action: "setup.owner_created", entity: "user", entityId: userId, ip: meta.ip });
  await createSession(userId, true, meta);
  return userId;
}

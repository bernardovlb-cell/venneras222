import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { addresses, carts, favorites, newsletterSubscribers, passwordResetTokens, reviews, roles, sessions, supportTickets, users } from "../db/schema";
import { AppError, isUniqueViolation } from "../errors";
import { hashPassword, passwordProblem, randomToken, sha256, verifyPassword } from "../auth/password";
import { createSession, destroyAllSessions } from "../auth/session";
import { enforceRateLimit } from "../rate-limit";
import { sendEmail } from "../email";
import { env } from "../env";
import { attachCartToUser } from "./cart";
import { audit } from "../audit";
import { addressSchema } from "./orders";

const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(160);
const passwordField = z.string().superRefine((v, ctx) => { const p = passwordProblem(v); if (p) ctx.addIssue({ code: "custom", message: p }); });

export const registerSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome").max(120),
  email: emailSchema,
  password: passwordField,
  acceptTerms: z.literal(true, { error: "É preciso aceitar os termos" }),
  marketingConsent: z.boolean().default(false),
});

export async function register(input: z.input<typeof registerSchema>, meta: { ip: string; userAgent: string }) {
  const data = registerSchema.parse(input);
  await enforceRateLimit(`register:${meta.ip}`, 5, 3600);
  const hash = await hashPassword(data.password);
  try {
    const [u] = await db.insert(users).values({
      name: data.name, email: data.email, passwordHash: hash, roleKey: "customer",
      acceptedTermsAt: new Date(), marketingConsent: data.marketingConsent, marketingConsentAt: data.marketingConsent ? new Date() : null,
    }).returning({ id: users.id });
    await createSession(u.id, false, meta);
    await attachCartToUser(u.id);
    return u.id;
  } catch (e) {
    // Mensagem genérica o suficiente, mas útil: e-mail já cadastrado é informação que o próprio formulário de login também revelaria.
    if (isUniqueViolation(e, "users_email_lower_uq")) throw new AppError("email_taken", "Já existe uma conta com este e-mail. Entre ou recupere a senha.", 400, "email");
    throw e;
  }
}

export async function login(emailRaw: string, password: string, meta: { ip: string; userAgent: string }, opts: { staffOnly?: boolean } = {}) {
  const email = emailSchema.safeParse(emailRaw);
  const generic = new AppError("invalid_credentials", "E-mail ou senha incorretos.", 401);
  await enforceRateLimit(`login-ip:${meta.ip}`, 20, 900);
  if (!email.success || !password) throw generic;
  await enforceRateLimit(`login-email:${email.data}`, 8, 900, "Muitas tentativas para este e-mail. Aguarde 15 minutos.");
  const u = (await db.select({ id: users.id, hash: users.passwordHash, active: users.isActive, isStaff: roles.isStaff })
    .from(users).innerJoin(roles, eq(roles.key, users.roleKey)).where(sql`lower(${users.email}) = ${email.data}`).limit(1))[0];
  const ok = await verifyPassword(password, u?.hash ?? null);
  if (!u || !ok || !u.active) throw generic;
  if (opts.staffOnly && !u.isStaff) throw generic;
  await createSession(u.id, u.isStaff, meta);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
  if (!u.isStaff) await attachCartToUser(u.id);
  if (u.isStaff) await audit({ userId: u.id, action: "login", entity: "user", entityId: u.id, ip: meta.ip });
  return { userId: u.id, isStaff: u.isStaff };
}

/** Sempre responde igual (não revela se o e-mail existe). */
export async function requestPasswordReset(emailRaw: string, meta: { ip: string }) {
  await enforceRateLimit(`reset-ip:${meta.ip}`, 5, 3600);
  const email = emailSchema.safeParse(emailRaw);
  if (!email.success) return;
  await enforceRateLimit(`reset-email:${email.data}`, 3, 3600);
  const u = (await db.select({ id: users.id, name: users.name }).from(users).where(and(sql`lower(${users.email}) = ${email.data}`, eq(users.isActive, true))).limit(1))[0];
  if (!u) return;
  const token = randomToken(32);
  await db.insert(passwordResetTokens).values({ tokenHash: sha256(token), userId: u.id, expiresAt: new Date(Date.now() + 3600 * 1000) });
  await sendEmail(email.data, "Redefinição de senha — ToyVille",
    `Olá, ${u.name}!\n\nPara criar uma nova senha, acesse (válido por 1 hora):\n${env.appUrl}/conta/redefinir?token=${token}\n\nSe você não pediu, ignore este e-mail.`);
}

export async function resetPassword(token: string, password: string, meta: { ip: string; userAgent: string }) {
  await enforceRateLimit(`reset-use:${meta.ip}`, 10, 3600);
  const p = passwordProblem(password);
  if (p) throw new AppError("weak_password", p, 400, "password");
  const t = (await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, sha256(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1))[0];
  if (!t) throw new AppError("invalid_token", "Link inválido ou expirado. Solicite um novo.");
  await db.transaction(async (tx) => {
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.tokenHash, t.tokenHash));
    await tx.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, t.userId));
  });
  await destroyAllSessions(t.userId); // derruba sessões antigas (possível invasor)
  const u = (await db.select({ isStaff: roles.isStaff }).from(users).innerJoin(roles, eq(roles.key, users.roleKey)).where(eq(users.id, t.userId)))[0];
  await createSession(t.userId, !!u?.isStaff, meta);
}

export async function changePassword(userId: string, current: string, next: string, meta: { ip: string; userAgent: string }) {
  const u = (await db.select({ hash: users.passwordHash, isStaff: roles.isStaff }).from(users).innerJoin(roles, eq(roles.key, users.roleKey)).where(eq(users.id, userId)))[0];
  if (!u || !(await verifyPassword(current, u.hash))) throw new AppError("wrong_password", "Senha atual incorreta.", 400, "current");
  const p = passwordProblem(next);
  if (p) throw new AppError("weak_password", p, 400, "password");
  await db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, userId));
  await destroyAllSessions(userId);
  await createSession(userId, u.isStaff, meta);
}

export const profileSchema = z.object({
  name: z.string().trim().min(3).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  marketingConsent: z.boolean(),
});

export async function updateProfile(userId: string, input: z.input<typeof profileSchema>) {
  const d = profileSchema.parse(input);
  await db.update(users).set({
    name: d.name, phone: d.phone || null, marketingConsent: d.marketingConsent,
    marketingConsentAt: d.marketingConsent ? new Date() : null, updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function saveAddress(userId: string, input: unknown, id?: string) {
  const d = addressSchema.extend({ label: z.string().trim().max(40).optional().or(z.literal("")), isDefault: z.boolean().default(false) }).parse(input);
  const count = (await db.select({ n: sql<number>`count(*)::int` }).from(addresses).where(eq(addresses.userId, userId)))[0].n;
  if (!id && count >= 10) throw new AppError("too_many", "Limite de 10 endereços.");
  await db.transaction(async (tx) => {
    if (d.isDefault) await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    const values = { ...d, label: d.label || null, phone: d.phone || null, complement: d.complement || null, isDefault: d.isDefault || count === 0 };
    if (id) {
      const r = await tx.update(addresses).set(values).where(and(eq(addresses.id, id), eq(addresses.userId, userId))).returning({ id: addresses.id });
      if (!r.length) throw new AppError("not_found", "Endereço não encontrado.", 404);
    } else {
      await tx.insert(addresses).values({ ...values, userId });
    }
  });
}

export async function deleteAddress(userId: string, id: string) {
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
}

export async function toggleFavorite(userId: string, productId: string): Promise<boolean> {
  const del = await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.productId, productId))).returning();
  if (del.length) return false;
  await db.insert(favorites).values({ userId, productId }).onConflictDoNothing();
  return true;
}

/**
 * Exclusão de conta (LGPD art. 18, VI): anonimiza dados pessoais da CONTA e encerra o acesso.
 * Pedidos são mantidos com os dados necessários ao cumprimento de obrigações legais/fiscais
 * (ex.: guarda de documentos fiscais e defesa em processos — art. 16 da LGPD).
 */
export async function anonymizeAccount(userId: string, meta: { ip: string }) {
  await db.transaction(async (tx) => {
    // também sai da newsletter (o e-mail deixa de existir em qualquer lista da loja)
    const [current] = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId));
    if (current) await tx.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, current.email.trim().toLowerCase()));
    const anonEmail = `excluido+${userId}@anonimo.invalid`;
    await tx.update(users).set({
      name: "Conta excluída", email: anonEmail, phone: null, passwordHash: null, isActive: false,
      marketingConsent: false, marketingConsentAt: null, anonymizedAt: new Date(), updatedAt: new Date(),
    }).where(eq(users.id, userId));
    await tx.delete(addresses).where(eq(addresses.userId, userId));
    await tx.delete(favorites).where(eq(favorites.userId, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.update(reviews).set({ authorName: "Cliente", userId: null }).where(eq(reviews.userId, userId));
    await tx.update(carts).set({ email: null, recoveryConsent: false, userId: null }).where(eq(carts.userId, userId));
    await tx.update(supportTickets).set({ phone: null }).where(eq(supportTickets.userId, userId));
  });
  await audit({ userId, action: "anonymize", entity: "user", entityId: userId, ip: meta.ip });
}

/** Exportação dos dados da conta (LGPD art. 18, II). */
export async function exportAccountData(userId: string) {
  const [u] = await db.select({ name: users.name, email: users.email, phone: users.phone, createdAt: users.createdAt, marketingConsent: users.marketingConsent }).from(users).where(eq(users.id, userId));
  const addrs = await db.select().from(addresses).where(eq(addresses.userId, userId));
  const favs = await db.select({ productId: favorites.productId }).from(favorites).where(eq(favorites.userId, userId));
  const revs = await db.select({ productId: reviews.productId, rating: reviews.rating, body: reviews.body, createdAt: reviews.createdAt }).from(reviews).where(eq(reviews.userId, userId));
  const { rows: ords } = await db.execute(sql`select id, number, created_at, total_cents, status, payment_status, shipping_method_name from orders where user_id = ${userId} order by created_at desc`);
  return { conta: u, enderecos: addrs, favoritos: favs, avaliacoes: revs, pedidos: ords, geradoEm: new Date().toISOString() };
}

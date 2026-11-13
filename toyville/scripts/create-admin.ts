/**
 * Cria (ou promove) o usuário PROPRIETÁRIO do painel.
 * Uso: npm run admin:create -- --email voce@exemplo.com --name "Seu Nome"
 * A senha é lida da variável ADMIN_PASSWORD ou digitada no terminal (não fica no histórico do shell).
 */
import { createInterface } from "node:readline/promises";
import { sql } from "drizzle-orm";
import { connect } from "./db";
import { users } from "../src/server/db/schema";
import { hashPassword, passwordProblem } from "../src/server/auth/password";

const args = process.argv.slice(2);
const arg = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const email = arg("email")?.trim().toLowerCase();
const name = arg("name") ?? "Proprietário";
const role = arg("role") ?? "owner";
if (!email) { console.error("Informe --email"); process.exit(1); }
let password = process.env.ADMIN_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("Senha (mín. 8, letras e números): ");
  rl.close();
}
const prob = passwordProblem(password);
if (prob) { console.error(prob); process.exit(1); }
const { db, close } = connect();
const hash = await hashPassword(password);
const updated = await db.update(users).set({ passwordHash: hash, roleKey: role, isActive: true }).where(sql`lower(${users.email}) = ${email}`).returning({ id: users.id });
if (!updated.length) await db.insert(users).values({ email, name, passwordHash: hash, roleKey: role, acceptedTermsAt: new Date() });
console.log(`Usuário ${email} pronto com papel "${role}". Acesse /admin/entrar`);
await close();

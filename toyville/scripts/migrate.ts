import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadEnv } from "./env";

/**
 * Aplica as migrações pendentes (idempotente; roda também a cada deploy na Vercel).
 * Usa DATABASE_URL_DIRECT se existir (conexão direta/“session pooler” do Supabase); senão DATABASE_URL.
 * `prepare: false` mantém compatibilidade com o pooler em modo transação (porta 6543).
 */
loadEnv();
const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não configurada");
const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
await migrate(drizzle(client), { migrationsFolder: "drizzle" });
console.log("Migrações aplicadas.");
await client.end();

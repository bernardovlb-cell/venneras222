import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { poolConfig } from "../src/server/db/pg-config";
import { loadEnv } from "./env";

/**
 * Aplica as migrações pendentes (idempotente; roda também a cada deploy na Vercel).
 * Usa DATABASE_URL_DIRECT se existir (conexão direta/“session pooler” do Supabase); senão DATABASE_URL.
 */
loadEnv();
const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não configurada");
const pool = new Pool(poolConfig(url, { max: 1, query_timeout: 120_000 }));
await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
console.log("Migrações aplicadas.");
await pool.end();

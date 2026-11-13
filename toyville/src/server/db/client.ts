import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DbOrTx = DB | Tx;

const globalForDb = globalThis as unknown as { __tvSql?: ReturnType<typeof postgres>; __tvDb?: DB };

function create(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada. Veja .env.example.");
  const client = postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? 5),
    // Poolers em modo transação (Supabase porta 6543) não suportam prepared statements.
    prepare: process.env.DB_PREPARE === "true",
    idle_timeout: 20,
    onnotice: () => {},
  });
  globalForDb.__tvSql = client;
  return drizzle(client, { schema });
}

export const db: DB = globalForDb.__tvDb ?? (globalForDb.__tvDb = create());
export { schema };

export async function closeDb() {
  await globalForDb.__tvSql?.end({ timeout: 5 });
  globalForDb.__tvSql = undefined;
  globalForDb.__tvDb = undefined;
}

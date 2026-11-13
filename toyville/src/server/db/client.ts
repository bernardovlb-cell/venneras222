import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";
import { poolConfig } from "./pg-config";

export type DB = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DbOrTx = DB | Tx;

const globalForDb = globalThis as unknown as { __tvPool?: Pool; __tvDb?: DB };

function create(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada. Veja .env.example.");
  const pool = new Pool(poolConfig(url));
  // Erros de conexões ociosas (ex.: derrubadas pelo pooler) não podem derrubar o processo.
  pool.on("error", (err) => console.error("[toyville] conexão ociosa com o banco encerrada:", err.message));
  // Vercel Fluid Compute: mantém a instância viva até as conexões ociosas fecharem, evitando
  // que a função seja suspensa com sockets abertos (que voltam "mortos" e travam a próxima requisição).
  // Fora da Vercel, não tem efeito.
  attachDatabasePool(pool);
  globalForDb.__tvPool = pool;
  return drizzle(pool, { schema });
}

export const db: DB = globalForDb.__tvDb ?? (globalForDb.__tvDb = create());
export { schema };

export async function closeDb() {
  await globalForDb.__tvPool?.end();
  globalForDb.__tvPool = undefined;
  globalForDb.__tvDb = undefined;
}

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/server/db/schema";
import { poolConfig } from "../src/server/db/pg-config";
import { loadEnv } from "./env";

export function connect() {
  loadEnv();
  const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  const pool = new Pool(poolConfig(url, { max: 1, query_timeout: 120_000 }));
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

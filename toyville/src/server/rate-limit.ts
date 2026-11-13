import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db/client";
import { AppError } from "./errors";

/**
 * Limitação de requisições em janela fixa, persistida no Postgres
 * (funciona em ambiente serverless com várias instâncias).
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then now() else rate_limits.window_start end
    returning count
  `);
  const count = Number(rows[0]?.count ?? 1);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number, message = "Muitas tentativas. Aguarde alguns minutos e tente novamente.") {
  const r = await rateLimit(key, limit, windowSeconds);
  if (!r.allowed) throw new AppError("rate_limited", message, 429);
}

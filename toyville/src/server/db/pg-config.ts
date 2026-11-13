import type { PoolConfig } from "pg";

/**
 * Configuração de conexão compartilhada pelo site, scripts e testes.
 * - SSL: obrigatório fora do localhost (tráfego entre a hospedagem e o banco criptografado).
 *   DB_SSL=false desliga (só para bancos locais/privados). O certificado do pooler do Supabase
 *   não é verificado contra uma CA local (rejectUnauthorized: false): criptografa o tráfego,
 *   mas não autentica o servidor. Para verificação completa, configure DB_SSL_CA com o certificado
 *   do Supabase (Project Settings > Database > SSL).
 * - Timeouts: falhar rápido em vez de prender a página quando o banco não responde.
 */
export function poolConfig(connectionString: string, overrides: Partial<PoolConfig> = {}): PoolConfig {
  const host = (() => { try { return new URL(connectionString).hostname; } catch { return ""; } })();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "";
  const sslDisabled = process.env.DB_SSL === "false" || local;
  const ca = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");
  return {
    connectionString,
    ssl: sslDisabled ? false : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 5_000, // curto: conexões ociosas fecham antes da função ser suspensa
    connectionTimeoutMillis: 10_000,
    query_timeout: 25_000,
    ...overrides,
  };
}

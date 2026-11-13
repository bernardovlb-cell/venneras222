import "server-only";

export const env = {
  get appUrl() { return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""); },
  get isProd() { return process.env.NODE_ENV === "production"; },
  get mpAccessToken() { return process.env.MP_ACCESS_TOKEN ?? ""; },
  get mpWebhookSecret() { return process.env.MP_WEBHOOK_SECRET ?? ""; },
  get mpApiBase() { return (process.env.MP_API_BASE_URL || "https://api.mercadopago.com").replace(/\/$/, ""); },
  get mpStatementDescriptor() { return (process.env.MP_STATEMENT_DESCRIPTOR ?? "TOYVILLE").slice(0, 13); },
  get cronSecret() { return process.env.CRON_SECRET ?? ""; },
  get storageDriver() { return (process.env.STORAGE_DRIVER ?? "local") as "local" | "supabase"; },
  get emailProvider() { return (process.env.EMAIL_PROVIDER ?? "outbox") as "outbox" | "resend"; },
};

/**
 * Ambiente do Mercado Pago DECLARADO em MP_ENVIRONMENT (test | production).
 * Não dá para deduzir pelo prefixo: no Checkout Pro as credenciais de teste também começam com APP_USR-.
 * Sem declaração, o modo fica "unknown" e o painel trata como pendência.
 */
export function mercadoPagoMode(): "not_configured" | "test" | "production" | "unknown" {
  if (!env.mpAccessToken) return "not_configured";
  const declared = (process.env.MP_ENVIRONMENT ?? "").trim().toLowerCase();
  if (declared === "test" || declared === "production") return declared;
  return env.mpAccessToken.startsWith("TEST-") ? "test" : "unknown";
}

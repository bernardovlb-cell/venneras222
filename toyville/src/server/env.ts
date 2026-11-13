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

/** Credenciais de teste do Mercado Pago começam com TEST-. */
export function mercadoPagoMode(): "not_configured" | "test" | "production" {
  const t = env.mpAccessToken;
  if (!t) return "not_configured";
  return t.startsWith("TEST-") ? "test" : "production";
}

/** Log estruturado simples (JSON em produção). Nunca registre senhas, tokens ou dados de cartão. */
type Level = "info" | "warn" | "error";

export function log(level: Level, msg: string, data?: Record<string, unknown>) {
  if (process.env.VITEST && level !== "error") return;
  const entry = { level, msg, time: new Date().toISOString(), ...data };
  const line = process.env.NODE_ENV === "production" ? JSON.stringify(entry) : `[${level}] ${msg}${data ? " " + JSON.stringify(data) : ""}`;
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

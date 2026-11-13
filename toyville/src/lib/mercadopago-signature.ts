import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validação da assinatura dos webhooks do Mercado Pago (documentação oficial "Webhooks > Validar origem"):
 *  header x-signature: "ts=<ts>,v1=<hmac>"
 *  manifest: "id:<data.id da URL em minúsculas>;request-id:<x-request-id>;ts:<ts>;"
 *  (partes ausentes são omitidas) — HMAC-SHA256 hex com a chave secreta do webhook.
 */
export function parseSignatureHeader(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  let ts = "";
  let v1 = "";
  for (const part of header.split(",")) {
    const [k, ...rest] = part.split("=");
    const v = rest.join("=").trim();
    if (k?.trim() === "ts") ts = v;
    if (k?.trim() === "v1") v1 = v;
  }
  return ts && v1 ? { ts, v1 } : null;
}

export function buildManifest(dataId: string | null, requestId: string | null, ts: string): string {
  let m = "";
  if (dataId) m += `id:${dataId.toLowerCase()};`;
  if (requestId) m += `request-id:${requestId};`;
  m += `ts:${ts};`;
  return m;
}

export function signManifest(manifest: string, secret: string): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

export interface VerifyArgs {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
  /** Tolerância de tempo (ms) para evitar replay. 0 = não verifica. */
  maxAgeMs?: number;
  now?: number;
}

export function verifyMercadoPagoSignature(a: VerifyArgs): { valid: boolean; reason?: string } {
  if (!a.secret) return { valid: false, reason: "secret_not_configured" };
  const parsed = parseSignatureHeader(a.signatureHeader);
  if (!parsed) return { valid: false, reason: "missing_signature" };
  const expected = signManifest(buildManifest(a.dataId, a.requestId, parsed.ts), a.secret);
  const ok = expected.length === parsed.v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parsed.v1));
  if (!ok) return { valid: false, reason: "bad_signature" };
  if (a.maxAgeMs && a.maxAgeMs > 0) {
    // A documentação descreve ts em milissegundos, mas exemplos mostram segundos; aceitamos ambos.
    const tsNum = Number(parsed.ts);
    const tsMs = tsNum < 1e12 ? tsNum * 1000 : tsNum;
    const now = a.now ?? Date.now();
    if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > a.maxAgeMs) return { valid: false, reason: "stale" };
  }
  return { valid: true };
}

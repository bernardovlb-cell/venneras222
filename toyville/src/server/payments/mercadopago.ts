import "server-only";
import { env } from "../env";
import { AppError } from "../errors";
import { log } from "../log";

/**
 * Cliente mínimo da API do Mercado Pago (Checkout Pro + consulta de pagamentos + reembolso).
 * Nenhum dado de cartão passa pelo servidor da loja: o pagamento acontece no ambiente do Mercado Pago.
 * Referências: /checkout/preferences, /v1/payments/{id}, /v1/payments/search, /v1/payments/{id}/refunds.
 */
export interface MpPayment {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount: number;
  transaction_amount_refunded?: number;
  currency_id?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  installments?: number;
  date_approved?: string | null;
  date_created?: string;
  live_mode?: boolean;
}

export function isConfigured() {
  return !!env.mpAccessToken;
}

async function mpFetch<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  if (!env.mpAccessToken) throw new AppError("payments_not_configured", "Pagamentos ainda não configurados.", 503);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.mpAccessToken}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;
  let res: Response;
  try {
    res = await fetch(`${env.mpApiBase}${path}`, { ...init, headers, signal: AbortSignal.timeout(15000), cache: "no-store" });
  } catch (e) {
    log("error", "mercadopago: falha de rede", { path, error: String(e) });
    throw new AppError("payment_provider_unreachable", "Não foi possível contatar o Mercado Pago. Tente novamente em instantes.", 502);
  }
  const text = await res.text();
  if (!res.ok) {
    log("error", "mercadopago: resposta de erro", { path, status: res.status, body: text.slice(0, 500) });
    throw new AppError("payment_provider_error", "O Mercado Pago recusou a solicitação.", 502);
  }
  return JSON.parse(text) as T;
}

const toReais = (cents: number) => Math.round(cents) / 100;

export interface PreferenceInput {
  orderId: string;
  orderNumber: number;
  accessToken: string;
  lines: { sku: string; title: string; quantity: number; totalCents: number; pictureUrl: string | null; categoryId?: string }[];
  shippingCents: number;
  payer: { name: string; email: string; phone?: string | null; cpf?: string | null };
  expiresAt: Date;
  maxInstallments: number;
}

export async function createPreference(p: PreferenceInput): Promise<{ id: string; initPoint: string }> {
  const base = env.appUrl;
  const https = base.startsWith("https://");
  const returnUrl = `${base}/pedido/${p.orderId}?t=${encodeURIComponent(p.accessToken)}`;
  const [first, ...rest] = p.payer.name.trim().split(/\s+/);
  const body: Record<string, unknown> = {
    // Uma linha por item com quantidade 1 e o valor TOTAL da linha (já com promoções e rateio de cupom):
    // garante que a soma enviada ao Mercado Pago seja exatamente o total do pedido.
    items: p.lines.map((l) => ({
      id: l.sku,
      title: (l.quantity > 1 ? `${l.quantity}x ${l.title}` : l.title).slice(0, 250),
      quantity: 1,
      unit_price: toReais(l.totalCents),
      currency_id: "BRL",
      ...(l.pictureUrl && /^https:\/\//.test(l.pictureUrl) ? { picture_url: l.pictureUrl } : {}),
      category_id: "toys",
    })),
    payer: {
      name: first, surname: rest.join(" ") || undefined, email: p.payer.email,
      ...(p.payer.cpf ? { identification: { type: "CPF", number: p.payer.cpf } } : {}),
    },
    external_reference: p.orderId,
    statement_descriptor: env.mpStatementDescriptor,
    back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
    expires: true,
    expiration_date_to: p.expiresAt.toISOString(),
    date_of_expiration: p.expiresAt.toISOString(), // Pix/boleto expiram junto com a reserva de estoque
    payment_methods: { installments: p.maxInstallments },
    metadata: { order_number: p.orderNumber },
  };
  if (p.shippingCents > 0) body.shipments = { mode: "not_specified", cost: toReais(p.shippingCents) };
  // O Mercado Pago só aceita retorno automático e notificações em URLs públicas HTTPS.
  if (https) {
    body.auto_return = "approved";
    body.notification_url = `${base}/api/webhooks/mercadopago?source_news=webhooks`;
  }
  const r = await mpFetch<{ id: string; init_point: string; sandbox_init_point?: string }>("/checkout/preferences", {
    method: "POST", body: JSON.stringify(body), idempotencyKey: `pref-${p.orderId}`,
  });
  return { id: r.id, initPoint: r.init_point };
}

export async function getPayment(id: string): Promise<MpPayment> {
  if (!/^\d{1,20}$/.test(id)) throw new AppError("invalid_payment_id", "Identificador de pagamento inválido.");
  return mpFetch<MpPayment>(`/v1/payments/${id}`);
}

export async function searchPaymentsByOrder(orderId: string): Promise<MpPayment[]> {
  const r = await mpFetch<{ results: MpPayment[] }>(`/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`);
  return r.results ?? [];
}

export async function refundPayment(id: string, amountCents: number | null, idempotencyKey: string) {
  return mpFetch<{ id: number; amount: number; status: string }>(`/v1/payments/${id}/refunds`, {
    method: "POST",
    body: JSON.stringify(amountCents != null ? { amount: toReais(amountCents) } : {}),
    idempotencyKey,
  });
}

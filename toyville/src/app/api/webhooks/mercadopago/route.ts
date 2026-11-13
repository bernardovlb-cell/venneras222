import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { webhookEvents } from "@/server/db/schema";
import { env } from "@/server/env";
import { verifyMercadoPagoSignature } from "@/lib/mercadopago-signature";
import { syncPaymentById } from "@/server/services/orders";
import { log } from "@/server/log";

export const dynamic = "force-dynamic";

/**
 * Webhook do Mercado Pago (tópico "payment").
 * 1. Valida a assinatura x-signature (HMAC-SHA256) com a chave secreta do webhook.
 * 2. Deduplica por x-request-id (notificações repetidas não são reprocessadas após sucesso).
 * 3. NÃO confia no corpo: consulta o pagamento na API e aplica a máquina de estados do pedido.
 * Respostas 5xx fazem o Mercado Pago reenviar a notificação.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* corpo vazio ou inválido */ }
  const bodyData = (body.data ?? {}) as { id?: string | number };
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? (bodyData.id != null ? String(bodyData.id) : null);
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? (typeof body.type === "string" ? body.type : null);
  const requestId = req.headers.get("x-request-id");
  const signature = req.headers.get("x-signature");

  const check = verifyMercadoPagoSignature({
    signatureHeader: signature, requestId, dataId: url.searchParams.get("data.id") ?? dataId, secret: env.mpWebhookSecret,
    maxAgeMs: Number(process.env.MP_WEBHOOK_MAX_AGE_MS ?? 0),
  });
  const eventKey = requestId ?? `${topic}:${dataId}:${signature ?? "nosig"}`;

  if (!check.valid) {
    log("warn", "webhook mercadopago rejeitado", { reason: check.reason, topic, dataId });
    await db.insert(webhookEvents).values({ provider: "mercadopago", eventKey: `invalid:${eventKey}:${Date.now()}`, topic, resourceId: dataId, payload: body, signatureValid: false, error: check.reason })
      .onConflictDoNothing();
    return Response.json({ ok: false }, { status: check.reason === "secret_not_configured" ? 503 : 401 });
  }

  if (topic !== "payment" || !dataId || !/^\d{1,20}$/.test(dataId)) {
    return Response.json({ ok: true, ignored: true });
  }

  const inserted = await db.insert(webhookEvents).values({ provider: "mercadopago", eventKey, topic, resourceId: dataId, payload: body, signatureValid: true })
    .onConflictDoNothing().returning({ id: webhookEvents.id });
  if (!inserted.length) {
    const prev = (await db.select().from(webhookEvents).where(and(eq(webhookEvents.provider, "mercadopago"), eq(webhookEvents.eventKey, eventKey))).limit(1))[0];
    if (prev?.processedAt) return Response.json({ ok: true, duplicate: true });
  }

  try {
    const outcome = await syncPaymentById(dataId, "webhook");
    await db.update(webhookEvents).set({ processedAt: new Date(), error: null })
      .where(and(eq(webhookEvents.provider, "mercadopago"), eq(webhookEvents.eventKey, eventKey)));
    return Response.json({ ok: true, outcome });
  } catch (e) {
    await db.update(webhookEvents).set({ error: String(e).slice(0, 500) })
      .where(and(eq(webhookEvents.provider, "mercadopago"), eq(webhookEvents.eventKey, eventKey), sql`${webhookEvents.processedAt} is null`));
    log("error", "falha ao processar webhook", { dataId, error: String(e) });
    return Response.json({ ok: false }, { status: 500 });
  }
}

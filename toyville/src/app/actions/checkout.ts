"use server";
import { getCurrentUser } from "@/server/auth/session";
import { readCartId, getCartItems, computePricing } from "@/server/services/cart";
import { placeOrder, startPayment, addressSchema, applyProviderPayment, formatOrderNumber, type CheckoutInput } from "@/server/services/orders";
import { sendEmail } from "@/server/email";
import { env } from "@/server/env";
import { formatBRL } from "@/lib/money";
import { quoteAll, quoteMethod, type ShippingAddress } from "@/server/shipping";
import { toActionError, type ActionResult, AppError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { requestMeta } from "@/server/http";
import { db } from "@/server/db/client";
import { carts, orders } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { sha256 } from "@/server/auth/password";
import * as mp from "@/server/payments/mercadopago";
import { saveCartContact } from "@/server/services/cart-recovery";
import type { PricingResult } from "@/lib/pricing";

async function cartContext() {
  const cartId = await readCartId();
  if (!cartId) throw new AppError("empty_cart", "Seu carrinho está vazio.");
  const cart = (await db.select().from(carts).where(eq(carts.id, cartId)).limit(1))[0];
  if (!cart || cart.convertedOrderId) throw new AppError("empty_cart", "Seu carrinho está vazio.");
  const items = await getCartItems(cartId);
  if (!items.length) throw new AppError("empty_cart", "Seu carrinho está vazio.");
  return { cart, items };
}

export type QuoteOption = { code: string; name: string; type: string; priceCents: number; etaText: string; requiresAddress: boolean; details: Record<string, unknown> };

/** Lista modalidades disponíveis para o endereço informado (ou só as que não exigem endereço). */
export async function quoteShippingAction(address: unknown | null): Promise<ActionResult<{ options: QuoteOption[]; unavailable: { name: string; reason: string }[] }>> {
  try {
    const { ip } = await requestMeta();
    await enforceRateLimit(`quote:${ip}`, 60, 300);
    const addr = address ? addressSchema.partial({ recipient: true, street: true, number: true, district: true, city: true }).parse(address) : null;
    const { cart, items } = await cartContext();
    const u = await getCurrentUser();
    const { pricing } = await computePricing({ items, couponCode: cart.couponCode, email: u?.email ?? null, userId: u?.id ?? null, shippingQuoteCents: null, shippingIsPaidMethod: false });
    const r = await quoteAll({ address: addr as ShippingAddress | null, subtotalCents: pricing.subtotalCents, totalWeightGrams: null });
    return { ok: true, data: { options: r.options.map((o) => ({ code: o.code, name: o.name, type: o.type, priceCents: o.priceCents, etaText: o.etaText, requiresAddress: o.requiresAddress, details: o.details })), unavailable: r.unavailable } };
  } catch (e) {
    return toActionError(e);
  }
}

/** Prévia de totais com a modalidade escolhida — calculada no servidor. */
export async function previewTotalsAction(shippingCode: string | null, address: unknown | null, email: string | null): Promise<ActionResult<PricingResult>> {
  try {
    const { cart, items } = await cartContext();
    const u = await getCurrentUser();
    let quoteCents: number | null = null;
    if (shippingCode) {
      const addr = address ? addressSchema.partial({ recipient: true, street: true, number: true, district: true, city: true }).safeParse(address) : null;
      const q = await quoteMethod(shippingCode, { address: (addr?.success ? addr.data : null) as ShippingAddress | null, subtotalCents: 0, totalWeightGrams: null });
      if (q.ok) quoteCents = q.quote.priceCents;
    }
    const { pricing } = await computePricing({ items, couponCode: cart.couponCode, email: email || u?.email || null, userId: u?.id ?? null, shippingQuoteCents: quoteCents, shippingIsPaidMethod: (quoteCents ?? 0) > 0 });
    return { ok: true, data: pricing };
  } catch (e) {
    return toActionError(e);
  }
}

/** Grava (ou apaga) o contato do carrinho para lembretes, conforme o consentimento marcado no checkout. */
export async function saveCartContactAction(email: string, consent: boolean): Promise<ActionResult> {
  try {
    const { ip } = await requestMeta();
    await enforceRateLimit(`cart-contact:${ip}`, 30, 600);
    const cartId = await readCartId();
    if (!cartId) return { ok: true };
    await saveCartContact(cartId, email, consent);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function placeOrderAction(input: CheckoutInput): Promise<ActionResult<{ redirect: string }>> {
  try {
    const { ip } = await requestMeta();
    await enforceRateLimit(`checkout:${ip}`, 10, 600, "Muitas tentativas de compra. Aguarde alguns minutos.");
    const cartId = await readCartId();
    if (!cartId) throw new AppError("empty_cart", "Seu carrinho está vazio.");
    const u = await getCurrentUser();
    if (!mp.isConfigured()) throw new AppError("payments_not_configured", "Os pagamentos online ainda não foram configurados pela loja. Tente novamente mais tarde ou fale conosco.", 503);
    const r = await placeOrder(input, { cartId, userId: u?.id ?? null });
    if (r.duplicate || !r.accessToken) {
      return { ok: true, data: { redirect: u ? `/conta/pedidos/${r.orderId}` : `/pedido/${r.orderId}?duplicado=1` } };
    }
    const orderUrl = `/pedido/${r.orderId}?t=${encodeURIComponent(r.accessToken)}`;
    const created = (await db.select({ number: orders.number, email: orders.email, name: orders.customerName, total: orders.totalCents }).from(orders).where(eq(orders.id, r.orderId)))[0];
    await sendEmail(created.email, `Pedido ${formatOrderNumber(created.number)} recebido — ToyVille`,
      `Olá, ${created.name}!\n\nRecebemos seu pedido ${formatOrderNumber(created.number)} (${formatBRL(created.total)}). Ele será confirmado após a aprovação do pagamento.\n\nAcompanhe aqui: ${env.appUrl}${orderUrl}\n\nToyVille`).catch(() => {});
    try {
      const init = await startPayment(r.orderId, r.accessToken);
      return { ok: true, data: { redirect: init } };
    } catch {
      // Pedido criado e estoque reservado; o cliente pode tentar pagar de novo pela página do pedido.
      return { ok: true, data: { redirect: `${orderUrl}&erro_pagamento=1` } };
    }
  } catch (e) {
    return toActionError(e);
  }
}

export async function payOrderAction(orderId: string, token: string): Promise<ActionResult<{ redirect: string }>> {
  try {
    const { ip } = await requestMeta();
    await enforceRateLimit(`pay:${ip}`, 20, 600);
    const o = (await db.select({ hash: orders.accessTokenHash }).from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    if (!o || o.hash !== sha256(token)) throw new AppError("forbidden", "Pedido não encontrado.", 404);
    return { ok: true, data: { redirect: await startPayment(orderId, token) } };
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * Chamado na página de retorno: usa o payment_id da URL APENAS como pista e confirma
 * na API do Mercado Pago (o status da URL nunca é considerado).
 */
export async function verifyReturnedPayment(orderId: string, paymentId: string) {
  if (!/^\d{1,20}$/.test(paymentId) || !mp.isConfigured()) return;
  const { ip } = await requestMeta();
  const rl = await (await import("@/server/rate-limit")).rateLimit(`verify:${ip}`, 20, 300);
  if (!rl.allowed) return;
  try {
    const p = await mp.getPayment(paymentId);
    if (p.external_reference === orderId) await applyProviderPayment(p, "return");
  } catch { /* webhook/reconciliação cobrem */ }
}

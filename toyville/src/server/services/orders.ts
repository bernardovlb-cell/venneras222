import "server-only";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx, type Tx } from "../db/client";
import { carts, couponRedemptions, coupons, orderEvents, orderItems, orders, payments, products } from "../db/schema";
import { AppError, isUniqueViolation } from "../errors";
import { randomToken, sha256 } from "../auth/password";
import { computePricing, getCartItems } from "./cart";
import { lockVariants, moveStock } from "./inventory";
import { quoteMethod, type ShippingAddress } from "../shipping";
import * as mp from "../payments/mercadopago";
import { loadSettings } from "../settings";
import { mapMercadoPagoStatus, type InternalPaymentStatus } from "@/lib/payment-status";
import { COUPON_ERROR_MESSAGES } from "@/lib/pricing";
import { sendEmail } from "../email";
import { formatBRL } from "@/lib/money";
import { env } from "../env";
import { log } from "../log";

export const formatOrderNumber = (n: number) => `TV${String(n).padStart(6, "0")}`;

const cpfRe = /^\d{11}$/;
export function isValidCpf(raw: string): boolean {
  const c = raw.replace(/\D/g, "");
  if (!cpfRe.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(c[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

export const addressSchema = z.object({
  recipient: z.string().trim().min(3, "Informe o nome de quem recebe").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  zip: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().regex(/^\d{8}$/, "CEP inválido")),
  street: z.string().trim().min(2, "Informe a rua").max(160),
  number: z.string().trim().min(1, "Informe o número").max(20),
  complement: z.string().trim().max(80).optional().or(z.literal("")),
  district: z.string().trim().min(2, "Informe o bairro").max(100),
  city: z.string().trim().min(2, "Informe a cidade").max(100),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "UF inválida"),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  phone: z.string().trim().transform((s) => s.replace(/\D/g, "")).pipe(z.string().regex(/^\d{10,11}$/, "Telefone com DDD inválido")),
  cpf: z.string().trim().transform((s) => s.replace(/\D/g, "")).refine((s) => s === "" || isValidCpf(s), "CPF inválido").optional(),
  shippingCode: z.string().min(1, "Escolha como receber o pedido").max(60),
  address: addressSchema.nullable(),
  acceptTerms: z.literal(true, { error: "É preciso aceitar os termos para continuar" }),
  marketingConsent: z.boolean().default(false),
  notes: z.string().trim().max(500).optional(),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

async function addEvent(tx: DbOrTx, orderId: string, type: string, message: string, opts: { data?: Record<string, unknown>; userId?: string | null; visible?: boolean } = {}) {
  await tx.insert(orderEvents).values({ orderId, type, message, data: opts.data, userId: opts.userId ?? null, visibleToCustomer: opts.visible ?? false });
}

/* =====================================================================================
 * CRIAÇÃO DO PEDIDO
 * ===================================================================================== */
export async function placeOrder(rawInput: CheckoutInput, ctx: { cartId: string; userId: string | null }) {
  const input = checkoutSchema.parse(rawInput);
  const settings = await loadSettings();
  if (settings.checkout.requireCpf && !input.cpf) throw new AppError("cpf_required", "Informe o CPF.", 400, "cpf");

  // Reenvio do mesmo formulário (duplo clique, rede instável) → devolve o pedido já criado.
  const dup = (await db.select({ id: orders.id }).from(orders).where(eq(orders.idempotencyKey, input.idempotencyKey)).limit(1))[0];
  if (dup) return { orderId: dup.id, accessToken: null as string | null, duplicate: true };

  const cart = (await db.select().from(carts).where(eq(carts.id, ctx.cartId)).limit(1))[0];
  if (!cart || cart.convertedOrderId) throw new AppError("empty_cart", "Seu carrinho está vazio.");
  const items = await getCartItems(cart.id);
  if (!items.length) throw new AppError("empty_cart", "Seu carrinho está vazio.");

  const accessToken = randomToken(24);
  const reservationHours = settings.checkout.reservationHours;

  let orderId: string;
  try {
    orderId = await db.transaction(async (tx) => {
      // 1) Bloqueia as variações ANTES de precificar: preço e estoque lidos sob o mesmo lock.
      const locked = await lockVariants(tx, items.map((i) => i.variantId));
      const lockedBy = new Map(locked.map((v) => [v.id, v]));
      const prodRows = await tx.select({ id: products.id, status: products.status, name: products.name, weight: products.weightGrams })
        .from(products).where(inArray(products.id, locked.map((v) => v.productId)));
      const prodBy = new Map(prodRows.map((p) => [p.id, p]));
      const problems: string[] = [];
      let weight: number | null = 0;
      for (const it of items) {
        const v = lockedBy.get(it.variantId);
        const p = v ? prodBy.get(v.productId) : undefined;
        if (!v || !p || !v.isActive || p.status !== "active") { problems.push("Um item do carrinho não está mais disponível."); continue; }
        const available = v.stockOnHand - v.stockReserved;
        if (available < it.quantity) problems.push(available > 0 ? `"${p.name}" (${v.name}): só restam ${available} unidade(s).` : `"${p.name}" (${v.name}) esgotou.`);
        const w = v.weightGrams ?? p.weight;
        weight = w == null || weight == null ? null : weight + w * it.quantity;
      }
      if (problems.length) throw new AppError("stock", `Atualize seu carrinho: ${problems.join(" ")}`);

      // 2) Frete (só modalidades configuradas)
      const preliminary = await computePricing({ items, couponCode: cart.couponCode, email: input.email, userId: ctx.userId, shippingQuoteCents: 0, shippingIsPaidMethod: false, tx });
      const quote = await quoteMethod(input.shippingCode, { address: input.address as ShippingAddress | null, subtotalCents: preliminary.pricing.subtotalCents, totalWeightGrams: weight }, tx);
      if (!quote.ok) throw new AppError("shipping_unavailable", `Entrega indisponível: ${quote.reason}.`, 400, "shippingCode");
      if (quote.quote.requiresAddress && !input.address) throw new AppError("address_required", "Informe o endereço de entrega.", 400, "address");

      // 3) Cupom bloqueado durante a contagem de usos (impede ultrapassar limite em compras simultâneas)
      if (cart.couponCode) {
        await tx.execute(sql`select id from coupons where upper(code) = upper(${cart.couponCode}) for update`);
      }
      const { pricing, views } = await computePricing({
        items, couponCode: cart.couponCode, email: input.email, userId: ctx.userId,
        shippingQuoteCents: quote.quote.priceCents, shippingIsPaidMethod: quote.quote.priceCents > 0, tx,
      });
      if (cart.couponCode && pricing.couponError) {
        throw new AppError("coupon", `Cupom ${cart.couponCode}: ${COUPON_ERROR_MESSAGES[pricing.couponError]} Remova-o no carrinho para continuar.`);
      }
      if (pricing.totalCents <= 0) throw new AppError("zero_total", "Não é possível finalizar um pedido com valor zero.");

      // 4) Pedido com snapshot dos valores efetivamente cobrados
      const [o] = await tx.insert(orders).values({
        accessTokenHash: sha256(accessToken),
        idempotencyKey: input.idempotencyKey,
        userId: ctx.userId,
        email: input.email,
        customerName: input.name,
        customerPhone: input.phone,
        customerDocument: input.cpf || null,
        subtotalCents: pricing.subtotalCents,
        listSubtotalCents: pricing.listSubtotalCents,
        discountCents: pricing.couponDiscountCents,
        shippingCents: pricing.shippingCents,
        totalCents: pricing.totalCents,
        couponCode: pricing.couponCode,
        pricingSnapshot: { freeShipping: pricing.freeShipping, itemSavingsCents: pricing.itemSavingsCents, computedAt: new Date().toISOString() },
        shippingMethodCode: quote.quote.code,
        shippingMethodName: quote.quote.name,
        shippingType: quote.quote.type,
        shippingAddress: quote.quote.requiresAddress && input.address ? (input.address as Record<string, string>) : null,
        shippingDetails: { ...quote.quote.details, etaText: quote.quote.etaText, quotedCents: quote.quote.priceCents },
        reservationExpiresAt: new Date(Date.now() + reservationHours * 3600 * 1000),
        marketingConsent: input.marketingConsent,
        notes: input.notes || null,
        fiscalStatus: settings.fiscal.autoIssue ? "pending" : "disabled",
      }).returning({ id: orders.id, number: orders.number });

      const viewBy = new Map(views.map((v) => [v.variantId, v]));
      await tx.insert(orderItems).values(pricing.lines.map((l) => {
        const v = viewBy.get(l.variantId)!;
        return {
          orderId: o.id, variantId: l.variantId, productId: v.productId, sku: v.sku, productName: v.productName,
          variantName: v.variantName === "Padrão" ? null : v.variantName, imageUrl: v.imageUrl, quantity: l.quantity,
          listUnitCents: l.listUnitCents, unitCents: l.unitCents, couponDiscountCents: l.couponDiscountCents, totalCents: l.lineTotalCents,
          promotionLabel: l.promotionLabel,
        };
      }));

      for (const l of pricing.lines) {
        await moveStock(tx, { variantId: l.variantId, deltaReserved: l.quantity, reason: "order_reserved", orderId: o.id });
      }

      if (pricing.couponCode) {
        const c = (await tx.select({ id: coupons.id }).from(coupons).where(sql`upper(${coupons.code}) = upper(${pricing.couponCode})`).limit(1))[0];
        if (c) await tx.insert(couponRedemptions).values({ couponId: c.id, orderId: o.id, email: input.email, userId: ctx.userId, discountCents: pricing.couponDiscountCents });
      }
      await tx.update(carts).set({
        convertedOrderId: o.id, updatedAt: new Date(),
        email: input.marketingConsent ? input.email : cart.email, recoveryConsent: input.marketingConsent || cart.recoveryConsent,
      }).where(eq(carts.id, cart.id));
      await addEvent(tx, o.id, "created", `Pedido ${formatOrderNumber(o.number)} criado. Aguardando pagamento.`, { visible: true, userId: ctx.userId });
      return o.id;
    });
  } catch (e) {
    if (isUniqueViolation(e, "orders_idem_uq")) {
      const d = (await db.select({ id: orders.id }).from(orders).where(eq(orders.idempotencyKey, input.idempotencyKey)).limit(1))[0];
      if (d) return { orderId: d.id, accessToken: null, duplicate: true };
    }
    throw e;
  }
  return { orderId, accessToken, duplicate: false };
}

/* =====================================================================================
 * INÍCIO DO PAGAMENTO (Checkout Pro)
 * ===================================================================================== */
export async function startPayment(orderId: string, accessToken: string): Promise<string> {
  const o = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!o) throw new AppError("not_found", "Pedido não encontrado.", 404);
  if (o.status !== "pending_payment") throw new AppError("not_payable", "Este pedido não está aguardando pagamento.");
  if (!o.reservationExpiresAt || o.reservationExpiresAt <= new Date()) throw new AppError("expired", "O prazo para pagamento deste pedido expirou.");
  if (!mp.isConfigured()) throw new AppError("payments_not_configured", "Os pagamentos online ainda não foram configurados pela loja.", 503);

  const existing = (await db.select().from(payments).where(and(eq(payments.orderId, o.id), sql`${payments.preferenceId} is not null`)).orderBy(desc(payments.createdAt)).limit(1))[0];
  const existingInit = (existing?.raw as { init_point?: string } | null)?.init_point;
  if (existingInit) return existingInit;

  const settings = await loadSettings();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id)).orderBy(asc(orderItems.productName));
  const pref = await mp.createPreference({
    orderId: o.id, orderNumber: o.number, accessToken,
    lines: items.map((i) => ({ sku: i.sku, title: i.variantName ? `${i.productName} - ${i.variantName}` : i.productName, quantity: i.quantity, totalCents: i.totalCents, pictureUrl: i.imageUrl && i.imageUrl.startsWith("/") ? `${env.appUrl}${i.imageUrl}` : i.imageUrl })),
    shippingCents: o.shippingCents,
    payer: { name: o.customerName, email: o.email, phone: o.customerPhone, cpf: o.customerDocument },
    expiresAt: o.reservationExpiresAt,
    maxInstallments: settings.checkout.maxInstallments,
  });
  await db.insert(payments).values({ orderId: o.id, preferenceId: pref.id, status: "pending", amountCents: o.totalCents, raw: { init_point: pref.initPoint } });
  await addEvent(db, o.id, "payment_started", "Cliente direcionado ao Mercado Pago.", { data: { preferenceId: pref.id } });
  return pref.initPoint;
}

/* =====================================================================================
 * MÁQUINA DE ESTADOS DO PAGAMENTO (webhook, retorno e reconciliação usam esta função)
 * ===================================================================================== */
export type PaymentSyncOutcome = "ignored_unknown_order" | "ignored_foreign" | "updated" | "paid" | "duplicate_payment" | "amount_mismatch" | "paid_after_cancel" | "refunded" | "noop";

async function commitStock(tx: Tx, orderId: string) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const ids = items.filter((i) => i.variantId).map((i) => i.variantId!);
  await lockVariants(tx, ids);
  for (const i of items) if (i.variantId) await moveStock(tx, { variantId: i.variantId, deltaOnHand: -i.quantity, deltaReserved: -i.quantity, reason: "order_committed", orderId });
}

async function releaseStock(tx: Tx, orderId: string) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  await lockVariants(tx, items.filter((i) => i.variantId).map((i) => i.variantId!));
  for (const i of items) if (i.variantId) await moveStock(tx, { variantId: i.variantId, deltaReserved: -i.quantity, reason: "order_released", orderId });
}

/** Tenta reservar e baixar o estoque de um pedido já cancelado que acabou sendo pago. */
async function tryRecommitStock(tx: Tx, orderId: string): Promise<boolean> {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const locked = await lockVariants(tx, items.filter((i) => i.variantId).map((i) => i.variantId!));
  const by = new Map(locked.map((v) => [v.id, v]));
  if (items.some((i) => !i.variantId || !by.get(i.variantId) || by.get(i.variantId)!.stockOnHand - by.get(i.variantId)!.stockReserved < i.quantity)) return false;
  for (const i of items) await moveStock(tx, { variantId: i.variantId!, deltaOnHand: -i.quantity, reason: "order_committed", orderId, note: "pago após cancelamento" });
  return true;
}

export async function applyProviderPayment(p: mp.MpPayment, source: "webhook" | "return" | "reconcile" | "admin"): Promise<PaymentSyncOutcome> {
  const orderId = p.external_reference ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return "ignored_foreign";
  const amountCents = Math.round(Number(p.transaction_amount) * 100);
  const refundedCents = Math.round(Number(p.transaction_amount_refunded ?? 0) * 100);
  const mapped = mapMercadoPagoStatus(p.status, amountCents, refundedCents);
  const providerId = String(p.id);
  let emailToSend: { to: string; subject: string; text: string } | null = null;

  const outcome = await db.transaction(async (tx): Promise<PaymentSyncOutcome> => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o) return "ignored_unknown_order";

    const prev = (await tx.select().from(payments).where(and(eq(payments.provider, "mercadopago"), eq(payments.providerPaymentId, providerId))).limit(1))[0];
    const values = {
      status: mapped, statusDetail: p.status_detail ?? null, methodType: p.payment_type_id ?? null, methodId: p.payment_method_id ?? null,
      amountCents, refundedCents, installments: p.installments ?? null, raw: p as unknown as Record<string, unknown>,
      approvedAt: p.date_approved ? new Date(p.date_approved) : null, updatedAt: new Date(),
    };
    if (prev) await tx.update(payments).set(values).where(eq(payments.id, prev.id));
    else await tx.insert(payments).values({ orderId: o.id, provider: "mercadopago", providerPaymentId: providerId, ...values });

    if (prev && prev.status === mapped && prev.refundedCents === refundedCents) return "noop"; // notificação repetida

    const ev = (type: string, msg: string, visible = false) => addEvent(tx, o.id, type, msg, { data: { paymentId: providerId, status: p.status, statusDetail: p.status_detail, source }, visible });
    const num = formatOrderNumber(o.number);

    if (mapped === "approved") {
      if (p.currency_id && p.currency_id !== "BRL") {
        await tx.update(orders).set({ attentionReason: `Pagamento ${providerId} em moeda ${p.currency_id}`, status: "needs_attention", updatedAt: new Date() }).where(eq(orders.id, o.id));
        await ev("payment_mismatch", "Pagamento aprovado em moeda diferente. Verificar e reembolsar se necessário.");
        return "amount_mismatch";
      }
      if (amountCents !== o.totalCents) {
        await tx.update(orders).set({ attentionReason: `Valor pago (${formatBRL(amountCents)}) difere do total (${formatBRL(o.totalCents)})`, status: o.status === "pending_payment" ? "needs_attention" : o.status, updatedAt: new Date() }).where(eq(orders.id, o.id));
        await ev("payment_mismatch", `Pagamento ${providerId} aprovado com valor divergente. Pedido NÃO marcado como pago.`);
        return "amount_mismatch";
      }
      if (o.status === "paid" || o.status === "completed") {
        const otherApproved = await tx.select({ id: payments.id }).from(payments)
          .where(and(eq(payments.orderId, o.id), eq(payments.status, "approved"), sql`${payments.providerPaymentId} <> ${providerId}`)).limit(1);
        if (otherApproved.length) {
          await tx.update(orders).set({ attentionReason: `Pagamento duplicado (${providerId}). Reembolsar o excedente.`, updatedAt: new Date() }).where(eq(orders.id, o.id));
          await ev("payment_duplicate", `Segundo pagamento aprovado (${providerId}). Requer reembolso.`);
          return "duplicate_payment";
        }
        return "noop";
      }
      if (o.status === "cancelled" || o.stockReleased) {
        const ok = await tryRecommitStock(tx, o.id);
        await tx.update(orders).set({
          status: ok ? "paid" : "needs_attention", paymentStatus: "approved", paidAt: new Date(), stockCommitted: ok, stockReleased: !ok, cancelledAt: ok ? null : o.cancelledAt,
          fulfillmentStatus: ok ? "unfulfilled" : o.fulfillmentStatus,
          attentionReason: ok ? "Pago após o cancelamento — estoque recomposto, conferir." : "Pago após o cancelamento e sem estoque. Reembolsar o cliente.", updatedAt: new Date(),
        }).where(eq(orders.id, o.id));
        await ev("paid_after_cancel", ok ? "Pagamento aprovado após cancelamento; pedido reativado." : "Pagamento aprovado após cancelamento, sem estoque disponível.");
        return "paid_after_cancel";
      }
      // pending_payment / needs_attention → pago
      await commitStock(tx, o.id);
      await tx.update(orders).set({ status: "paid", paymentStatus: "approved", paidAt: new Date(), stockCommitted: true, attentionReason: null, updatedAt: new Date() }).where(eq(orders.id, o.id));
      await ev("paid", "Pagamento aprovado pelo Mercado Pago.", true);
      emailToSend = { to: o.email, subject: `Pagamento confirmado — pedido ${num}`, text: `Olá, ${o.customerName}!\n\nRecebemos a confirmação do pagamento do pedido ${num} (${formatBRL(o.totalCents)}).\nAcompanhe pelo link enviado no momento da compra ou pela sua conta.\n\nToyVille` };
      return "paid";
    }

    if (mapped === "refunded" || mapped === "partially_refunded" || mapped === "charged_back") {
      if (o.status === "pending_payment") {
        await ev("payment_update", `Pagamento ${providerId}: ${p.status}.`);
        return "updated";
      }
      const full = mapped === "refunded" || mapped === "charged_back";
      const patch: Partial<typeof orders.$inferInsert> = { paymentStatus: mapped, updatedAt: new Date() };
      if (mapped === "charged_back") patch.attentionReason = `Contestação (chargeback) no pagamento ${providerId}.`;
      if (full && mapped === "refunded") {
        patch.status = "cancelled";
        patch.cancelledAt = new Date();
        // Mercadoria não saiu: volta ao estoque. Se já foi enviada, a reposição é feita ao receber a devolução.
        if (o.stockCommitted && (o.fulfillmentStatus === "unfulfilled" || o.fulfillmentStatus === "picking" || o.fulfillmentStatus === "ready_for_pickup")) {
          const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, o.id));
          await lockVariants(tx, items.filter((i) => i.variantId).map((i) => i.variantId!));
          for (const i of items) if (i.variantId) await moveStock(tx, { variantId: i.variantId, deltaOnHand: i.quantity, reason: "return_restock", orderId: o.id, note: "reembolso antes do envio" });
          patch.fulfillmentStatus = "cancelled";
        }
        await tx.update(couponRedemptions).set({ voided: true }).where(eq(couponRedemptions.orderId, o.id));
      }
      await tx.update(orders).set(patch).where(eq(orders.id, o.id));
      await ev("refund", mapped === "partially_refunded" ? `Reembolso parcial: ${formatBRL(refundedCents)}.` : mapped === "charged_back" ? "Pagamento contestado pelo titular do cartão." : "Pagamento reembolsado.", mapped !== "charged_back");
      return "refunded";
    }

    // pending / in_process / rejected / cancelled: registra, sem mexer em estoque.
    // O cancelamento do pedido acontece pela expiração da reserva (com nova consulta ao Mercado Pago),
    // porque o comprador pode gerar um Pix e depois pagar com cartão na mesma preferência.
    if (o.status === "pending_payment") {
      await tx.update(orders).set({ paymentStatus: mapped, updatedAt: new Date() }).where(eq(orders.id, o.id));
      const msg: Partial<Record<InternalPaymentStatus, string>> = {
        pending: "Pagamento iniciado; aguardando compensação (Pix/boleto).",
        in_process: "Pagamento em análise pelo Mercado Pago.",
        rejected: "Pagamento recusado. O cliente pode tentar novamente enquanto a reserva estiver válida.",
        cancelled: "Uma tentativa de pagamento foi cancelada/expirou.",
      };
      await ev("payment_update", msg[mapped] ?? `Status: ${p.status}`, mapped !== "cancelled");
    }
    return "updated";
  });

  if (emailToSend) {
    const e: { to: string; subject: string; text: string } = emailToSend;
    await sendEmail(e.to, e.subject, e.text).catch(() => {});
  }
  log("info", "pagamento sincronizado", { orderId, providerId, status: p.status, outcome, source });
  return outcome;
}

export async function syncPaymentById(paymentId: string, source: "webhook" | "return" | "reconcile" | "admin") {
  const p = await mp.getPayment(paymentId);
  return applyProviderPayment(p, source);
}

/** Consulta o Mercado Pago por todos os pagamentos de um pedido (usado na expiração e no painel). */
export async function reconcileOrder(orderId: string) {
  if (!mp.isConfigured()) return [];
  const list = await mp.searchPaymentsByOrder(orderId);
  const out: PaymentSyncOutcome[] = [];
  for (const p of list.slice().reverse()) out.push(await applyProviderPayment(p, "reconcile"));
  return out;
}

/* =====================================================================================
 * CANCELAMENTO E EXPIRAÇÃO
 * ===================================================================================== */
export async function cancelUnpaidOrder(orderId: string, reason: string, userId: string | null, opts: { skipReconcile?: boolean } = {}) {
  if (!opts.skipReconcile) await reconcileOrder(orderId); // evita cancelar algo que acabou de ser pago
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o) throw new AppError("not_found", "Pedido não encontrado.", 404);
    if (o.status !== "pending_payment" && o.status !== "needs_attention") throw new AppError("not_cancellable", "Somente pedidos não pagos podem ser cancelados aqui. Para pedidos pagos, faça o reembolso.");
    if (o.paymentStatus === "approved") throw new AppError("paid", "Há pagamento aprovado: use o reembolso.");
    if (!o.stockCommitted && !o.stockReleased) await releaseStock(tx, o.id);
    await tx.update(couponRedemptions).set({ voided: true }).where(eq(couponRedemptions.orderId, o.id));
    await tx.update(orders).set({
      status: "cancelled", fulfillmentStatus: "cancelled", stockReleased: true, cancelledAt: new Date(),
      paymentStatus: o.paymentStatus === "pending" || o.paymentStatus === "in_process" ? "expired" : o.paymentStatus, updatedAt: new Date(),
    }).where(eq(orders.id, o.id));
    await addEvent(tx, o.id, "cancelled", `Pedido cancelado: ${reason}`, { userId, visible: true });
    return true;
  });
}

export async function expireStaleOrders(now = new Date()) {
  const stale = await db.select({ id: orders.id }).from(orders)
    .where(and(eq(orders.status, "pending_payment"), lt(orders.reservationExpiresAt, now))).limit(100);
  const result = { checked: stale.length, cancelled: 0, paid: 0, kept: 0, errors: 0 };
  for (const s of stale) {
    try {
      await reconcileOrder(s.id);
      const [o] = await db.select({ status: orders.status, paymentStatus: orders.paymentStatus }).from(orders).where(eq(orders.id, s.id));
      if (o.status !== "pending_payment") { result.paid++; continue; }
      if (o.paymentStatus === "in_process") { result.kept++; continue; } // análise em andamento: não cancelar
      await cancelUnpaidOrder(s.id, "prazo de pagamento expirado", null, { skipReconcile: true });
      result.cancelled++;
    } catch (e) {
      result.errors++;
      log("error", "falha ao expirar pedido", { orderId: s.id, error: String(e) });
    }
  }
  return result;
}

/* =====================================================================================
 * SEPARAÇÃO / ENTREGA
 * ===================================================================================== */
type Fulfillment = (typeof orders.$inferSelect)["fulfillmentStatus"];
const FLOW: Record<Fulfillment, Fulfillment[]> = {
  unfulfilled: ["picking", "ready_for_pickup", "shipped"],
  picking: ["ready_for_pickup", "shipped", "unfulfilled"],
  ready_for_pickup: ["delivered", "picking"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
};

export async function updateFulfillment(orderId: string, next: Fulfillment, userId: string, extra: { trackingCode?: string; trackingUrl?: string; note?: string } = {}) {
  let emailToSend: { to: string; subject: string; text: string } | null = null;
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o) throw new AppError("not_found", "Pedido não encontrado.", 404);
    if (o.status !== "paid" && o.status !== "completed") throw new AppError("not_paid", "Só é possível separar/enviar pedidos com pagamento aprovado.");
    if (!FLOW[o.fulfillmentStatus].includes(next)) throw new AppError("invalid_transition", "Mudança de etapa não permitida.");
    if (next === "ready_for_pickup" && o.shippingType !== "pickup") throw new AppError("invalid_transition", "Este pedido não é de retirada.");
    if (next === "shipped" && o.shippingType === "pickup") throw new AppError("invalid_transition", "Pedido de retirada não é enviado.");
    if (next === "shipped" && o.shippingType !== "local_delivery" && !extra.trackingCode) throw new AppError("tracking_required", "Informe o código de rastreamento.", 400, "trackingCode");
    if (extra.trackingUrl && !/^https:\/\//.test(extra.trackingUrl)) throw new AppError("tracking_url", "URL de rastreamento deve começar com https://", 400, "trackingUrl");
    const patch: Partial<typeof orders.$inferInsert> = { fulfillmentStatus: next, updatedAt: new Date() };
    if (extra.trackingCode) patch.trackingCode = extra.trackingCode.trim().slice(0, 60);
    if (extra.trackingUrl) patch.trackingUrl = extra.trackingUrl.trim().slice(0, 300);
    if (next === "delivered") patch.status = "completed";
    if (next === "returned") {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      await lockVariants(tx, items.filter((i) => i.variantId).map((i) => i.variantId!));
      for (const i of items) if (i.variantId) await moveStock(tx, { variantId: i.variantId, deltaOnHand: i.quantity, reason: "return_restock", orderId: o.id, userId, note: "devolução recebida" });
    }
    await tx.update(orders).set(patch).where(eq(orders.id, o.id));
    const labels: Record<Fulfillment, string> = {
      unfulfilled: "Pedido voltou para aguardando separação.", picking: "Pedido em separação.", ready_for_pickup: "Pedido pronto para retirada.",
      shipped: `Pedido enviado${patch.trackingCode ? ` (rastreamento: ${patch.trackingCode})` : ""}.`, delivered: "Pedido entregue.", returned: "Devolução recebida.", cancelled: "Cancelado.",
    };
    await addEvent(tx, o.id, `fulfillment_${next}`, labels[next] + (extra.note ? ` ${extra.note}` : ""), { userId, visible: true });
    if (next === "ready_for_pickup" || next === "shipped") {
      emailToSend = { to: o.email, subject: `Pedido ${formatOrderNumber(o.number)}: ${next === "shipped" ? "enviado" : "pronto para retirada"}`, text: `Olá, ${o.customerName}!\n\n${labels[next]}\n\nToyVille` };
    }
  });
  if (emailToSend) {
    const e: { to: string; subject: string; text: string } = emailToSend;
    await sendEmail(e.to, e.subject, e.text).catch(() => {});
  }
}

export async function requestRefund(orderId: string, amountCents: number | null, userId: string, reason: string) {
  const o = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!o) throw new AppError("not_found", "Pedido não encontrado.", 404);
  const pay = (await db.select().from(payments).where(and(eq(payments.orderId, o.id), inArray(payments.status, ["approved", "partially_refunded"]))).orderBy(desc(payments.updatedAt)).limit(1))[0];
  if (!pay?.providerPaymentId) throw new AppError("no_payment", "Não há pagamento aprovado para reembolsar.");
  const remaining = pay.amountCents - pay.refundedCents;
  if (amountCents != null && (amountCents <= 0 || amountCents > remaining)) throw new AppError("invalid_amount", `Valor deve estar entre R$ 0,01 e ${formatBRL(remaining)}.`, 400, "amount");
  // chave determinística: um duplo clique não gera dois reembolsos
  const key = `refund-${pay.providerPaymentId}-${pay.refundedCents}-${amountCents ?? "full"}`;
  await mp.refundPayment(pay.providerPaymentId, amountCents, key);
  await addEvent(db, o.id, "refund_requested", `Reembolso solicitado (${amountCents == null ? "total" : formatBRL(amountCents)}): ${reason}`, { userId });
  // Confirma pelo provedor (não presume sucesso)
  return syncPaymentById(pay.providerPaymentId, "admin");
}

/* =====================================================================================
 * LEITURA COM CONTROLE DE ACESSO
 * ===================================================================================== */
export async function getOrderForViewer(orderId: string, opts: { token?: string | null; userId?: string | null; isStaff?: boolean }) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const o = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!o) return null;
  const allowed = opts.isStaff || (opts.userId && o.userId === opts.userId) || (opts.token && sha256(opts.token) === o.accessTokenHash);
  if (!allowed) return null;
  const [items, events, pays] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    db.select().from(orderEvents).where(opts.isStaff ? eq(orderEvents.orderId, o.id) : and(eq(orderEvents.orderId, o.id), eq(orderEvents.visibleToCustomer, true))).orderBy(asc(orderEvents.createdAt)),
    db.select({ id: payments.id, status: payments.status, methodType: payments.methodType, amountCents: payments.amountCents, refundedCents: payments.refundedCents, installments: payments.installments, providerPaymentId: payments.providerPaymentId, statusDetail: payments.statusDetail, createdAt: payments.createdAt, approvedAt: payments.approvedAt, raw: payments.raw })
      .from(payments).where(eq(payments.orderId, o.id)).orderBy(desc(payments.createdAt)),
  ]);
  return { order: o, items, events, payments: pays };
}

// Não vinculamos pedidos de visitante a contas pelo e-mail: sem verificação de e-mail, alguém poderia
// criar uma conta com o e-mail de outra pessoa e ver os pedidos dela. O visitante acompanha pelo link com token.

export async function userHasPurchased(userId: string, productId: string) {
  const r = await db.select({ id: orders.id }).from(orders).innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.userId, userId), eq(orderItems.productId, productId), inArray(orders.status, ["paid", "completed"]))).limit(1);
  return r[0]?.id ?? null;
}


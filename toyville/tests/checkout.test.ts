import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { placeOrder, startPayment, applyProviderPayment, expireStaleOrders, cancelUnpaidOrder, updateFulfillment, requestRefund, getOrderForViewer } from "@/server/services/orders";
import { resetDb, makeProduct, makeCart, configurePickup, configureLocalDelivery, checkoutInput, mockMercadoPago, address } from "./helpers";

const variant = async (id: string) => (await db.select().from(s.productVariants).where(eq(s.productVariants.id, id)))[0];
const order = async (id: string) => (await db.select().from(s.orders).where(eq(s.orders.id, id)))[0];

let mp: ReturnType<typeof mockMercadoPago>;
beforeEach(async () => { await resetDb(); mp = mockMercadoPago(); });
afterEach(() => mp.restore());

describe("criação de pedido (compra como visitante)", () => {
  it("cria pedido com snapshot de preços, reserva estoque e converte o carrinho", async () => {
    await configurePickup();
    const { variantId } = await makeProduct({ stock: 5, price: 10000, sale: 8000 });
    const cartId = await makeCart([{ variantId, quantity: 2 }]);
    const r = await placeOrder(checkoutInput(), { cartId, userId: null });
    const o = await order(r.orderId);
    expect(o.totalCents).toBe(16000);
    expect(o.listSubtotalCents).toBe(20000);
    expect(o.status).toBe("pending_payment");
    expect(o.shippingType).toBe("pickup");
    const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, o.id));
    expect(items[0]).toMatchObject({ unitCents: 8000, listUnitCents: 10000, quantity: 2, totalCents: 16000 });
    const v = await variant(variantId);
    expect(v.stockReserved).toBe(2);
    expect(v.stockOnHand).toBe(5);
    const cart = (await db.select().from(s.carts).where(eq(s.carts.id, cartId)))[0];
    expect(cart.convertedOrderId).toBe(o.id);

    // preço do produto muda depois: o pedido mantém o valor cobrado
    await db.update(s.productVariants).set({ priceCents: 99900, salePriceCents: null }).where(eq(s.productVariants.id, variantId));
    expect((await order(o.id)).totalCents).toBe(16000);
  });

  it("mesmo formulário enviado duas vezes não duplica o pedido", async () => {
    await configurePickup();
    const { variantId } = await makeProduct();
    const cartId = await makeCart([{ variantId, quantity: 1 }]);
    const input = checkoutInput();
    const a = await placeOrder(input, { cartId, userId: null });
    const b = await placeOrder(input, { cartId, userId: null });
    expect(b.orderId).toBe(a.orderId);
    expect(b.duplicate).toBe(true);
    expect((await db.select().from(s.orders)).length).toBe(1);
  });

  it("recusa estoque insuficiente sem reservar nada", async () => {
    await configurePickup();
    const { variantId } = await makeProduct({ stock: 1 });
    const cartId = await makeCart([{ variantId, quantity: 3 }]);
    await expect(placeOrder(checkoutInput(), { cartId, userId: null })).rejects.toThrow(/só restam 1/);
    expect((await variant(variantId)).stockReserved).toBe(0);
  });

  it("concorrência: duas compras simultâneas da última unidade → só uma passa", async () => {
    await configurePickup();
    const { variantId } = await makeProduct({ stock: 1 });
    const c1 = await makeCart([{ variantId, quantity: 1 }]);
    const c2 = await makeCart([{ variantId, quantity: 1 }]);
    const results = await Promise.allSettled([
      placeOrder(checkoutInput({ email: "a@x.com" }), { cartId: c1, userId: null }),
      placeOrder(checkoutInput({ email: "b@x.com" }), { cartId: c2, userId: null }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const v = await variant(variantId);
    expect(v.stockReserved).toBe(1);
  });

  it("não permite modalidade de entrega não configurada", async () => {
    const { variantId } = await makeProduct();
    const cartId = await makeCart([{ variantId, quantity: 1 }]);
    await expect(placeOrder(checkoutInput(), { cartId, userId: null })).rejects.toThrow(/Entrega indisponível/);
  });

  it("entrega local só para CEPs configurados e cobra o valor configurado", async () => {
    await configureLocalDelivery(1500);
    const { variantId } = await makeProduct({ price: 5000 });
    const cartId = await makeCart([{ variantId, quantity: 1 }]);
    await expect(placeOrder(checkoutInput({ shippingCode: "entrega-local", address: { ...address, zip: "80000-000" } }), { cartId, userId: null })).rejects.toThrow(/fora da área/);
    const r = await placeOrder(checkoutInput({ shippingCode: "entrega-local", address }), { cartId, userId: null });
    const o = await order(r.orderId);
    expect(o.shippingCents).toBe(1500);
    expect(o.totalCents).toBe(6500);
    expect(o.shippingAddress?.zip).toBe("01310100");
  });

  it("frete grátis por promoção zera o frete pago", async () => {
    await configureLocalDelivery(1500);
    await db.insert(s.promotions).values({ name: "Frete grátis 100", kind: "free_shipping", minSubtotalCents: 10000 });
    const { variantId } = await makeProduct({ price: 12000 });
    const cartId = await makeCart([{ variantId, quantity: 1 }]);
    const r = await placeOrder(checkoutInput({ shippingCode: "entrega-local", address }), { cartId, userId: null });
    expect((await order(r.orderId)).shippingCents).toBe(0);
  });

  it("cupom: aplica desconto, registra uso e respeita limite total em compras simultâneas", async () => {
    await configurePickup();
    await db.insert(s.coupons).values({ code: "UNICO", type: "percent", value: 10, usageLimit: 1 });
    const { variantId } = await makeProduct({ stock: 10, price: 10000 });
    const c1 = await makeCart([{ variantId, quantity: 1 }], "UNICO");
    const c2 = await makeCart([{ variantId, quantity: 1 }], "UNICO");
    const res = await Promise.allSettled([
      placeOrder(checkoutInput({ email: "a@x.com" }), { cartId: c1, userId: null }),
      placeOrder(checkoutInput({ email: "b@x.com" }), { cartId: c2, userId: null }),
    ]);
    const ok = res.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    const failed = res.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(String(failed.reason.message)).toMatch(/limite de utilizações/);
    const o = await order((ok[0] as PromiseFulfilledResult<{ orderId: string }>).value.orderId);
    expect(o.discountCents).toBe(1000);
    expect(o.totalCents).toBe(9000);
  });

  it("valida dados do comprador (CPF, telefone, termos)", async () => {
    await configurePickup();
    const { variantId } = await makeProduct();
    const cartId = await makeCart([{ variantId, quantity: 1 }]);
    await expect(placeOrder(checkoutInput({ cpf: "111.111.111-11" }), { cartId, userId: null })).rejects.toThrow();
    await expect(placeOrder(checkoutInput({ phone: "123" }), { cartId, userId: null })).rejects.toThrow();
    await expect(placeOrder(checkoutInput({ acceptTerms: false }), { cartId, userId: null })).rejects.toThrow();
  });
});

describe("pagamento (Mercado Pago simulado)", () => {
  async function paidSetup(qty = 2) {
    await configurePickup();
    const { variantId } = await makeProduct({ stock: 5, price: 5000 });
    const cartId = await makeCart([{ variantId, quantity: qty }]);
    const r = await placeOrder(checkoutInput(), { cartId, userId: null });
    return { variantId, orderId: r.orderId, token: r.accessToken! };
  }

  it("cria preferência com total exato, referência do pedido e sem dados de cartão", async () => {
    const { orderId, token } = await paidSetup();
    const url = await startPayment(orderId, token);
    expect(url).toContain("pref_id=pref-" + orderId);
    const call = mp.calls.find((c) => c.path === "/checkout/preferences")!;
    const body = call.body as { items: { unit_price: number; quantity: number }[]; external_reference: string };
    expect(body.external_reference).toBe(orderId);
    expect(body.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)).toBe(100);
    expect(call.headers["X-Idempotency-Key"]).toBe(`pref-${orderId}`);
    // segunda chamada reaproveita a preferência
    expect(await startPayment(orderId, token)).toBe(url);
    expect(mp.calls.filter((c) => c.path === "/checkout/preferences")).toHaveLength(1);
  });

  it("aprovado: marca pago e baixa estoque; notificação repetida não muda nada", async () => {
    const { orderId, variantId } = await paidSetup();
    const p = { id: 1001, external_reference: orderId, transaction_amount: 100, status: "approved", date_approved: new Date().toISOString() };
    expect(await applyProviderPayment(p, "webhook")).toBe("paid");
    let v = await variant(variantId);
    expect([v.stockOnHand, v.stockReserved]).toEqual([3, 0]);
    expect((await order(orderId)).status).toBe("paid");
    expect(await applyProviderPayment(p, "webhook")).toBe("noop");
    v = await variant(variantId);
    expect([v.stockOnHand, v.stockReserved]).toEqual([3, 0]);
    expect((await db.select().from(s.payments).where(eq(s.payments.orderId, orderId))).length).toBe(1);
  });

  it("pendente e recusado não marcam como pago nem mexem no estoque", async () => {
    const { orderId, variantId } = await paidSetup();
    await applyProviderPayment({ id: 2001, external_reference: orderId, transaction_amount: 100, status: "pending" }, "webhook");
    expect((await order(orderId)).paymentStatus).toBe("pending");
    await applyProviderPayment({ id: 2002, external_reference: orderId, transaction_amount: 100, status: "rejected", status_detail: "cc_rejected_insufficient_amount" }, "webhook");
    const o = await order(orderId);
    expect(o.status).toBe("pending_payment");
    expect(o.paymentStatus).toBe("rejected");
    expect((await variant(variantId)).stockReserved).toBe(2);
  });

  it("valor divergente NÃO marca como pago", async () => {
    const { orderId, variantId } = await paidSetup();
    expect(await applyProviderPayment({ id: 3001, external_reference: orderId, transaction_amount: 1, status: "approved" }, "webhook")).toBe("amount_mismatch");
    const o = await order(orderId);
    expect(o.status).toBe("needs_attention");
    expect(o.paidAt).toBeNull();
    expect((await variant(variantId)).stockOnHand).toBe(5);
  });

  it("segundo pagamento aprovado é sinalizado como duplicado", async () => {
    const { orderId } = await paidSetup();
    await applyProviderPayment({ id: 4001, external_reference: orderId, transaction_amount: 100, status: "approved" }, "webhook");
    expect(await applyProviderPayment({ id: 4002, external_reference: orderId, transaction_amount: 100, status: "approved" }, "webhook")).toBe("duplicate_payment");
    expect((await order(orderId)).attentionReason).toMatch(/duplicado/);
  });

  it("pagamento de outro sistema (referência estranha) é ignorado", async () => {
    expect(await applyProviderPayment({ id: 5001, external_reference: "outra-loja-123", transaction_amount: 10, status: "approved" }, "webhook")).toBe("ignored_foreign");
  });

  it("expiração: consulta o provedor, cancela, libera estoque e devolve o uso do cupom", async () => {
    await configurePickup();
    await db.insert(s.coupons).values({ code: "DEZ", type: "percent", value: 10 });
    const { variantId } = await makeProduct({ stock: 5, price: 5000 });
    const cartId = await makeCart([{ variantId, quantity: 2 }], "DEZ");
    const { orderId } = await placeOrder(checkoutInput(), { cartId, userId: null });
    await db.update(s.orders).set({ reservationExpiresAt: new Date(Date.now() - 1000) }).where(eq(s.orders.id, orderId));
    const r = await expireStaleOrders();
    expect(r.cancelled).toBe(1);
    expect(mp.calls.some((c) => c.path.startsWith("/v1/payments/search"))).toBe(true);
    const o = await order(orderId);
    expect(o.status).toBe("cancelled");
    expect((await variant(variantId)).stockReserved).toBe(0);
    const red = (await db.select().from(s.couponRedemptions).where(eq(s.couponRedemptions.orderId, orderId)))[0];
    expect(red.voided).toBe(true);
  });

  it("expiração NÃO cancela se o pagamento foi aprovado e o webhook se perdeu", async () => {
    const { orderId, variantId } = await paidSetup();
    mp.setPayment({ id: 6001, external_reference: orderId, transaction_amount: 100, status: "approved" });
    await db.update(s.orders).set({ reservationExpiresAt: new Date(Date.now() - 1000) }).where(eq(s.orders.id, orderId));
    const r = await expireStaleOrders();
    expect(r.paid).toBe(1);
    expect((await order(orderId)).status).toBe("paid");
    expect((await variant(variantId)).stockOnHand).toBe(3);
  });

  it("pago depois de cancelado: reativa se houver estoque", async () => {
    const { orderId, variantId } = await paidSetup();
    await cancelUnpaidOrder(orderId, "teste", null);
    expect((await variant(variantId)).stockReserved).toBe(0);
    expect(await applyProviderPayment({ id: 7001, external_reference: orderId, transaction_amount: 100, status: "approved" }, "webhook")).toBe("paid_after_cancel");
    const o = await order(orderId);
    expect(o.status).toBe("paid");
    expect(o.attentionReason).toMatch(/após o cancelamento/);
    expect((await variant(variantId)).stockOnHand).toBe(3);
  });

  it("não cancela manualmente pedido pago", async () => {
    const { orderId } = await paidSetup();
    await applyProviderPayment({ id: 8001, external_reference: orderId, transaction_amount: 100, status: "approved" }, "webhook");
    await expect(cancelUnpaidOrder(orderId, "x", null)).rejects.toThrow(/reembolso/);
  });

  it("reembolso total confirmado pelo provedor cancela e devolve ao estoque se não enviado", async () => {
    const { orderId, variantId } = await paidSetup();
    mp.setPayment({ id: 9001, external_reference: orderId, transaction_amount: 100, status: "approved" });
    await applyProviderPayment({ id: 9001, external_reference: orderId, transaction_amount: 100, status: "approved" }, "webhook");
    const outcome = await requestRefund(orderId, null, "00000000-0000-0000-0000-000000000000", "cliente desistiu");
    expect(outcome).toBe("refunded");
    const refundCall = mp.calls.find((c) => c.path.endsWith("/refunds"))!;
    expect(refundCall.headers["X-Idempotency-Key"]).toBeTruthy();
    const o = await order(orderId);
    expect(o.status).toBe("cancelled");
    expect(o.paymentStatus).toBe("refunded");
    expect((await variant(variantId)).stockOnHand).toBe(5);
  });

  it("separação/entrega: só após pagamento e com transições válidas", async () => {
    const { orderId } = await paidSetup();
    const staff = "00000000-0000-0000-0000-000000000000";
    await expect(updateFulfillment(orderId, "picking", staff)).rejects.toThrow(/pagamento aprovado/);
    await applyProviderPayment({ id: 10001, external_reference: orderId, transaction_amount: 100, status: "approved" }, "webhook");
    await expect(updateFulfillment(orderId, "shipped", staff)).rejects.toThrow(/retirada/);
    await updateFulfillment(orderId, "picking", staff);
    await updateFulfillment(orderId, "ready_for_pickup", staff);
    await updateFulfillment(orderId, "delivered", staff);
    const o = await order(orderId);
    expect(o.status).toBe("completed");
    await expect(updateFulfillment(orderId, "picking", staff)).rejects.toThrow(/não permitida/);
  });

  it("acesso ao pedido exige token correto, dono ou equipe", async () => {
    const { orderId, token } = await paidSetup();
    expect(await getOrderForViewer(orderId, { token })).not.toBeNull();
    expect(await getOrderForViewer(orderId, { token: "errado" })).toBeNull();
    expect(await getOrderForViewer(orderId, {})).toBeNull();
    expect(await getOrderForViewer(orderId, { userId: "00000000-0000-0000-0000-000000000000" })).toBeNull();
    expect(await getOrderForViewer(orderId, { isStaff: true })).not.toBeNull();
  });
});

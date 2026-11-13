import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { POST } from "@/app/api/webhooks/mercadopago/route";
import { placeOrder } from "@/server/services/orders";
import { signManifest, buildManifest } from "@/lib/mercadopago-signature";
import { resetDb, makeProduct, makeCart, configurePickup, checkoutInput, mockMercadoPago } from "./helpers";

let mp: ReturnType<typeof mockMercadoPago>;
beforeEach(async () => { await resetDb(); mp = mockMercadoPago(); });
afterEach(() => mp.restore());

function notification(paymentId: string, requestId: string, opts: { secret?: string; tamper?: boolean } = {}) {
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = signManifest(buildManifest(paymentId, requestId, ts), opts.secret ?? process.env.MP_WEBHOOK_SECRET!);
  return new Request(`http://localhost:3000/api/webhooks/mercadopago?data.id=${opts.tamper ? "999" : paymentId}&type=payment`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": requestId, "x-signature": `ts=${ts},v1=${v1}` },
    body: JSON.stringify({ type: "payment", action: "payment.updated", data: { id: paymentId } }),
  });
}

async function setup() {
  await configurePickup();
  const { variantId } = await makeProduct({ stock: 3, price: 2500 });
  const cartId = await makeCart([{ variantId, quantity: 1 }]);
  const { orderId } = await placeOrder(checkoutInput(), { cartId, userId: null });
  mp.setPayment({ id: 555, external_reference: orderId, transaction_amount: 25, status: "approved" });
  return { orderId, variantId };
}

describe("webhook Mercado Pago", () => {
  it("assinatura válida → consulta a API e marca pago", async () => {
    const { orderId } = await setup();
    const res = await POST(notification("555", "req-a"));
    expect(res.status).toBe(200);
    expect((await res.json()).outcome).toBe("paid");
    expect(mp.calls.some((c) => c.path === "/v1/payments/555")).toBe(true);
    expect((await db.select().from(s.orders).where(eq(s.orders.id, orderId)))[0].status).toBe("paid");
  });

  it("assinatura inválida ou adulterada → 401 e nada é processado", async () => {
    const { orderId } = await setup();
    expect((await POST(notification("555", "req-b", { secret: "outro" }))).status).toBe(401);
    expect((await POST(notification("555", "req-c", { tamper: true }))).status).toBe(401);
    const unsigned = new Request("http://localhost/api/webhooks/mercadopago?data.id=555&type=payment", { method: "POST", body: "{}" });
    expect((await POST(unsigned)).status).toBe(401);
    expect(mp.calls.some((c) => c.path.startsWith("/v1/payments/"))).toBe(false);
    expect((await db.select().from(s.orders).where(eq(s.orders.id, orderId)))[0].status).toBe("pending_payment");
  });

  it("notificação repetida (mesmo x-request-id) não é reprocessada", async () => {
    await setup();
    await POST(notification("555", "req-d"));
    const res = await POST(notification("555", "req-d"));
    expect((await res.json()).duplicate).toBe(true);
    expect(mp.calls.filter((c) => c.path === "/v1/payments/555")).toHaveLength(1);
  });

  it("falha ao consultar o provedor → 500 para o Mercado Pago reenviar", async () => {
    await setup();
    const res = await POST(notification("777", "req-e")); // pagamento inexistente na API simulada
    expect(res.status).toBe(500);
    const ev = (await db.select().from(s.webhookEvents).where(eq(s.webhookEvents.eventKey, "req-e")))[0];
    expect(ev.processedAt).toBeNull();
    expect(ev.error).toBeTruthy();
  });

  it("tópicos que não são pagamento são ignorados com 200", async () => {
    const ts = "1";
    const v1 = signManifest(buildManifest("1", "r", ts), process.env.MP_WEBHOOK_SECRET!);
    const req = new Request("http://localhost/api/webhooks/mercadopago?data.id=1&type=merchant_order", { method: "POST", headers: { "x-request-id": "r", "x-signature": `ts=${ts},v1=${v1}` }, body: "{}" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe(true);
  });
});

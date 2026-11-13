import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { saveCartContact, sendCartRecoveryEmails } from "@/server/services/cart-recovery";
import { saveSettings } from "@/server/settings";
import { placeOrder } from "@/server/services/orders";
import { resetDb, makeProduct, makeCart, configurePickup, checkoutInput, mockMercadoPago } from "./helpers";

const H = 3600e3;
async function age(cartId: string, hours: number) {
  await db.update(s.carts).set({ updatedAt: new Date(Date.now() - hours * H) }).where(eq(s.carts.id, cartId));
}
const outbox = () => db.select().from(s.emailOutbox);

let mp: ReturnType<typeof mockMercadoPago>;
beforeEach(async () => { await resetDb(); mp = mockMercadoPago(); });
afterEach(() => mp.restore());

describe("recuperação de carrinho", () => {
  it("desativada por padrão: nada é enviado", async () => {
    const { variantId } = await makeProduct();
    const cartId = await makeCart([{ variantId, quantity: 1 }]);
    await saveCartContact(cartId, "a@x.com", true);
    await age(cartId, 30);
    expect(await sendCartRecoveryEmails()).toMatchObject({ enabled: false, sent: 0 });
    expect(await outbox()).toHaveLength(0);
  });

  it("com consentimento e após o prazo: envia uma única vez, com links reais", async () => {
    await saveSettings("checkout", { cartRecoveryEnabled: true, cartRecoveryHours: 24 });
    const { variantId } = await makeProduct({ name: "Pelúcia Lembrete" });
    const cartId = await makeCart([{ variantId, quantity: 2 }]);
    await saveCartContact(cartId, "A@X.com", true);
    await age(cartId, 2);
    expect((await sendCartRecoveryEmails()).sent).toBe(0); // antes do prazo
    await age(cartId, 30);
    expect((await sendCartRecoveryEmails()).sent).toBe(1);
    expect((await sendCartRecoveryEmails()).sent).toBe(0); // não repete
    const [mail] = await outbox();
    expect(mail.to).toBe("a@x.com");
    expect(mail.text).toContain("2x Pelúcia Lembrete");
    expect(mail.text).toContain("/produto/");
  });

  it("sem consentimento, consentimento revogado, carrinho convertido ou antigo demais: não envia", async () => {
    await saveSettings("checkout", { cartRecoveryEnabled: true, cartRecoveryHours: 24 });
    await configurePickup();
    const { variantId } = await makeProduct({ stock: 10 });
    const noConsent = await makeCart([{ variantId, quantity: 1 }]);
    await saveCartContact(noConsent, "a@x.com", false);
    const revoked = await makeCart([{ variantId, quantity: 1 }]);
    await saveCartContact(revoked, "b@x.com", true);
    await saveCartContact(revoked, "b@x.com", false);
    const converted = await makeCart([{ variantId, quantity: 1 }]);
    await saveCartContact(converted, "c@x.com", true);
    await placeOrder(checkoutInput({ email: "c@x.com" }), { cartId: converted, userId: null });
    const old = await makeCart([{ variantId, quantity: 1 }]);
    await saveCartContact(old, "d@x.com", true);
    for (const c of [noConsent, revoked, converted]) await age(c, 30);
    await age(old, 24 * 8);
    expect((await sendCartRecoveryEmails()).sent).toBe(0);
    const rev = (await db.select().from(s.carts).where(eq(s.carts.id, revoked)))[0];
    expect(rev.email).toBeNull();
    // pedido sem consentimento de marketing não guarda o e-mail no carrinho
    const conv = (await db.select().from(s.carts).where(eq(s.carts.id, converted)))[0];
    expect(conv.email).toBeNull();
  });

  it("e-mail inválido é recusado", async () => {
    const { variantId } = await makeProduct();
    const cartId = await makeCart([{ variantId, quantity: 1 }]);
    await expect(saveCartContact(cartId, "nao-e-email", true)).rejects.toThrow(/inválido/);
  });
});

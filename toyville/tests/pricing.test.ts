import { describe, it, expect } from "vitest";
import { priceCart, resolveUnitPrice, allocate, type PricingLineInput, type PromotionInput, type CouponInput } from "@/lib/pricing";

const now = new Date("2026-11-10T12:00:00Z");
const line = (o: Partial<PricingLineInput> = {}): PricingLineInput => ({
  variantId: "v1", productId: "p1", brandId: "b1", categoryIds: ["c1"], quantity: 1,
  priceCents: 10000, salePriceCents: null, saleStartsAt: null, saleEndsAt: null, ...o,
});
const promo = (o: Partial<PromotionInput> = {}): PromotionInput => ({
  id: "pr1", name: "Promo", kind: "percent_off", value: 10, scope: { all: true }, minSubtotalCents: 0,
  startsAt: null, endsAt: null, isActive: true, isFlash: false, ...o,
});
const coupon = (o: Partial<CouponInput> = {}): CouponInput => ({
  id: "cp1", code: "BEMVINDO", type: "percent", value: 10, minSubtotalCents: 0, maxDiscountCents: null,
  startsAt: null, endsAt: null, usageLimit: null, usageLimitPerCustomer: null, combinableWithPromotions: false,
  scope: {}, isActive: true, ...o,
});
const base = { promotions: [], coupon: null, couponCodeRequested: null, couponUsage: { total: 0, byCustomer: 0 }, shippingQuoteCents: null, shippingIsPaidMethod: false, now };

describe("resolveUnitPrice", () => {
  it("usa preço normal sem promoções", () => {
    expect(resolveUnitPrice(line(), [], now).unitCents).toBe(10000);
  });
  it("usa preço promocional apenas dentro da vigência", () => {
    const inside = line({ salePriceCents: 8000, saleStartsAt: new Date("2026-11-01"), saleEndsAt: new Date("2026-11-30") });
    const after = line({ salePriceCents: 8000, saleEndsAt: new Date("2026-11-01") });
    const before = line({ salePriceCents: 8000, saleStartsAt: new Date("2026-12-01") });
    expect(resolveUnitPrice(inside, [], now)).toMatchObject({ unitCents: 8000, source: "sale" });
    expect(resolveUnitPrice(after, [], now).unitCents).toBe(10000);
    expect(resolveUnitPrice(before, [], now).unitCents).toBe(10000);
  });
  it("não empilha preço promocional com promoção automática: fica o menor", () => {
    const l = line({ salePriceCents: 9500 });
    expect(resolveUnitPrice(l, [promo({ value: 20 })], now)).toMatchObject({ unitCents: 8000, source: "promotion" });
    expect(resolveUnitPrice(l, [promo({ value: 2 })], now)).toMatchObject({ unitCents: 9500, source: "sale" });
  });
  it("promoção com escopo vazio NÃO se aplica a tudo", () => {
    expect(resolveUnitPrice(line(), [promo({ scope: {} })], now).unitCents).toBe(10000);
  });
  it("respeita escopo por categoria, marca e produto", () => {
    expect(resolveUnitPrice(line(), [promo({ scope: { categoryIds: ["c1"] } })], now).unitCents).toBe(9000);
    expect(resolveUnitPrice(line(), [promo({ scope: { categoryIds: ["c2"] } })], now).unitCents).toBe(10000);
    expect(resolveUnitPrice(line(), [promo({ scope: { brandIds: ["b1"] } })], now).unitCents).toBe(9000);
    expect(resolveUnitPrice(line(), [promo({ scope: { productIds: ["p1"] } })], now).unitCents).toBe(9000);
  });
  it("oferta relâmpago expira no horário", () => {
    const flash = promo({ isFlash: true, value: 30, endsAt: new Date("2026-11-10T12:00:00Z") });
    expect(resolveUnitPrice(line(), [flash], now).unitCents).toBe(10000); // fim exclusivo
    expect(resolveUnitPrice(line(), [flash], new Date("2026-11-10T11:59:59Z")).unitCents).toBe(7000);
  });
  it("desconto fixo nunca gera preço zero ou negativo", () => {
    expect(resolveUnitPrice(line({ priceCents: 500 }), [promo({ kind: "fixed_off", value: 10000 })], now).unitCents).toBe(1);
  });
  it("ignora promoções inativas", () => {
    expect(resolveUnitPrice(line(), [promo({ isActive: false })], now).unitCents).toBe(10000);
  });
});

describe("priceCart com cupom", () => {
  it("aplica cupom percentual sobre itens elegíveis", () => {
    const r = priceCart({ ...base, lines: [line({ quantity: 2 })], coupon: coupon(), couponCodeRequested: "bemvindo" });
    expect(r.subtotalCents).toBe(20000);
    expect(r.couponDiscountCents).toBe(2000);
    expect(r.totalCents).toBe(18000);
    expect(r.couponError).toBeNull();
  });
  it("cupom não combinável ignora itens já promocionais", () => {
    const r = priceCart({
      ...base,
      lines: [line({ variantId: "a", salePriceCents: 8000 }), line({ variantId: "b", productId: "p2" })],
      coupon: coupon(), couponCodeRequested: "BEMVINDO",
    });
    expect(r.couponDiscountCents).toBe(1000); // só sobre o item b
    expect(r.lines[0].couponDiscountCents).toBe(0);
  });
  it("cupom não combinável com todos os itens em promoção é rejeitado", () => {
    const r = priceCart({ ...base, lines: [line({ salePriceCents: 8000 })], coupon: coupon(), couponCodeRequested: "X" });
    expect(r.couponError).toBe("not_applicable");
    expect(r.couponDiscountCents).toBe(0);
  });
  it("cupom combinável incide sobre preço já promocional (sem duplicar sobre o preço cheio)", () => {
    const r = priceCart({ ...base, lines: [line({ salePriceCents: 8000 })], coupon: coupon({ combinableWithPromotions: true }), couponCodeRequested: "X" });
    expect(r.couponDiscountCents).toBe(800);
    expect(r.totalCents).toBe(7200);
  });
  it("cupom fixo limitado ao subtotal elegível — total nunca negativo", () => {
    const r = priceCart({ ...base, lines: [line({ priceCents: 3000 })], coupon: coupon({ type: "fixed", value: 99999 }), couponCodeRequested: "X" });
    expect(r.couponDiscountCents).toBe(3000);
    expect(r.totalCents).toBe(0);
  });
  it("respeita teto de desconto", () => {
    const r = priceCart({ ...base, lines: [line({ priceCents: 100000 })], coupon: coupon({ value: 50, maxDiscountCents: 5000 }), couponCodeRequested: "X" });
    expect(r.couponDiscountCents).toBe(5000);
  });
  it.each([
    [{ isActive: false }, "inactive"],
    [{ startsAt: new Date("2026-12-01") }, "not_started"],
    [{ endsAt: new Date("2026-11-01") }, "expired"],
    [{ minSubtotalCents: 50000 }, "min_subtotal"],
    [{ usageLimit: 5 }, "usage_limit"],
    [{ usageLimitPerCustomer: 1 }, "customer_limit"],
  ] as const)("rejeita cupom %o com %s", (over, err) => {
    const r = priceCart({ ...base, lines: [line()], coupon: coupon(over), couponCodeRequested: "X", couponUsage: { total: 5, byCustomer: 1 } });
    expect(r.couponError).toBe(err);
    expect(r.totalCents).toBe(10000);
  });
  it("cupom inexistente", () => {
    const r = priceCart({ ...base, lines: [line()], couponCodeRequested: "NAOEXISTE" });
    expect(r.couponError).toBe("not_found");
  });
  it("rateio do cupom fecha exatamente com o desconto", () => {
    const r = priceCart({
      ...base,
      lines: [line({ variantId: "a", priceCents: 3333 }), line({ variantId: "b", productId: "p2", priceCents: 3333 }), line({ variantId: "c", productId: "p3", priceCents: 3334 })],
      coupon: coupon({ type: "fixed", value: 1000 }), couponCodeRequested: "X",
    });
    expect(r.lines.reduce((s, l) => s + l.couponDiscountCents, 0)).toBe(1000);
    expect(r.lines.reduce((s, l) => s + l.lineTotalCents, 0)).toBe(r.subtotalCents - r.couponDiscountCents);
  });
});

describe("frete", () => {
  it("frete grátis por promoção a partir de valor mínimo", () => {
    const fs = promo({ id: "fs", kind: "free_shipping", value: 0, minSubtotalCents: 15000 });
    const below = priceCart({ ...base, lines: [line()], promotions: [fs], shippingQuoteCents: 2000, shippingIsPaidMethod: true });
    expect(below.shippingCents).toBe(2000);
    expect(below.freeShipping.missingCents).toBe(5000);
    const above = priceCart({ ...base, lines: [line({ quantity: 2 })], promotions: [fs], shippingQuoteCents: 2000, shippingIsPaidMethod: true });
    expect(above.shippingCents).toBe(0);
    expect(above.totalCents).toBe(20000);
  });
  it("mínimo do frete grátis considera o valor após o cupom", () => {
    const fs = promo({ id: "fs", kind: "free_shipping", value: 0, minSubtotalCents: 19000 });
    const r = priceCart({ ...base, lines: [line({ quantity: 2 })], promotions: [fs], coupon: coupon(), couponCodeRequested: "X", shippingQuoteCents: 1500, shippingIsPaidMethod: true });
    expect(r.shippingCents).toBe(1500); // 20000 - 2000 = 18000 < 19000
  });
  it("cupom de frete grátis", () => {
    const r = priceCart({ ...base, lines: [line()], coupon: coupon({ type: "free_shipping", value: 0 }), couponCodeRequested: "X", shippingQuoteCents: 2500, shippingIsPaidMethod: true });
    expect(r.shippingCents).toBe(0);
    expect(r.totalCents).toBe(10000);
  });
  it("quantidade inválida é normalizada (1..99)", () => {
    const r = priceCart({ ...base, lines: [line({ quantity: -5 }), line({ variantId: "z", quantity: 1000 })] });
    expect(r.lines[0].quantity).toBe(1);
    expect(r.lines[1].quantity).toBe(99);
  });
});

describe("allocate", () => {
  it("soma exata e proporcional", () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(0, [5, 5])).toEqual([0, 0]);
    expect(allocate(10, [0, 5])).toEqual([0, 10]);
  });
});

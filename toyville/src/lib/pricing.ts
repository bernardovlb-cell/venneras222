/**
 * Motor de preços e promoções — função PURA (sem banco, sem relógio implícito).
 * É a única fonte de verdade para valores de carrinho e pedido; roda sempre no servidor.
 *
 * Política de combinação (evita empilhamento indevido):
 *  1. Preço do item = MENOR valor entre: preço normal, preço promocional da variação (se vigente)
 *     e o melhor desconto automático/oferta relâmpago vigente. Nunca se somam entre si.
 *  2. Cupom incide apenas sobre itens elegíveis. Se o cupom NÃO for combinável, itens que já estão
 *     com preço promocional/promoção ficam fora da base do cupom.
 *  3. Apenas UM cupom por pedido.
 *  4. Frete grátis (por promoção com valor mínimo ou por cupom) zera somente o frete de modalidades pagas.
 *  5. Nenhum valor fica negativo; arredondamento sempre a favor do cliente nunca abaixo de zero.
 */

export interface PricingLineInput {
  variantId: string;
  productId: string;
  brandId: string | null;
  categoryIds: string[]; // categoria do produto + ancestrais
  quantity: number;
  priceCents: number; // preço normal
  salePriceCents: number | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
}

export interface PromotionInput {
  id: string;
  name: string;
  kind: "percent_off" | "fixed_off" | "free_shipping";
  value: number;
  scope: { all?: boolean; categoryIds?: string[]; productIds?: string[]; brandIds?: string[] };
  minSubtotalCents: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  isFlash: boolean;
  badge?: string | null;
}

export interface CouponInput {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minSubtotalCents: number;
  maxDiscountCents: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  combinableWithPromotions: boolean;
  scope: { categoryIds?: string[]; productIds?: string[]; brandIds?: string[] };
  isActive: boolean;
}

export interface CouponUsage {
  total: number; // usos válidos (pedidos não cancelados)
  byCustomer: number; // usos do mesmo e-mail/cliente
}

export interface PricedLine {
  variantId: string;
  quantity: number;
  listUnitCents: number;
  unitCents: number;
  source: "list" | "sale" | "promotion";
  promotionId: string | null;
  promotionLabel: string | null;
  lineSubtotalCents: number; // unitCents * qty
  couponDiscountCents: number; // rateio do cupom nesta linha
  lineTotalCents: number;
}

export type CouponError =
  | "not_found" | "inactive" | "not_started" | "expired" | "min_subtotal"
  | "usage_limit" | "customer_limit" | "not_applicable";

export interface PricingResult {
  lines: PricedLine[];
  listSubtotalCents: number;
  subtotalCents: number; // após promoções de item
  itemSavingsCents: number;
  couponCode: string | null;
  couponDiscountCents: number;
  couponError: CouponError | null;
  freeShipping: { eligible: boolean; reason: "promotion" | "coupon" | null; promotionId: string | null; missingCents: number | null };
  shippingCents: number;
  totalCents: number;
}

export const COUPON_ERROR_MESSAGES: Record<CouponError, string> = {
  not_found: "Cupom não encontrado.",
  inactive: "Este cupom não está ativo.",
  not_started: "Este cupom ainda não está válido.",
  expired: "Este cupom expirou.",
  min_subtotal: "O valor mínimo para este cupom não foi atingido.",
  usage_limit: "Este cupom atingiu o limite de utilizações.",
  customer_limit: "Você já utilizou este cupom o número máximo de vezes.",
  not_applicable: "Este cupom não se aplica aos itens do carrinho.",
};

export function isWithin(now: Date, start: Date | null, end: Date | null): boolean {
  if (start && now < start) return false;
  if (end && now >= end) return false;
  return true;
}

/**
 * Escopo vazio: para CUPOM significa "carrinho inteiro"; para PROMOÇÃO automática significa
 * "nenhum produto" (promoção só vale para todos com `all: true` explícito — evita desconto acidental geral).
 */
function inScope(
  line: Pick<PricingLineInput, "productId" | "brandId" | "categoryIds">,
  scope: { all?: boolean; categoryIds?: string[]; productIds?: string[]; brandIds?: string[] },
  emptyMeansAll: boolean,
): boolean {
  if (scope.all) return true;
  const hasRule = !!(scope.categoryIds?.length || scope.productIds?.length || scope.brandIds?.length);
  if (!hasRule) return emptyMeansAll;
  if (scope.productIds?.includes(line.productId)) return true;
  if (line.brandId && scope.brandIds?.includes(line.brandId)) return true;
  if (scope.categoryIds?.some((c) => line.categoryIds.includes(c))) return true;
  return false;
}

/** Preço efetivo unitário de uma variação (usado também na vitrine). */
export function resolveUnitPrice(
  line: Omit<PricingLineInput, "quantity" | "variantId">,
  promotions: PromotionInput[],
  now: Date,
): { unitCents: number; source: PricedLine["source"]; promotionId: string | null; label: string | null; endsAt: Date | null } {
  let best = { unitCents: line.priceCents, source: "list" as PricedLine["source"], promotionId: null as string | null, label: null as string | null, endsAt: null as Date | null };
  if (line.salePriceCents != null && line.salePriceCents > 0 && line.salePriceCents < line.priceCents && isWithin(now, line.saleStartsAt, line.saleEndsAt)) {
    best = { unitCents: line.salePriceCents, source: "sale", promotionId: null, label: "Oferta", endsAt: line.saleEndsAt };
  }
  for (const p of promotions) {
    if (!p.isActive || p.kind === "free_shipping" || !isWithin(now, p.startsAt, p.endsAt)) continue;
    if (!inScope(line, p.scope, false)) continue;
    let price = line.priceCents;
    if (p.kind === "percent_off") price = line.priceCents - Math.floor((line.priceCents * Math.min(Math.max(p.value, 0), 90)) / 100);
    else if (p.kind === "fixed_off") price = line.priceCents - p.value;
    price = Math.max(price, 1); // nunca gratuito/negativo por promoção automática
    if (price < best.unitCents) {
      best = { unitCents: price, source: "promotion", promotionId: p.id, label: p.badge || (p.isFlash ? "Oferta relâmpago" : p.name), endsAt: p.endsAt };
    }
  }
  return best;
}

export function validateCoupon(
  coupon: CouponInput | null,
  usage: CouponUsage,
  now: Date,
  subtotalCents: number,
): CouponError | null {
  if (!coupon) return "not_found";
  if (!coupon.isActive) return "inactive";
  if (coupon.startsAt && now < coupon.startsAt) return "not_started";
  if (coupon.endsAt && now >= coupon.endsAt) return "expired";
  if (coupon.usageLimit != null && usage.total >= coupon.usageLimit) return "usage_limit";
  if (coupon.usageLimitPerCustomer != null && usage.byCustomer >= coupon.usageLimitPerCustomer) return "customer_limit";
  if (subtotalCents < coupon.minSubtotalCents) return "min_subtotal";
  return null;
}

/** Rateia `total` proporcionalmente aos pesos (maiores restos), soma exata. */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map(Math.floor);
  let rest = total - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    if (weights[i] > 0) { floors[i] += 1; rest -= 1; }
  }
  return floors;
}

export interface PriceCartArgs {
  lines: PricingLineInput[];
  promotions: PromotionInput[];
  coupon: CouponInput | null;
  couponCodeRequested: string | null;
  couponUsage: CouponUsage;
  shippingQuoteCents: number | null; // null = modalidade ainda não escolhida
  shippingIsPaidMethod: boolean; // retirada = false
  now: Date;
}

export function priceCart(args: PriceCartArgs): PricingResult {
  const { now } = args;
  const priced: PricedLine[] = args.lines.map((l) => {
    const qty = Math.max(1, Math.min(99, Math.floor(l.quantity)));
    const r = resolveUnitPrice(l, args.promotions, now);
    return {
      variantId: l.variantId,
      quantity: qty,
      listUnitCents: l.priceCents,
      unitCents: r.unitCents,
      source: r.source,
      promotionId: r.promotionId,
      promotionLabel: r.label,
      lineSubtotalCents: r.unitCents * qty,
      couponDiscountCents: 0,
      lineTotalCents: r.unitCents * qty,
    };
  });

  const listSubtotalCents = priced.reduce((s, l) => s + l.listUnitCents * l.quantity, 0);
  const subtotalCents = priced.reduce((s, l) => s + l.lineSubtotalCents, 0);

  // ---- Cupom
  let couponDiscountCents = 0;
  let couponError: CouponError | null = null;
  let couponFreeShipping = false;
  let couponCode: string | null = null;
  if (args.couponCodeRequested) {
    couponError = validateCoupon(args.coupon, args.couponUsage, now, subtotalCents);
    const c = args.coupon;
    if (!couponError && c) {
      const eligibleIdx = priced
        .map((pl, i) => ({ pl, i, src: args.lines[i] }))
        .filter(({ pl, src }) => inScope(src, c.scope, true) && (c.combinableWithPromotions || pl.source === "list"))
        .map(({ i }) => i);
      const base = eligibleIdx.reduce((s, i) => s + priced[i].lineSubtotalCents, 0);
      if (c.type === "free_shipping") {
        if (eligibleIdx.length === 0) couponError = "not_applicable";
        else couponFreeShipping = true;
      } else if (base <= 0) {
        couponError = "not_applicable";
      } else {
        let d = c.type === "percent" ? Math.floor((base * Math.min(c.value, 100)) / 100) : c.value;
        if (c.maxDiscountCents != null) d = Math.min(d, c.maxDiscountCents);
        d = Math.max(0, Math.min(d, base));
        couponDiscountCents = d;
        const shares = allocate(d, eligibleIdx.map((i) => priced[i].lineSubtotalCents));
        eligibleIdx.forEach((i, k) => {
          priced[i].couponDiscountCents = shares[k];
          priced[i].lineTotalCents = priced[i].lineSubtotalCents - shares[k];
        });
      }
    }
    if (!couponError) couponCode = c?.code ?? null;
  }

  // ---- Frete grátis por promoção (sobre o valor após cupom)
  const afterDiscount = subtotalCents - couponDiscountCents;
  let freeShip: PricingResult["freeShipping"] = { eligible: false, reason: null, promotionId: null, missingCents: null };
  const fsPromos = args.promotions
    .filter((p) => p.isActive && p.kind === "free_shipping" && isWithin(now, p.startsAt, p.endsAt))
    .sort((a, b) => a.minSubtotalCents - b.minSubtotalCents);
  if (couponFreeShipping) {
    freeShip = { eligible: true, reason: "coupon", promotionId: null, missingCents: null };
  } else if (fsPromos.length) {
    const hit = fsPromos.find((p) => afterDiscount >= p.minSubtotalCents);
    if (hit) freeShip = { eligible: true, reason: "promotion", promotionId: hit.id, missingCents: null };
    else freeShip = { eligible: false, reason: null, promotionId: null, missingCents: fsPromos[0].minSubtotalCents - afterDiscount };
  }

  let shippingCents = args.shippingQuoteCents ?? 0;
  if (freeShip.eligible && args.shippingIsPaidMethod) shippingCents = 0;
  shippingCents = Math.max(0, shippingCents);

  const totalCents = Math.max(0, afterDiscount + shippingCents);
  return {
    lines: priced,
    listSubtotalCents,
    subtotalCents,
    itemSavingsCents: listSubtotalCents - subtotalCents,
    couponCode,
    couponDiscountCents,
    couponError,
    freeShipping: freeShip,
    shippingCents,
    totalCents,
  };
}

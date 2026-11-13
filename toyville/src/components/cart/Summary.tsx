import { formatBRL } from "@/lib/money";
import type { PricingResult } from "@/lib/pricing";

export function Summary({ pricing, shippingLabel }: { pricing: PricingResult; shippingLabel?: string | null }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-bold">{formatBRL(pricing.listSubtotalCents)}</dd></div>
      {pricing.itemSavingsCents > 0 && <div className="flex justify-between text-[#1d5e1d]"><dt>Descontos em produtos</dt><dd className="font-bold">− {formatBRL(pricing.itemSavingsCents)}</dd></div>}
      {pricing.couponDiscountCents > 0 && <div className="flex justify-between text-[#1d5e1d]"><dt>Cupom {pricing.couponCode}</dt><dd className="font-bold">− {formatBRL(pricing.couponDiscountCents)}</dd></div>}
      <div className="flex justify-between">
        <dt className="text-muted">Entrega</dt>
        <dd className="font-bold">{shippingLabel === undefined ? <span className="font-semibold text-muted">calculada no checkout</span> : pricing.shippingCents === 0 ? "Grátis" : formatBRL(pricing.shippingCents)}</dd>
      </div>
      {pricing.freeShipping.missingCents != null && pricing.freeShipping.missingCents > 0 && (
        <p className="rounded-xl bg-soft-yellow px-3 py-2 text-xs font-bold">Faltam {formatBRL(pricing.freeShipping.missingCents)} para frete grátis</p>
      )}
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <dt className="text-base font-extrabold">Total</dt>
        <dd className="text-2xl font-extrabold text-primary-dark">{formatBRL(pricing.totalCents)}</dd>
      </div>
    </dl>
  );
}

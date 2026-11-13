import { formatBRL, discountPercent } from "@/lib/money";

export function Price({ priceCents, listPriceCents, size = "md", showSavings = false, hideBadge = false }: { priceCents: number; listPriceCents: number; size?: "sm" | "md" | "lg"; showSavings?: boolean; hideBadge?: boolean }) {
  const off = discountPercent(listPriceCents, priceCents);
  const big = size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-[1.3rem]";
  return (
    <div className="leading-tight">
      {off > 0 && (
        <p className="text-sm text-muted">
          <span className="sr-only">Preço normal: </span><s>{formatBRL(listPriceCents)}</s>
          {!hideBadge && <span className="ml-1.5 chip bg-soft-red !py-0.5 text-promo-ink">-{off}%</span>}
        </p>
      )}
      <p className={`font-display font-extrabold ${big} ${off > 0 ? "text-promo" : "text-ink"}`}>
        {off > 0 && <span className="sr-only">Preço promocional: </span>}{formatBRL(priceCents)}
      </p>
      {showSavings && off > 0 && <p className="text-sm font-bold text-[#1d5e1d]">Você economiza {formatBRL(listPriceCents - priceCents)}</p>}
    </div>
  );
}

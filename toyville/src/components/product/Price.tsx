import { formatBRL, discountPercent } from "@/lib/money";

/**
 * Preço. Só mostra "de/por" e percentual quando o preço atual é realmente menor que o preço de lista.
 * `inline`: preço atual e preço anterior riscado na mesma linha (cards de vitrine).
 */
export function Price({ priceCents, listPriceCents, size = "md", showSavings = false, hideBadge = false, inline = false }: {
  priceCents: number; listPriceCents: number; size?: "sm" | "md" | "lg"; showSavings?: boolean; hideBadge?: boolean; inline?: boolean;
}) {
  const off = discountPercent(listPriceCents, priceCents);
  const big = size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-[1.3rem]";
  if (inline) {
    return (
      <p className="flex flex-wrap items-baseline gap-x-2 leading-tight">
        <span className={`font-extrabold ${big} ${off > 0 ? "text-promo-ink" : "text-ink"}`}>
          {off > 0 && <span className="sr-only">Preço promocional: </span>}{formatBRL(priceCents)}
        </span>
        {off > 0 && <span className="text-sm text-muted"><span className="sr-only">Preço normal: </span><s>{formatBRL(listPriceCents)}</s></span>}
      </p>
    );
  }
  return (
    <div className="leading-tight">
      {off > 0 && (
        <p className="text-sm text-muted">
          <span className="sr-only">Preço normal: </span><s>{formatBRL(listPriceCents)}</s>
          {!hideBadge && <span className="ml-1.5 chip bg-soft-red !py-0.5 text-promo-ink">-{off}%</span>}
        </p>
      )}
      <p className={`font-extrabold ${big} ${off > 0 ? "text-promo" : "text-ink"}`}>
        {off > 0 && <span className="sr-only">Preço promocional: </span>}{formatBRL(priceCents)}
      </p>
      {showSavings && off > 0 && <p className="text-sm font-bold text-[#1d5e1d]">Você economiza {formatBRL(listPriceCents - priceCents)}</p>}
    </div>
  );
}

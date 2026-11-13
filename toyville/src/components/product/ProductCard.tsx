import Link from "next/link";
import type { ProductCard as Card } from "@/server/services/catalog";
import { ProductImage } from "./ProductImage";
import { Price } from "./Price";
import { Rating } from "./Rating";
import { Countdown } from "./Countdown";
import { QuickAdd, FavoriteButton } from "./CardActions";
import { formatAgeRange } from "@/lib/age";
import { discountPercent } from "@/lib/money";

/** Fundo suave da "vitrine" de cada card (estável por produto). A foto usa multiply: fundo branco da foto some no tom. */
const TINTS = ["bg-[#f1f5ff]", "bg-[#fff7e0]", "bg-[#eef8ee]", "bg-[#fbf4ea]"];
function tintFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function ProductCard({ p, favorited = false, priority = false }: { p: Card; favorited?: boolean; priority?: boolean }) {
  const age = formatAgeRange(p.minAgeMonths, p.maxAgeMonths);
  const off = discountPercent(p.listPriceCents, p.priceCents);
  const onSale = off > 0;
  return (
    <article className="group relative flex h-full flex-col rounded-[1.5rem] bg-white p-1.5 shadow-card ring-1 ring-line/70 transition duration-300 hover:-translate-y-1 hover:shadow-pop focus-within:ring-2 focus-within:ring-primary sm:p-2">
      <div className={`relative aspect-square overflow-hidden rounded-[1.15rem] ${tintFor(p.id)}`}>
        <Link href={`/produto/${p.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0">
          <ProductImage src={p.imageUrl} alt={p.imageAlt} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" priority={priority}
            className="p-3 mix-blend-multiply transition duration-500 group-hover:scale-[1.06]" />
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {onSale && <span className="tv-sticker" aria-hidden>-{off}%</span>}
          {p.promotionLabel && onSale && <span className="chip bg-white text-promo-ink shadow-card">{p.promotionLabel}</span>}
        </div>
        {!p.inStock && (
          <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-ink/85 py-1.5 text-center text-xs font-extrabold text-white">Esgotado</span>
        )}
        <FavoriteButton productId={p.id} initial={favorited} className="absolute right-2 top-2 z-10" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-1.5 pb-1.5 pt-3 sm:px-2">
        {p.brandName && <p className="truncate text-[11px] font-extrabold uppercase tracking-wider text-primary">{p.brandName}</p>}
        <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] font-bold leading-snug text-ink">
          <Link href={`/produto/${p.slug}`} className="after:absolute after:inset-0 after:rounded-[1.5rem] after:content-['']">{p.name}</Link>
        </h3>
        {(age || p.ratingAvg != null) && (
          <div className="flex flex-wrap items-center gap-2">
            {age && <span className="chip whitespace-nowrap bg-soft-yellow !text-[11.5px] text-ink">{age}</span>}
            {p.ratingAvg != null && <Rating value={p.ratingAvg} count={p.ratingCount} size={12} />}
          </div>
        )}
        <div className="mt-auto pt-1.5">
          {p.variantCount > 1 && <p className="text-xs text-muted">a partir de</p>}
          <Price priceCents={p.priceCents} listPriceCents={p.listPriceCents} size="sm" hideBadge />
          {onSale && p.promotionEndsAt && <p className="mt-1 text-xs font-bold text-promo-ink"><Countdown endsAt={p.promotionEndsAt.toISOString()} compact /></p>}
        </div>
        <div className="relative z-10 pt-2">
          {p.inStock && p.defaultVariantId ? (
            <QuickAdd variantId={p.defaultVariantId} productName={p.name} priceCents={p.priceCents} />
          ) : (
            <Link href={`/produto/${p.slug}`} className="btn btn-outline btn-sm w-full">{p.inStock ? "Ver opções" : "Ver detalhes"}</Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, favorites = new Set<string>(), priorityFirst = false }: { items: Card[]; favorites?: Set<string>; priorityFirst?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((p, i) => <li key={p.id}><ProductCard p={p} favorited={favorites.has(p.id)} priority={priorityFirst && i < 2} /></li>)}
    </ul>
  );
}

/** Vitrine: desliza no celular; grade a partir do tablet. `compact`: cards de largura fixa (para poucos itens). */
export function ProductRail({ items, favorites = new Set<string>(), compact = false }: { items: Card[]; favorites?: Set<string>; compact?: boolean }) {
  return (
    <ul className={`scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1 sm:mx-0 sm:gap-4 sm:overflow-visible sm:px-0 ${compact ? "sm:[&>li]:w-[230px]" : "sm:grid sm:grid-cols-3 lg:grid-cols-4"}`}>
      {items.map((p) => (
        // Um item só: card maior no celular, sem deixar meia vitrine vazia.
        <li key={p.id} className={`${items.length === 1 ? "w-[68%]" : "w-[47%]"} shrink-0 snap-start sm:w-auto`}><ProductCard p={p} favorited={favorites.has(p.id)} /></li>
      ))}
    </ul>
  );
}

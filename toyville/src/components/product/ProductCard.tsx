import Link from "next/link";
import type { ProductCard as Card } from "@/server/services/catalog";
import { ProductImage } from "./ProductImage";
import { Price } from "./Price";
import { Rating } from "./Rating";
import { Countdown } from "./Countdown";
import { QuickAdd, FavoriteButton } from "./CardActions";
import { formatAgeRange } from "@/lib/age";
import { discountPercent } from "@/lib/money";
import { ScrollRail } from "../ui/ScrollRail";

const SEAL = "rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-wide";
/** Botão do card: discreto em repouso, ganha destaque no hover do card (e é sempre utilizável). */
const ACTION = "btn btn-sm w-full bg-soft-blue text-primary-dark hover:bg-primary hover:text-white group-hover:bg-primary group-hover:text-white";

/**
 * Card editorial: fotografia, nome e preço são os protagonistas.
 * Selos só aparecem com critério verdadeiro: desconto real (preço atual < preço de lista),
 * "Novo" (cadastrado há até NEW_PRODUCT_DAYS dias — regra em services/catalog) e "Mais vendido" (só quando a vitrine informa,
 * com vendas reais). Avaliações só aparecem quando existem.
 * Ação contextual: adiciona direto quando há uma única variação disponível; com variações, leva
 * à página para escolher; esgotado, leva aos detalhes.
 */
export function ProductCard({ p, favorited = false, priority = false, featured = false, bestSeller = false }: {
  p: Card; favorited?: boolean; priority?: boolean; featured?: boolean; bestSeller?: boolean;
}) {
  const age = formatAgeRange(p.minAgeMonths, p.maxAgeMonths);
  const off = discountPercent(p.listPriceCents, p.priceCents);
  const onSale = off > 0;
  return (
    <article className="group relative flex h-full flex-col">
      <div className={`relative overflow-hidden rounded-card bg-sand transition duration-300 ease-brand group-hover:-translate-y-1 group-hover:shadow-lift group-focus-within:ring-2 group-focus-within:ring-primary ${featured ? "aspect-[4/3] lg:aspect-auto lg:min-h-[340px] lg:flex-1" : "aspect-square"}`}>
        <Link href={`/produto/${p.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0">
          <ProductImage src={p.imageUrl} alt={p.imageAlt} sizes={featured ? "(max-width: 1023px) 100vw, 620px" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"} priority={priority}
            className="p-4 mix-blend-multiply transition duration-500 ease-brand group-hover:scale-[1.05]" />
        </Link>
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex max-w-[72%] flex-wrap gap-1.5">
          {onSale && <span className={`${SEAL} bg-promo text-white`} aria-hidden>-{off}%</span>}
          {bestSeller && <span className={`${SEAL} bg-accent text-ink`}>Mais vendido</span>}
          {p.isNew && !onSale && <span className={`${SEAL} bg-ink text-white`}>Novo</span>}
          {p.promotionLabel && onSale && <span className={`${SEAL} bg-white text-promo-ink`}>{p.promotionLabel}</span>}
        </div>
        {!p.inStock && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/80 py-1.5 text-center text-xs font-extrabold text-white">Esgotado</span>
        )}
        <FavoriteButton productId={p.id} initial={favorited} className="absolute right-2.5 top-2.5 z-10" />
      </div>
      <div className="flex flex-col gap-1 px-1 pb-1 pt-3">
        {p.brandName && <p className="truncate text-[11px] font-bold uppercase tracking-[.08em] text-muted">{p.brandName}</p>}
        <h3 className={`line-clamp-2 font-sans font-bold leading-snug tracking-normal text-ink ${featured ? "text-lg sm:text-xl" : "min-h-[2.6em] text-[15px]"}`}>
          <Link href={`/produto/${p.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">{p.name}</Link>
        </h3>
        {(age || p.ratingAvg != null) && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-muted">
            {age && <span>{age}</span>}
            {p.ratingAvg != null && <Rating value={p.ratingAvg} count={p.ratingCount} size={12} />}
          </div>
        )}
        <div className="pt-1.5">
          {p.variantCount > 1 && <p className="text-xs text-muted">a partir de</p>}
          <Price priceCents={p.priceCents} listPriceCents={p.listPriceCents} size={featured ? "md" : "sm"} inline />
          {onSale && p.promotionEndsAt && <p className="mt-1 text-xs font-bold text-promo-ink"><Countdown endsAt={p.promotionEndsAt.toISOString()} compact /></p>}
        </div>
        <div className="relative z-10 pt-2.5">
          {p.inStock && p.defaultVariantId ? (
            <QuickAdd variantId={p.defaultVariantId} productName={p.name} priceCents={p.priceCents} className={ACTION} />
          ) : (
            <Link href={`/produto/${p.slug}`} className={ACTION}>{p.inStock ? "Ver opções" : "Ver produto"}</Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, favorites = new Set<string>(), priorityFirst = false }: { items: Card[]; favorites?: Set<string>; priorityFirst?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((p, i) => <li key={p.id}><ProductCard p={p} favorited={favorites.has(p.id)} priority={priorityFirst && i < 2} /></li>)}
    </ul>
  );
}

/** Vitrine em carrossel horizontal (toque no celular, setas no desktop). */
export function ProductRail({ items, favorites = new Set<string>(), label = "Produtos" }: { items: Card[]; favorites?: Set<string>; label?: string }) {
  return (
    <ScrollRail label={label}>
      {items.map((p) => <ProductCard key={p.id} p={p} favorited={favorites.has(p.id)} />)}
    </ScrollRail>
  );
}

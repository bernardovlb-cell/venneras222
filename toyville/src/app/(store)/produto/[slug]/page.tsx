import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getRelatedProducts } from "@/server/services/catalog";
import { myFavoriteIds } from "@/server/services/favorites";
import { getCurrentUser } from "@/server/auth/session";
import { listShippingMethods, pickupConfigSchema, pickupReady } from "@/server/shipping";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { ProductRail } from "@/components/product/ProductCard";
import { Rating } from "@/components/product/Rating";
import { ReviewForm } from "@/components/product/ReviewForm";
import { Breadcrumb, SectionTitle, Notice } from "@/components/ui/States";
import { JsonLd } from "@/components/JsonLd";
import { formatAgeRange } from "@/lib/age";
import { env } from "@/server/env";
import { StoreIcon, ShieldIcon, CheckIcon } from "@/components/icons";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getProductBySlug(slug);
  if (!d) return { title: "Produto não encontrado", robots: { index: false } };
  const p = d.product;
  const img = d.images[0]?.url;
  return {
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.shortDescription || undefined,
    alternates: { canonical: `/produto/${p.slug}` },
    robots: p.isDemo ? { index: false } : undefined,
    openGraph: { title: p.name, description: p.shortDescription ?? undefined, images: img ? [{ url: img }] : undefined, type: "website" },
  };
}

function Paragraphs({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}</>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const d = await getProductBySlug(slug);
  if (!d) notFound();
  const { product: p, brand, variants, images, breadcrumb, reviews, rating } = d;
  const [favorites, related, user, methods] = await Promise.all([myFavoriteIds(), getRelatedProducts(p.id, p.categoryId), getCurrentUser(), listShippingMethods()]);
  const age = formatAgeRange(p.minAgeMonths, p.maxAgeMonths);
  const pickup = methods.find((m) => m.type === "pickup" && m.isActive);
  const pickupCfg = pickup ? pickupConfigSchema.parse(pickup.config) : null;
  const activeDelivery = methods.filter((m) => m.isActive && m.type !== "pickup");
  const best = variants.reduce((a, b) => (b.priceCents < a.priceCents ? b : a));
  const url = `${env.appUrl}/produto/${p.slug}`;

  const specs = [
    ["Marca", brand?.name], ["Fabricante", p.manufacturer], ["Idade recomendada", age], ["Código de barras (GTIN)", p.gtin],
    ["Dimensões da embalagem", p.lengthCm && p.widthCm && p.heightCm ? `${p.lengthCm} × ${p.widthCm} × ${p.heightCm} cm` : null],
    ["Peso", p.weightGrams ? `${(p.weightGrams / 1000).toLocaleString("pt-BR")} kg` : null], ["Certificações", p.certifications],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="container-tv py-6">
      {!p.isDemo && (
        <JsonLd data={{
          "@context": "https://schema.org", "@type": "Product", name: p.name, sku: p.sku, gtin: p.gtin ?? undefined,
          description: p.shortDescription ?? undefined, image: images.map((i) => (i.url.startsWith("/") ? env.appUrl + i.url : i.url)),
          brand: brand ? { "@type": "Brand", name: brand.name } : undefined,
          offers: variants.map((v) => ({ "@type": "Offer", sku: v.sku, price: (v.priceCents / 100).toFixed(2), priceCurrency: "BRL", availability: v.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url })),
          // nota agregada apenas com avaliações reais aprovadas
          aggregateRating: rating ? { "@type": "AggregateRating", ratingValue: rating.avg, reviewCount: rating.count } : undefined,
        }} />
      )}
      <Breadcrumb items={[{ name: "Início", href: "/" }, ...breadcrumb.map((b) => ({ name: b.name, href: `/c/${b.slug}` })), { name: p.name }]} />
      <div className="mt-4">
        <PurchasePanel productId={p.id} name={p.name} variants={variants} favorited={favorites.has(p.id)}
          images={images.map((i) => ({ id: i.id, url: i.url, thumbUrl: i.thumbUrl, alt: i.alt, width: i.width, height: i.height }))}>
          <div>
            {brand && <p className="text-xs font-extrabold uppercase tracking-wider text-muted">{brand.name}</p>}
            <h1 className="mt-1 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {age && <span className="chip bg-soft-blue text-primary-dark">{age}</span>}
              {rating && <a href="#avaliacoes" className="hover:underline"><Rating value={rating.avg} count={rating.count} /></a>}
            </div>
            {p.shortDescription && <p className="mt-3 text-muted">{p.shortDescription}</p>}
          </div>
        </PurchasePanel>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {pickupCfg && pickupReady(pickupCfg) && (
          <div className="card flex gap-3 p-4">
            <StoreIcon className="mt-0.5 shrink-0 text-primary" />
            <div className="text-sm"><p className="font-extrabold">Retire na loja</p><p className="text-muted">{pickupCfg.address} — {pickupCfg.city}/{pickupCfg.state}. {pickupCfg.hours}</p></div>
          </div>
        )}
        {activeDelivery.length > 0 && (
          <div className="card flex gap-3 p-4">
            <CheckIcon className="mt-0.5 shrink-0 text-success" />
            <p className="text-sm"><span className="font-extrabold">Entrega:</span> <span className="text-muted">opções e valores calculados pelo CEP no checkout.</span></p>
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="desc">
          <h2 id="desc" className="text-2xl font-extrabold text-primary-dark">Descrição</h2>
          <div className="prose-tv mt-2 text-[15px] text-ink/90">{p.description ? <Paragraphs text={p.description} /> : <p className="text-muted">Descrição completa em breve.</p>}</div>
          {p.safetyInfo && (
            <div className="mt-5 flex gap-3 rounded-2xl bg-soft-yellow p-4">
              <ShieldIcon className="shrink-0" />
              <div className="text-sm"><p className="font-extrabold">Informações de segurança</p><p className="mt-1 whitespace-pre-line">{p.safetyInfo}</p></div>
            </div>
          )}
        </section>
        {specs.length > 0 && (
          <section aria-labelledby="spec">
            <h2 id="spec" className="text-2xl font-extrabold text-primary-dark">Informações importantes</h2>
            <dl className="card mt-3 divide-y divide-line text-sm">
              {specs.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted">{k}</dt><dd className="text-right font-bold">{v}</dd></div>)}
            </dl>
          </section>
        )}
      </div>

      <section id="avaliacoes" className="mt-12" aria-labelledby="rev">
        <h2 id="rev" className="text-2xl font-extrabold text-primary-dark">Avaliações</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            {rating ? (
              <div className="card flex items-center gap-4 p-5">
                <p className="font-display text-5xl font-extrabold">{rating.avg.toFixed(1).replace(".", ",")}</p>
                <div><Rating value={rating.avg} size={20} /><p className="text-sm text-muted">{rating.count} {rating.count === 1 ? "avaliação" : "avaliações"}</p></div>
              </div>
            ) : <p className="text-muted">Este produto ainda não tem avaliações.</p>}
            <div className="mt-4">
              {user ? <ReviewForm productId={p.id} /> : <Notice>Para avaliar, <Link href={`/conta/entrar?next=/produto/${p.slug}`} className="underline">entre na sua conta</Link>.</Notice>}
            </div>
          </div>
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Rating value={r.rating} />
                  {r.verifiedPurchase && <span className="chip bg-soft-green text-[#1d5e1d]"><CheckIcon size={12} /> Compra verificada</span>}
                </div>
                {r.title && <p className="mt-2 font-extrabold">{r.title}</p>}
                <p className="mt-1 whitespace-pre-line text-sm">{r.body}</p>
                <p className="mt-2 text-xs text-muted">{r.authorName} · {r.createdAt.toLocaleDateString("pt-BR")}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <SectionTitle title="Você também pode gostar" />
          <ProductRail items={related} favorites={favorites} />
        </section>
      )}
    </div>
  );
}

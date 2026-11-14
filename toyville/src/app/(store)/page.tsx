import { Fragment } from "react";
import { getHomeData, hasActiveProducts } from "@/server/services/catalog";
import { myFavoriteIds } from "@/server/services/favorites";
import { HeroArea, HomeSection, CatalogComingSoon, ShopByAge, ClosingSection, PRODUCT_SECTION_TYPES } from "@/components/home/HomeSections";
import { JsonLd } from "@/components/JsonLd";
import { getSettings } from "@/server/settings";
import { env } from "@/server/env";

/**
 * Home. Ordem e títulos das seções vêm do painel (Conteúdo > Seções); a ordem padrão é
 * banners → categorias → idade → guia de presentes → vitrines → institucional → encerramento.
 * "Compre por idade" acompanha as categorias. Sem nenhum produto ativo, as vitrines dão lugar a
 * um único estado vazio (no ponto onde a primeira vitrine apareceria).
 */
export default async function HomePage() {
  const [{ sections, banners }, favorites, s, anyProduct] = await Promise.all([getHomeData(), myFavoriteIds(), getSettings(), hasActiveProducts()]);
  const emptyCatalog = !anyProduct;
  const isProductSection = (t: string) => (PRODUCT_SECTION_TYPES as readonly string[]).includes(t);
  const firstProductSection = sections.find((x) => isProductSection(x.type))?.id;
  const hasHero = sections.some((x) => x.type === "hero");
  const hasCategories = sections.some((x) => x.type === "categories");
  return (
    <div>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "OnlineStore", name: s.store.name, url: env.appUrl, logo: `${env.appUrl}/brand/logo-480.png` }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", url: env.appUrl, potentialAction: { "@type": "SearchAction", target: `${env.appUrl}/busca?q={q}`, "query-input": "required name=q" } }} />
      {!hasHero && <h1 className="sr-only">{s.store.name}</h1>}
      {sections.map((sec) => {
        if (sec.type === "hero") return <Fragment key={sec.id}><HeroArea banners={banners} />{!hasCategories && <ShopByAge />}</Fragment>;
        if (sec.type === "categories") return <Fragment key={sec.id}><HomeSection s={sec} favorites={favorites} /><ShopByAge /></Fragment>;
        if (emptyCatalog && isProductSection(sec.type)) return sec.id === firstProductSection ? <CatalogComingSoon key={sec.id} /> : null;
        return <HomeSection key={sec.id} s={sec} favorites={favorites} />;
      })}
      <ClosingSection />
    </div>
  );
}

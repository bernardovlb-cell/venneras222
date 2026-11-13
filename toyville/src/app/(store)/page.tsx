import { Fragment } from "react";
import { getHomeData, hasActiveProducts } from "@/server/services/catalog";
import { myFavoriteIds } from "@/server/services/favorites";
import { Hero, HomeSection, CatalogComingSoon, ShopByAge } from "@/components/home/HomeSections";
import { JsonLd } from "@/components/JsonLd";
import { getSettings } from "@/server/settings";
import { env } from "@/server/env";

export default async function HomePage() {
  const [{ sections, banners }, favorites, s, anyProduct] = await Promise.all([getHomeData(), myFavoriteIds(), getSettings(), hasActiveProducts()]);
  const heroBanners = banners.filter((b) => b.placement === "hero");
  const emptyCatalog = !anyProduct;
  return (
    <div className="flex flex-col gap-10 pb-4 sm:gap-14">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "OnlineStore", name: s.store.name, url: env.appUrl, logo: `${env.appUrl}/brand/logo-480.png` }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", url: env.appUrl, potentialAction: { "@type": "SearchAction", target: `${env.appUrl}/busca?q={q}`, "query-input": "required name=q" } }} />
      {sections.map((sec) =>
        sec.type === "hero" ? (
          <Fragment key={sec.id}>
            <Hero items={heroBanners} />
            <ShopByAge />
          </Fragment>
        ) : (
          <Fragment key={sec.id}>
            <HomeSection s={sec} favorites={favorites} />
            {emptyCatalog && sec.type === "categories" && <CatalogComingSoon />}
          </Fragment>
        ),
      )}
      {emptyCatalog && !sections.some((x) => x.type === "categories") && <CatalogComingSoon />}
      {!sections.some((x) => x.type === "hero") && <h1 className="sr-only">{s.store.name}</h1>}
    </div>
  );
}

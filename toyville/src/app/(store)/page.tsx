import { getHomeData } from "@/server/services/catalog";
import { myFavoriteIds } from "@/server/services/favorites";
import { Hero, HomeSection } from "@/components/home/HomeSections";
import { JsonLd } from "@/components/JsonLd";
import { getSettings } from "@/server/settings";
import { env } from "@/server/env";

export default async function HomePage() {
  const [{ sections, banners }, favorites, s] = await Promise.all([getHomeData(), myFavoriteIds(), getSettings()]);
  const heroBanners = banners.filter((b) => b.placement === "hero");
  return (
    <div className="flex flex-col gap-12 pb-4 sm:gap-16">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "OnlineStore", name: s.store.name, url: env.appUrl, logo: `${env.appUrl}/brand/logo-480.png` }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", url: env.appUrl, potentialAction: { "@type": "SearchAction", target: `${env.appUrl}/busca?q={q}`, "query-input": "required name=q" } }} />
      {sections.map((sec) =>
        sec.type === "hero" ? <Hero key={sec.id} items={heroBanners} /> : <HomeSection key={sec.id} s={sec} favorites={favorites} />,
      )}
      {!sections.some((x) => x.type === "hero") && <h1 className="sr-only">{s.store.name}</h1>}
    </div>
  );
}

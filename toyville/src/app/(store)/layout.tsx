import { sql } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { ConsentAndAnalytics } from "@/components/consent/ConsentAndAnalytics";
import { WhatsAppIcon } from "@/components/icons";
import { getSettings, whatsappLink } from "@/server/settings";
import { db } from "@/server/db/client";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const wa = whatsappLink(s.whatsapp);
  const demo = (await db.execute<{ n: number }>(sql`select count(*)::int as n from products where is_demo and status = 'active'`)).rows[0]?.n ?? 0;
  return (
    <ToastProvider>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Pular para o conteúdo</a>
      {demo > 0 && (
        <aside aria-label="Aviso de demonstração" className="bg-ink px-4 py-1.5 text-center text-xs font-bold text-white">
          Ambiente com <span className="text-accent">dados de demonstração</span> — produtos marcados com [DEMO] não estão à venda.
        </aside>
      )}
      <Header />
      <main id="conteudo" className="min-h-[60vh]">{children}</main>
      <Footer />
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Falar com a ToyVille pelo WhatsApp"
          className="fixed bottom-4 right-4 z-50 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-pop transition hover:scale-105 sm:bottom-6 sm:right-6">
          <WhatsAppIcon size={30} />
        </a>
      )}
      <ConsentAndAnalytics ga4Id={s.analytics.ga4Id} gtmId={s.analytics.gtmId} metaPixelId={s.analytics.metaPixelId} />
    </ToastProvider>
  );
}

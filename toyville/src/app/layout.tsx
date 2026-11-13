import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { getSettings } from "@/server/settings";
import { env } from "@/server/env";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-baloo", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-nunito", display: "swap" });

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(env.appUrl),
    title: { default: s.seo.defaultTitle, template: `%s | ${s.store.name}` },
    description: s.seo.defaultDescription,
    applicationName: s.store.name,
    openGraph: { type: "website", siteName: s.store.name, locale: "pt_BR", images: [{ url: "/brand/logo-480.png", width: 480, height: 240, alt: s.store.name }] },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = { themeColor: "#1f4fd1", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { brand } = await getSettings();
  // Cores configuráveis no painel (validadas como #RRGGBB no servidor antes de salvar).
  const tokens = `:root{--tv-primary:${brand.primary};--tv-primary-dark:${brand.primaryDark};--tv-accent:${brand.accent};--tv-promo:${brand.promo};--tv-success:${brand.success};--tv-bg:${brand.background}}`;
  return (
    <html lang="pt-BR" className={`${baloo.variable} ${nunito.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokens }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

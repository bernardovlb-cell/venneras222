import type { Metadata, Viewport } from "next";
import { Inter, Tenor_Sans } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { TopBar } from "@/components/layout/TopBar";
import { site } from "@/config/site";
import "./globals.css";

const tenor = Tenor_Sans({ weight: "400", subsets: ["latin"], variable: "--font-tenor", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Venneras — Curadoria de bolsas femininas", template: "%s | Venneras" },
  description: "Curadoria Venneras de bolsas femininas: crossbody, mochilas e carteiras. Rio de Janeiro.",
};

export const viewport: Viewport = { themeColor: "#121212" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${tenor.variable} ${inter.variable}`}>
      <body className="antialiased">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-3">
          Pular para o conteúdo
        </a>
        <CartProvider>
          <TopBar />
          <Header />
          <main id="conteudo">{children}</main>
          <Footer />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}

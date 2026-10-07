import Link from "next/link";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { PaymentBadges } from "@/components/PaymentBadges";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { site, whatsappUrl } from "@/config/site";

const links = [
  { href: "/colecao", label: "Coleção" },
  { href: "/sobre", label: "Sobre" },
  { href: "/ajuda", label: "Ajuda" },
  { href: "/politicas/trocas", label: "Trocas e devoluções" },
  { href: "/politicas/privacidade", label: "Privacidade" },
  { href: "/politicas/termos", label: "Termos de uso" },
];

export function Footer() {
  const wa = whatsappUrl();
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-14 md:grid-cols-[1fr_2fr] lg:px-10 lg:py-20">
        <div className="flex flex-col items-center gap-3 md:items-start">
          <Logo tom="branco" forcar="empilhado" className="md:justify-start" />
          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-paper/70">{site.assinatura}</span>
        </div>

        <div className="grid gap-10 sm:grid-cols-2">
          <nav aria-label="Rodapé">
            <p className="label mb-4 text-paper/70">Navegue</p>
            <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center text-sm hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="label mb-4 text-paper/70">Fale com a gente</p>
            <ul className="space-y-1">
              <li>
                <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm hover:underline">
                  <InstagramIcon className="size-5" /> Instagram {site.instagramHandle}
                </a>
              </li>
              {wa && (
                <li>
                  <WhatsAppLink origem="rodape" className="inline-flex min-h-11 items-center gap-2 text-sm hover:underline">
                    <WhatsAppIcon className="size-5" /> WhatsApp
                  </WhatsAppLink>
                </li>
              )}
            </ul>
            <p className="label mb-3 mt-8 text-paper/70">Pagamento</p>
            <PaymentBadges />
          </div>
        </div>
      </div>

      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-4 py-6 text-xs text-paper/70 sm:flex-row sm:justify-between lg:px-10">
          <p>
            {site.razaoSocial} · CNPJ {site.cnpj}
          </p>
          <p>© {new Date().getFullYear()} Venneras. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

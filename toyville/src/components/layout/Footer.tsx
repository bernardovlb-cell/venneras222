import Link from "next/link";
import { getSettings, whatsappLink } from "@/server/settings";
import { getNavCategories } from "@/server/services/catalog";
import { NEWSLETTER_CONSENT_TEXT } from "@/server/services/newsletter";
import { mercadoPagoMode } from "@/server/env";
import { Logo } from "../Logo";
import { CookiePreferencesLink } from "../consent/CookiePreferencesLink";
import { NewsletterForm } from "./NewsletterForm";
import { InstagramIcon, FacebookIcon, TikTokIcon, YouTubeIcon, WhatsAppIcon } from "../icons";

const SOCIAL = { instagram: { label: "Instagram", Icon: InstagramIcon }, facebook: { label: "Facebook", Icon: FacebookIcon }, tiktok: { label: "TikTok", Icon: TikTokIcon }, youtube: { label: "YouTube", Icon: YouTubeIcon } } as const;

const link = "inline-flex min-h-[32px] items-center text-white/85 transition hover:text-accent";

/**
 * Rodapé: área principal azul (marca, newsletter, redes, links) + base clara com os dados legais.
 * Só mostra o que está configurado: redes sociais com URL https, contatos preenchidos e a menção
 * ao meio de pagamento quando ele está de fato configurado.
 */
export async function Footer() {
  const [s, cats] = await Promise.all([getSettings(), getNavCategories()]);
  const wa = whatsappLink(s.whatsapp);
  const socials = (Object.keys(SOCIAL) as (keyof typeof SOCIAL)[]).map((k) => ({ k, url: s.social[k] })).filter((x) => /^https:\/\/\S+$/.test(x.url));
  const paymentsReady = mercadoPagoMode() !== "not_configured";
  return (
    <footer className="mt-20">
      <div className="bg-primary-dark text-white">
        <div className="container-tv py-12 lg:py-14">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-16">
            <div>
              {/* A logo oficial tem fundo branco (sem transparência): fica num selo branco justo, sem alterar a arte. */}
              <div className="inline-block rounded-2xl bg-white p-1.5"><Logo src={s.brand.logoUrl} width={s.brand.logoWidth} height={s.brand.logoHeight} className="w-[120px] sm:w-[132px]" /></div>
              <p className="mt-4 max-w-sm text-white/85">{s.seo.defaultDescription}</p>
              {(socials.length > 0 || wa) && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold">Acompanhe a ToyVille</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {socials.map(({ k, url }) => {
                      const { label, Icon } = SOCIAL[k];
                      return <li key={k}><a href={url} target="_blank" rel="noopener noreferrer" aria-label={`ToyVille no ${label}`} className="grid size-11 place-items-center rounded-full bg-white/10 transition hover:bg-accent hover:text-ink"><Icon size={22} /></a></li>;
                    })}
                    {wa && <li><a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Falar com a ToyVille pelo WhatsApp" className="grid size-11 place-items-center rounded-full bg-white/10 transition hover:bg-accent hover:text-ink"><WhatsAppIcon size={22} /></a></li>}
                  </ul>
                </div>
              )}
            </div>
            {s.home.newsletterEnabled && (
              <div className="rounded-panel bg-white/[0.08] p-5 ring-1 ring-inset ring-white/15 sm:p-7">
                <h2 className="text-2xl font-semibold leading-tight">Receba as novidades da ToyVille</h2>
                <p className="mt-1.5 text-white/85">Lançamentos e ofertas direto no seu e-mail.</p>
                <div className="mt-4"><NewsletterForm consentText={NEWSLETTER_CONSENT_TEXT} /></div>
                <p className="mt-1 text-xs text-white/70">Seus dados são usados só para isso. Veja a <Link href="/p/politica-de-privacidade" className="underline underline-offset-2 hover:text-accent">política de privacidade</Link>.</p>
              </div>
            )}
          </div>

          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-9 border-t border-white/15 pt-10 text-sm lg:grid-cols-4">
            <nav aria-label="Comprar, no rodapé">
              <h2 className="text-lg font-semibold">Comprar</h2>
              <ul className="mt-2.5">
                <li><Link className={link} href="/categorias">Todas as categorias</Link></li>
                <li><Link className={link} href="/busca?ordem=newest">Lançamentos</Link></li>
                <li><Link className={link} href="/ofertas">Ofertas</Link></li>
                <li><Link className={link} href="/presentes">Guia de presentes</Link></li>
              </ul>
            </nav>
            <nav aria-label="Categorias no rodapé">
              <h2 className="text-lg font-semibold">Categorias</h2>
              <ul className="mt-2.5">
                {cats.slice(0, 6).map((c) => <li key={c.id}><Link className={link} href={`/c/${c.slug}`}>{c.name}</Link></li>)}
                {cats.length > 6 && <li><Link className={`${link} font-bold`} href="/categorias">Ver todas</Link></li>}
              </ul>
            </nav>
            <nav aria-label="A ToyVille, no rodapé">
              <h2 className="text-lg font-semibold">A ToyVille</h2>
              <ul className="mt-2.5">
                <li><Link className={link} href="/p/sobre">Sobre a ToyVille</Link></li>
                <li><Link className={link} href="/p/trocas-e-devolucoes">Trocas e devoluções</Link></li>
                <li><Link className={link} href="/p/politica-de-entregas">Política de entregas</Link></li>
                <li><Link className={link} href="/p/politica-de-privacidade">Política de privacidade</Link></li>
                <li><Link className={link} href="/p/termos-de-uso">Termos de uso</Link></li>
              </ul>
            </nav>
            <div>
              <h2 className="text-lg font-semibold">Atendimento</h2>
              <ul className="mt-2.5">
                <li><Link className={link} href="/atendimento">Abrir uma solicitação</Link></li>
                {wa && <li><a className={link} href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
                {s.store.email && <li><a className={`${link} break-all`} href={`mailto:${s.store.email}`}>{s.store.email}</a></li>}
                {s.store.phone && <li className="flex min-h-[32px] items-center text-white/85">{s.store.phone}</li>}
                {s.store.businessHours && <li className="flex min-h-[32px] items-center text-white/85">{s.store.businessHours}</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-cream text-ink">
        <div className="container-tv flex flex-col gap-2 py-5 text-[13px] text-muted lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <p>
            © {new Date().getFullYear()} {s.store.legalName || s.store.name}
            {s.store.cnpj && <> · CNPJ {s.store.cnpj}</>}
            {s.store.address && <> · {s.store.address}</>}
          </p>
          <p className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
            {paymentsReady && <span>Pagamentos processados pelo Mercado Pago.</span>}
            <CookiePreferencesLink className="min-h-[32px] text-left font-bold underline underline-offset-2 hover:text-ink" />
          </p>
        </div>
      </div>
    </footer>
  );
}

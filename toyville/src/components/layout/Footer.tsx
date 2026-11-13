import Link from "next/link";
import { getSettings, whatsappLink } from "@/server/settings";
import { getNavCategories } from "@/server/services/catalog";
import { Logo } from "../Logo";
import { CookiePreferencesLink } from "../consent/CookiePreferencesLink";

export async function Footer() {
  const [s, cats] = await Promise.all([getSettings(), getNavCategories()]);
  const wa = whatsappLink(s.whatsapp);
  const socials = Object.entries(s.social).filter(([, v]) => v);
  return (
    <footer className="mt-16 bg-primary-dark text-white">
      <div aria-hidden className="h-3 w-full bg-[repeating-linear-gradient(90deg,var(--tv-promo)_0_25%,var(--tv-accent)_25%_50%,var(--tv-success)_50%_75%,var(--tv-primary)_75%_100%)] bg-[length:160px_100%]" />
      <div className="container-tv grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="inline-block rounded-2xl bg-white p-2"><Logo src={s.brand.logoUrl} width={s.brand.logoWidth} height={s.brand.logoHeight} className="w-[140px]" /></div>
          {s.store.tagline && <p className="mt-3 max-w-xs text-sm text-white/80">{s.store.tagline}</p>}
        </div>
        <div>
          <h2 className="text-lg font-extrabold">Categorias</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            {cats.slice(0, 8).map((c) => <li key={c.id}><Link className="hover:text-accent" href={`/c/${c.slug}`}>{c.name}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-extrabold">Ajuda e políticas</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            <li><Link className="hover:text-accent" href="/atendimento">Atendimento</Link></li>
            <li><Link className="hover:text-accent" href="/p/trocas-e-devolucoes">Trocas e devoluções</Link></li>
            <li><Link className="hover:text-accent" href="/p/politica-de-entregas">Política de entregas</Link></li>
            <li><Link className="hover:text-accent" href="/p/politica-de-privacidade">Política de privacidade</Link></li>
            <li><Link className="hover:text-accent" href="/p/termos-de-uso">Termos de uso</Link></li>
            <li><Link className="hover:text-accent" href="/p/sobre">Sobre a ToyVille</Link></li>
            <li><CookiePreferencesLink /></li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-extrabold">Fale com a gente</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            {wa && <li><a className="hover:text-accent" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
            {s.store.email && <li><a className="hover:text-accent" href={`mailto:${s.store.email}`}>{s.store.email}</a></li>}
            {s.store.phone && <li>{s.store.phone}</li>}
            {s.store.businessHours && <li>{s.store.businessHours}</li>}
            <li><Link className="hover:text-accent" href="/atendimento">Abrir uma solicitação</Link></li>
          </ul>
          {socials.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2 text-sm">
              {socials.map(([k, v]) => <li key={k}><a href={v} target="_blank" rel="noopener noreferrer" className="chip bg-white/10 capitalize hover:bg-white/20">{k}</a></li>)}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="container-tv flex flex-col gap-2 py-5 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {s.store.legalName || s.store.name}
            {s.store.cnpj && <> · CNPJ {s.store.cnpj}</>}
            {s.store.address && <> · {s.store.address}</>}
          </p>
          <p>Pagamentos processados pelo Mercado Pago.</p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { Logo } from "../Logo";
import { SearchBox } from "./SearchBox";
import { MobileMenu } from "./MobileMenu";
import { CartIcon, HeartIcon, UserIcon, GiftIcon, BoltIcon, MenuIcon, ChevronDown } from "../icons";
import { CategoryArt } from "../art/ToyArt";
import { getNavCategories } from "@/server/services/catalog";
import { cartCount } from "@/server/services/cart";
import { getCurrentUser } from "@/server/auth/session";
import { getSettings } from "@/server/settings";

const MEGA_TONE = ["bg-soft-blue", "bg-soft-yellow", "bg-soft-green", "bg-[#ffeadb]"];
/** Quantas categorias cabem na barra antes de irem só para "Todas as categorias" (evita quebra em duas linhas). */
const visibleAt = (i: number) => (i < 2 ? "hidden lg:block" : i < 4 ? "hidden xl:block" : "hidden");

export async function Header() {
  const [cats, count, user, s] = await Promise.all([getNavCategories(), cartCount(), getCurrentUser(), getSettings()]);
  const firstName = user?.name.split(" ")[0];
  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="container-tv flex items-center gap-1.5 py-1 sm:gap-3 sm:py-2 lg:gap-6 lg:py-2.5">
        <MobileMenu categories={cats} loggedIn={!!user} />
        <Logo src={s.brand.logoUrl} width={s.brand.logoWidth} height={s.brand.logoHeight} priority className="w-[112px] transition hover:scale-[1.03] sm:w-[140px] lg:w-[168px]" />
        <div className="hidden flex-1 lg:block"><SearchBox /></div>
        <nav aria-label="Atalhos" className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
          <Link href={user ? "/conta" : "/conta/entrar"} className="btn btn-ghost !min-h-[44px] !px-2.5 sm:!px-3" aria-label={user ? "Minha conta" : "Entrar"}>
            <UserIcon size={24} />
            <span className="hidden text-left leading-tight xl:block">
              <span className="block text-[11px] font-bold text-muted">{user ? `Olá, ${firstName}` : "Olá! Entre ou"}</span>
              <span className="block text-sm">{user ? "Minha conta" : "cadastre-se"}</span>
            </span>
          </Link>
          <Link href="/conta/favoritos" className="btn btn-ghost hidden !min-h-[44px] !px-3 sm:inline-flex" aria-label="Favoritos"><HeartIcon size={24} /></Link>
          <Link href="/carrinho" aria-label={`Carrinho, ${count} ${count === 1 ? "item" : "itens"}`}
            className="relative inline-flex min-h-[44px] items-center gap-2 rounded-full bg-soft-blue px-3 font-extrabold text-primary-dark transition hover:bg-primary hover:text-white sm:px-4">
            <CartIcon size={24} />
            <span className="hidden text-sm lg:inline">Carrinho</span>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-promo px-1 text-[11px] font-extrabold leading-5 text-white ring-2 ring-white">{count > 99 ? "99+" : count}</span>
            )}
          </Link>
        </nav>
      </div>
      <div className="container-tv pb-2 lg:hidden"><SearchBox /></div>
      <nav aria-label="Categorias" className="hidden border-t border-line/60 lg:block">
        <ul className="container-tv flex items-center gap-1 py-1.5 text-[14px] font-bold">
          <li className="group relative">
            <button type="button" aria-haspopup="true" className="flex min-h-[40px] items-center gap-2 rounded-full bg-primary px-4 text-white shadow-[0_3px_0_var(--tv-primary-dark)] transition hover:bg-primary-dark">
              <MenuIcon size={18} /> Todas as categorias <ChevronDown size={16} className="transition group-focus-within:rotate-180 group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-0 top-full z-50 w-[min(880px,calc(100vw-3rem))] translate-y-2 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <ul className="grid grid-cols-3 gap-1.5 rounded-3xl border border-line bg-white p-3 shadow-pop xl:grid-cols-4">
                {cats.map((c, i) => (
                  <li key={c.id}>
                    <Link href={`/c/${c.slug}`} className="group/item flex items-center gap-3 rounded-2xl p-2 hover:bg-cream">
                      <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${MEGA_TONE[i % MEGA_TONE.length]}`}>
                        <CategoryArt slug={c.slug} className="size-12 transition group-hover/item:scale-110" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-extrabold leading-tight">{c.name}</span>
                        {c.children.length > 0 && <span className="block truncate text-xs font-semibold text-muted">{c.children.slice(0, 3).map((ch) => ch.name).join(" · ")}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </li>
          <li><Link href="/ofertas" className="flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-promo-ink hover:bg-soft-red"><BoltIcon size={16} /> Ofertas</Link></li>
          <li><Link href="/presentes" className="flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-primary-dark hover:bg-soft-yellow"><GiftIcon size={18} /> Presentes</Link></li>
          <li><Link href="/busca?ordem=newest" className="flex min-h-[40px] items-center whitespace-nowrap rounded-full px-3 hover:bg-soft-blue hover:text-primary-dark">Lançamentos</Link></li>
          {cats.length > 0 && <li aria-hidden className="mx-1 hidden h-5 w-px bg-line lg:block" />}
          {cats.map((c, i) => (
            <li key={c.id} className={`group/cat relative ${visibleAt(i)}`}>
              <Link href={`/c/${c.slug}`} className="flex min-h-[40px] max-w-[13rem] items-center truncate whitespace-nowrap rounded-full px-3 hover:bg-soft-blue hover:text-primary-dark">{c.name}</Link>
              {c.children.length > 0 && (
                <ul className="invisible absolute left-0 top-full z-50 min-w-52 translate-y-1 rounded-2xl border border-line bg-white p-2 opacity-0 shadow-pop transition group-focus-within/cat:visible group-focus-within/cat:translate-y-0 group-focus-within/cat:opacity-100 group-hover/cat:visible group-hover/cat:translate-y-0 group-hover/cat:opacity-100">
                  {c.children.map((ch) => <li key={ch.id}><Link href={`/c/${ch.slug}`} className="block rounded-xl px-3 py-2 font-semibold hover:bg-cream">{ch.name}</Link></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div aria-hidden className="tv-awning pointer-events-none absolute inset-x-0 top-full" />
    </header>
  );
}

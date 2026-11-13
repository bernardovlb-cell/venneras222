import Link from "next/link";
import { Logo } from "../Logo";
import { SearchBox } from "./SearchBox";
import { MobileMenu } from "./MobileMenu";
import { CartIcon, HeartIcon, UserIcon, GiftIcon, BoltIcon } from "../icons";
import { getNavCategories } from "@/server/services/catalog";
import { cartCount } from "@/server/services/cart";
import { getCurrentUser } from "@/server/auth/session";
import { getSettings } from "@/server/settings";

export async function Header() {
  const [cats, count, user, s] = await Promise.all([getNavCategories(), cartCount(), getCurrentUser(), getSettings()]);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-tv flex items-center gap-2 py-2 lg:gap-6 lg:py-3">
        <MobileMenu categories={cats} loggedIn={!!user} />
        <Logo src={s.brand.logoUrl} width={s.brand.logoWidth} height={s.brand.logoHeight} priority className="w-[112px] sm:w-[128px] lg:w-[150px]" />
        <div className="hidden flex-1 lg:block"><SearchBox /></div>
        <nav aria-label="Atalhos" className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <Link href={user ? "/conta" : "/conta/entrar"} className="btn btn-ghost !px-2.5 sm:!px-3" aria-label={user ? "Minha conta" : "Entrar"}>
            <UserIcon /><span className="hidden text-sm xl:inline">{user ? `Olá, ${user.name.split(" ")[0]}` : "Entrar"}</span>
          </Link>
          <Link href="/conta/favoritos" className="btn btn-ghost hidden !px-3 sm:inline-flex" aria-label="Favoritos"><HeartIcon /></Link>
          <Link href="/carrinho" className="btn btn-ghost relative !px-2.5 sm:!px-3" aria-label={`Carrinho, ${count} ${count === 1 ? "item" : "itens"}`}>
            <CartIcon />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-promo px-1 text-[11px] font-extrabold leading-5 text-white ring-2 ring-white">{count > 99 ? "99+" : count}</span>
            )}
          </Link>
        </nav>
      </div>
      <div className="container-tv pb-2.5 lg:hidden"><SearchBox /></div>
      <nav aria-label="Categorias" className="hidden border-t border-line/70 lg:block">
        <ul className="container-tv flex flex-wrap items-center gap-x-0.5 py-1.5 text-[13.5px] font-bold xl:text-[14px]">
          <li><Link href="/ofertas" className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-promo hover:bg-soft-red"><BoltIcon size={16} /> Ofertas</Link></li>
          <li><Link href="/presentes" className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-primary-dark hover:bg-soft-yellow"><GiftIcon size={18} /> Presentes</Link></li>
          {cats.map((c) => (
            <li key={c.id} className="group relative">
              <Link href={`/c/${c.slug}`} className="block whitespace-nowrap rounded-full px-3 py-2 hover:bg-soft-blue hover:text-primary-dark">{c.name}</Link>
              {c.children.length > 0 && (
                <ul className="invisible absolute left-0 top-full z-50 min-w-52 translate-y-1 rounded-2xl border border-line bg-white p-2 opacity-0 shadow-pop transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {c.children.map((ch) => <li key={ch.id}><Link href={`/c/${ch.slug}`} className="block rounded-xl px-3 py-2 font-semibold hover:bg-cream">{ch.name}</Link></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

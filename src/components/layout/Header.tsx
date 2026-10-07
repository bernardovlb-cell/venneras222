import Link from "next/link";
import { Logo } from "@/components/Logo";
import { site } from "@/config/site";
import { HeaderActions } from "./HeaderActions";
import { NavLinks } from "./NavLinks";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto grid max-w-[1440px] grid-cols-[88px_1fr_88px] items-center px-4 py-2 lg:grid-cols-[1fr_360px_1fr] lg:px-10 lg:py-3">
        <nav aria-label="Principal" className="hidden lg:block">
          <NavLinks className="-ml-2 gap-4" />
        </nav>
        <span className="lg:hidden" />
        <Link href="/" aria-label="Venneras — página inicial" className="flex min-h-11 flex-col items-center justify-center gap-1.5">
          <Logo />
          <span className="text-[10px] font-medium uppercase leading-none tracking-[0.3em] text-muted">
            {site.assinatura}
          </span>
        </Link>
        <HeaderActions />
      </div>
      <nav aria-label="Principal" className="border-t border-line lg:hidden">
        <NavLinks className="justify-center gap-1 overflow-x-auto px-2" />
      </nav>
    </header>
  );
}

import Link from "next/link";
import { requireUserPage } from "@/server/auth/guards";
import { logoutAction } from "@/app/actions/account";

const NAV = [
  ["/conta", "Resumo"], ["/conta/pedidos", "Pedidos"], ["/conta/favoritos", "Favoritos"], ["/conta/enderecos", "Endereços"],
  ["/conta/atendimentos", "Atendimentos"], ["/conta/dados", "Meus dados e privacidade"],
] as const;

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUserPage("/conta");
  return (
    <div className="container-tv py-6">
      <p className="text-sm font-bold text-muted">Olá, {u.name.split(" ")[0]}!</p>
      <div className="mt-3 grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Minha conta" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
          {NAV.map(([href, label]) => <Link key={href} href={href} className="chip shrink-0 bg-white !px-4 !py-2.5 text-sm shadow-card hover:bg-soft-blue lg:rounded-xl lg:shadow-none">{label}</Link>)}
          {u.isStaff && <Link href="/admin" className="chip shrink-0 bg-primary !px-4 !py-2.5 text-sm text-white lg:rounded-xl">Painel administrativo</Link>}
          <form action={logoutAction}><button className="chip w-full shrink-0 bg-white !px-4 !py-2.5 text-left text-sm text-promo shadow-card lg:rounded-xl lg:shadow-none">Sair</button></form>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/server/auth/guards";
import { myOrders, myTickets } from "@/server/services/customer";
import { formatOrderNumber } from "@/server/services/orders";
import { StatusBadge } from "@/components/order/OrderView";
import { formatBRL } from "@/lib/money";
import { Notice } from "@/components/ui/States";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const u = await requireUserPage();
  const [orders, tickets] = await Promise.all([myOrders(u.id), myTickets(u.id)]);
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      {sp.senha === "redefinida" && <Notice kind="success">Senha redefinida com sucesso.</Notice>}
      <h1 className="text-3xl font-extrabold text-primary-dark">Minha conta</h1>
      <section className="card p-5">
        <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Últimos pedidos</h2><Link href="/conta/pedidos" className="text-sm font-bold text-primary">Ver todos →</Link></div>
        {orders.length === 0 ? <p className="mt-2 text-muted">Você ainda não fez pedidos com esta conta.</p> : (
          <ul className="mt-3 divide-y divide-line">
            {orders.slice(0, 3).map((o) => (
              <li key={o.id}><Link href={`/conta/pedidos/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary">
                <span className="font-bold">{formatOrderNumber(o.number)}</span><StatusBadge status={o.status} /><span className="font-extrabold">{formatBRL(o.totalCents)}</span>
              </Link></li>
            ))}
          </ul>
        )}
      </section>
      <section className="card p-5">
        <h2 className="text-lg font-extrabold">Atendimentos abertos</h2>
        <p className="mt-1 text-sm text-muted">{tickets.filter((t) => t.status !== "closed" && t.status !== "resolved").length} em andamento · <Link href="/conta/atendimentos" className="font-bold text-primary">ver</Link></p>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/server/auth/guards";
import { myOrders } from "@/server/services/customer";
import { formatOrderNumber } from "@/server/services/orders";
import { StatusBadge } from "@/components/order/OrderView";
import { EmptyState } from "@/components/ui/States";
import { formatBRL } from "@/lib/money";
import { FULFILLMENT_LABEL } from "@/lib/payment-status";

export const metadata: Metadata = { title: "Meus pedidos", robots: { index: false } };

export default async function MyOrders() {
  const u = await requireUserPage("/conta/pedidos");
  const orders = await myOrders(u.id);
  if (!orders.length) return <EmptyState title="Nenhum pedido ainda" text="Pedidos feitos sem login são acompanhados pelo link enviado ao e-mail." action={{ href: "/", label: "Começar a comprar" }} emoji="📦" />;
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-primary-dark">Meus pedidos</h1>
      <ul className="mt-4 space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/conta/pedidos/${o.id}`} className="card flex flex-wrap items-center gap-3 p-4 transition hover:shadow-pop">
              <div className="flex-1">
                <p className="font-extrabold">{formatOrderNumber(o.number)}</p>
                <p className="text-sm text-muted">{o.createdAt.toLocaleDateString("pt-BR")} · {o.status === "paid" || o.status === "completed" ? FULFILLMENT_LABEL[o.fulfillmentStatus] : ""}</p>
              </div>
              <StatusBadge status={o.status} />
              <span className="font-extrabold">{formatBRL(o.totalCents)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

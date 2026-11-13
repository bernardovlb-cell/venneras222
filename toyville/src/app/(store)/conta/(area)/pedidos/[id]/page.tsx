import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserPage } from "@/server/auth/guards";
import { getOrderForViewer, formatOrderNumber } from "@/server/services/orders";
import { OrderView } from "@/components/order/OrderView";

export default async function MyOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUserPage(`/conta/pedidos/${id}`);
  const data = await getOrderForViewer(id, { userId: u.id });
  if (!data) notFound();
  const o = data.order;
  const delivered = o.fulfillmentStatus === "delivered";
  return (
    <div className="space-y-4">
      <Link href="/conta/pedidos" className="text-sm font-bold text-primary">← Meus pedidos</Link>
      <OrderView data={data} />
      {(o.status === "paid" || o.status === "completed") && (
        <div className="card flex flex-wrap gap-2 p-5">
          <p className="w-full text-sm text-muted">Precisa de ajuda com este pedido?</p>
          {delivered && <Link href={`/atendimento?tipo=withdrawal&pedido=${formatOrderNumber(o.number)}`} className="btn btn-outline btn-sm">Desistir da compra (7 dias)</Link>}
          <Link href={`/atendimento?tipo=exchange&pedido=${formatOrderNumber(o.number)}`} className="btn btn-outline btn-sm">Solicitar troca</Link>
          <Link href={`/atendimento?tipo=return&pedido=${formatOrderNumber(o.number)}`} className="btn btn-outline btn-sm">Produto com defeito</Link>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { requireStaffPage } from "@/server/auth/guards";
import { listOrders } from "@/server/services/admin";
import { formatOrderNumber } from "@/server/services/orders";
import { PageHead, Table, Badge } from "@/components/admin/server-ui";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, FULFILLMENT_LABEL, type InternalPaymentStatus } from "@/lib/payment-status";

type SP = { q?: string; status?: string; pagamento?: string; entrega?: string; pagina?: string };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaffPage("orders.read");
  const sp = await searchParams;
  const { rows, total, page, pages } = await listOrders({ q: sp.q, status: sp.status, payment: sp.pagamento, fulfillment: sp.entrega, page: Number(sp.pagina) || 1 });
  const tone = (s: string) => (s === "paid" || s === "completed" ? "green" : s === "cancelled" || s === "needs_attention" ? "red" : "yellow") as "green";
  return (
    <div>
      <PageHead title="Pedidos" subtitle={`${total} pedido(s)`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Nº, nome ou e-mail" className="field !min-h-[40px] max-w-xs !text-sm" />
        <select name="status" defaultValue={sp.status ?? ""} className="field !min-h-[40px] max-w-[200px] !text-sm">
          <option value="">Todos os status</option>{Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}<option value="attention">Com alerta</option>
        </select>
        <select name="pagamento" defaultValue={sp.pagamento ?? ""} className="field !min-h-[40px] max-w-[200px] !text-sm">
          <option value="">Pagamento</option>{Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="entrega" defaultValue={sp.entrega ?? ""} className="field !min-h-[40px] max-w-[200px] !text-sm">
          <option value="">Separação/entrega</option>{Object.entries(FULFILLMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn-outline btn-sm">Filtrar</button>
      </form>
      <Table head={["Pedido", "Data", "Cliente", "Pagamento", "Entrega", "Total"]} empty="Nenhum pedido encontrado.">
        {rows.map((o) => (
          <tr key={o.id} className="hover:bg-cream/60">
            <td className="px-3 py-2"><Link href={`/admin/pedidos/${o.id}`} className="font-bold text-primary">{formatOrderNumber(o.number)}</Link>{o.attentionReason && <span title={o.attentionReason}> ⚠</span>}{o.channel !== "site" && <Badge tone="blue">{o.channel}</Badge>}</td>
            <td className="px-3 py-2 text-xs">{o.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
            <td className="px-3 py-2">{o.customerName}<p className="text-xs text-muted">{o.email}</p></td>
            <td className="px-3 py-2"><Badge tone={tone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge><p className="text-xs text-muted">{PAYMENT_STATUS_LABEL[o.paymentStatus as InternalPaymentStatus]}</p></td>
            <td className="px-3 py-2 text-xs">{o.shippingMethodName}<br />{FULFILLMENT_LABEL[o.fulfillmentStatus]}</td>
            <td className="px-3 py-2 font-bold">{formatBRL(o.totalCents)}</td>
          </tr>
        ))}
      </Table>
      {pages > 1 && <div className="mt-4 flex items-center gap-2 text-sm">{page > 1 && <Link className="btn btn-outline btn-sm" href={`?${new URLSearchParams({ ...sp, pagina: String(page - 1) } as Record<string, string>)}`}>Anterior</Link>}<span>Página {page} de {pages}</span>{page < pages && <Link className="btn btn-outline btn-sm" href={`?${new URLSearchParams({ ...sp, pagina: String(page + 1) } as Record<string, string>)}`}>Próxima</Link>}</div>}
    </div>
  );
}

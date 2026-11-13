import Link from "next/link";
import { requireStaffPage } from "@/server/auth/guards";
import { dashboard, launchChecklist } from "@/server/services/admin";
import { formatOrderNumber } from "@/server/services/orders";
import { PageHead, Panel, Stat, Badge, Table } from "@/components/admin/server-ui";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL, FULFILLMENT_LABEL } from "@/lib/payment-status";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ "sem-permissao"?: string }> }) {
  await requireStaffPage("dashboard.view");
  const [d, checklist, sp] = await Promise.all([dashboard(), launchChecklist(), searchParams]);
  const pending = checklist.filter((c) => !c.ok);
  return (
    <div className="space-y-6">
      <PageHead title="Visão geral" subtitle="Últimos 30 dias. Receita considera somente pedidos com pagamento aprovado pelo Mercado Pago." />
      {sp["sem-permissao"] && <p className="rounded-xl bg-soft-red px-3 py-2 text-sm font-bold text-[#9c1015]">Você não tem permissão para acessar aquela área.</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receita aprovada" value={formatBRL(d.revenue30)} hint={`${d.paidOrders30} pedido(s) pagos`} tone="green" />
        <Stat label="Ticket médio" value={formatBRL(d.avgTicket)} />
        <Stat label="Aguardando pagamento" value={String(d.pendingPayment)} hint={formatBRL(d.pendingPaymentValue)} href="/admin/pedidos?status=pending_payment" />
        <Stat label="A separar / entregar" value={String(d.toFulfill)} href="/admin/pedidos?status=paid" />
        <Stat label="Cancelados" value={String(d.cancelled30)} href="/admin/pedidos?status=cancelled" />
        <Stat label="Reembolsado" value={formatBRL(d.refunded30)} tone={d.refunded30 ? "red" : undefined} />
        <Stat label="Avaliações a moderar" value={String(d.pendingReviews)} href="/admin/avaliacoes" />
        <Stat label="Atendimentos abertos" value={String(d.openTickets)} href="/admin/atendimento" />
      </div>

      {d.attention.length > 0 && (
        <Panel title="⚠ Pedidos que exigem atenção">
          <ul className="space-y-2 text-sm">{d.attention.map((a) => <li key={a.id}><Link href={`/admin/pedidos/${a.id}`} className="font-bold text-primary underline">{formatOrderNumber(a.number)}</Link> — {a.reason}</li>)}</ul>
        </Panel>
      )}

      {pending.length > 0 && (
        <Panel title={`Pendências para operar (${pending.length})`}>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-start gap-2"><span aria-hidden>{c.ok ? "✅" : "⬜"}</span><span><strong>{c.label}</strong><br /><span className="text-muted">{c.detail}</span></span></li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Pedidos recentes" actions={<Link href="/admin/pedidos" className="text-sm font-bold text-primary">Todos →</Link>}>
          <Table head={["Pedido", "Cliente", "Status", "Total"]} empty="Nenhum pedido ainda.">
            {d.recent.map((o) => (
              <tr key={o.id}>
                <td className="px-3 py-2"><Link href={`/admin/pedidos/${o.id}`} className="font-bold text-primary">{formatOrderNumber(o.number)}</Link></td>
                <td className="px-3 py-2">{o.name}</td>
                <td className="px-3 py-2"><Badge tone={o.status === "paid" || o.status === "completed" ? "green" : o.status === "cancelled" ? "red" : "yellow"}>{ORDER_STATUS_LABEL[o.status]}</Badge>{o.status === "paid" && <span className="ml-1 text-xs text-muted">{FULFILLMENT_LABEL[o.fulfillment]}</span>}</td>
                <td className="px-3 py-2 font-bold">{formatBRL(o.total)}</td>
              </tr>
            ))}
          </Table>
        </Panel>
        <div className="space-y-6">
          <Panel title="Mais vendidos (pagos)">
            {d.top.length === 0 ? <p className="text-sm text-muted">Sem vendas aprovadas no período.</p> : (
              <ol className="space-y-1.5 text-sm">{d.top.map((t, i) => <li key={t.name} className="flex justify-between gap-2"><span>{i + 1}. {t.name}</span><span className="font-bold">{t.qty} un. · {formatBRL(t.total)}</span></li>)}</ol>
            )}
          </Panel>
          <Panel title="Alertas de estoque (≤ 3 disponíveis)">
            {d.lowStock.length === 0 ? <p className="text-sm text-muted">Nenhum produto ativo com estoque baixo.</p> : (
              <ul className="space-y-1.5 text-sm">{d.lowStock.map((s) => <li key={s.sku} className="flex justify-between gap-2"><Link href={`/admin/produtos/${s.id}`} className="hover:underline">{s.name}{s.variant !== "Padrão" ? ` — ${s.variant}` : ""}</Link><Badge tone={s.available <= 0 ? "red" : "yellow"}>{s.available <= 0 ? "Esgotado" : `${s.available} un.`}</Badge></li>)}</ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

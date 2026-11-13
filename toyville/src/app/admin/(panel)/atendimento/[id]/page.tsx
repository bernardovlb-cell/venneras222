import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { orders, supportTickets, ticketMessages } from "@/server/db/schema";
import { TICKET_STATUS_LABEL, TICKET_TYPE_LABEL } from "@/server/services/support";
import { formatOrderNumber } from "@/server/services/orders";
import { PageHead, Panel, Badge } from "@/components/admin/server-ui";
import { AdminForm, F } from "@/components/admin/ui";
import { staffReplyAction } from "@/app/admin/actions";

const GUIDE: Record<string, string> = {
  withdrawal: "Direito de arrependimento (CDC art. 49): até 7 dias do recebimento, reembolso integral incluindo frete. Confirme a data de entrega e faça o reembolso pelo pedido.",
  data_access: "LGPD: responda em até 15 dias com os dados tratados (o cliente com conta pode baixar em Minha conta > Meus dados).",
  data_deletion: "LGPD: exclua/anonimize os dados, preservando o que a lei exige guardar (pedidos e dados fiscais). Clientes com conta podem excluir em Minha conta > Meus dados.",
  return: "Produto com defeito: prazo de 90 dias (bens duráveis, CDC art. 26).",
};

export default async function TicketAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("support.handle");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = (await db.select().from(supportTickets).where(eq(supportTickets.id, id)))[0];
  if (!t) notFound();
  const [msgs, order] = await Promise.all([
    db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, id)).orderBy(asc(ticketMessages.createdAt)),
    t.orderId ? db.select({ id: orders.id, number: orders.number }).from(orders).where(eq(orders.id, t.orderId)).then((r) => r[0]) : Promise.resolve(undefined),
  ]);
  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/atendimento" className="text-sm font-bold text-primary">← Atendimento</Link>
      <PageHead title={`#${t.number} — ${t.subject}`} subtitle={`${t.name} · ${t.email}${t.phone ? ` · ${t.phone}` : ""}`} actions={<><Badge>{TICKET_TYPE_LABEL[t.type]}</Badge><Badge tone="blue">{TICKET_STATUS_LABEL[t.status]}</Badge></>} />
      {order && <p className="text-sm">Pedido: <Link href={`/admin/pedidos/${order.id}`} className="font-bold text-primary">{formatOrderNumber(order.number)}</Link></p>}
      {GUIDE[t.type] && <p className="rounded-xl bg-soft-yellow p-3 text-sm">{GUIDE[t.type]}</p>}
      <ol className="space-y-3">{msgs.map((m) => (
        <li key={m.id} className={`rounded-2xl border border-line p-4 text-sm ${m.authorType === "staff" ? "ml-8 bg-soft-blue" : "mr-8 bg-white"}`}>
          <p className="whitespace-pre-line">{m.body}</p><p className="mt-2 text-xs text-muted">{m.authorType === "staff" ? "Equipe" : "Cliente"} · {m.createdAt.toLocaleString("pt-BR")}</p>
        </li>
      ))}</ol>
      <Panel title="Responder">
        <AdminForm action={staffReplyAction} submitLabel="Enviar" resetOnSuccess>
          <input type="hidden" name="ticketId" value={t.id} />
          <F label="Mensagem (enviada ao cliente por e-mail)" name="body" as="textarea" rows={4} />
          <F label="Status" name="status" as="select" defaultValue="waiting_customer">{Object.entries(TICKET_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</F>
        </AdminForm>
      </Panel>
    </div>
  );
}

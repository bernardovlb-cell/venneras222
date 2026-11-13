import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { addresses, orders, supportTickets, users } from "@/server/db/schema";
import { formatOrderNumber } from "@/server/services/orders";
import { TICKET_STATUS_LABEL, TICKET_TYPE_LABEL } from "@/server/services/support";
import { PageHead, Panel, Badge } from "@/components/admin/server-ui";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/payment-status";
import { audit } from "@/server/audit";

export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireStaffPage("customers.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = (await db.select().from(users).where(eq(users.id, id)))[0];
  if (!c) notFound();
  const [ords, addrs, tickets] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, id)).orderBy(desc(orders.createdAt)),
    db.select().from(addresses).where(eq(addresses.userId, id)),
    db.select().from(supportTickets).where(eq(supportTickets.userId, id)).orderBy(desc(supportTickets.createdAt)),
  ]);
  // Acesso a dados pessoais fica registrado (LGPD: rastreabilidade)
  await audit({ userId: u.id, action: "customer.view", entity: "user", entityId: id });
  return (
    <div className="max-w-5xl space-y-5">
      <Link href="/admin/clientes" className="text-sm font-bold text-primary">← Clientes</Link>
      <PageHead title={c.name} subtitle={`${c.email}${c.phone ? ` · ${c.phone}` : ""} · desde ${c.createdAt.toLocaleDateString("pt-BR")}`} actions={<>{c.marketingConsent ? <Badge tone="green">aceita marketing</Badge> : <Badge>sem consentimento de marketing</Badge>}{!c.isActive && <Badge tone="red">inativo</Badge>}</>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={`Pedidos (${ords.length})`}>
          <ul className="divide-y divide-line text-sm">{ords.map((o) => <li key={o.id} className="flex justify-between py-2"><Link href={`/admin/pedidos/${o.id}`} className="font-bold text-primary">{formatOrderNumber(o.number)}</Link><span>{ORDER_STATUS_LABEL[o.status]}</span><span className="font-bold">{formatBRL(o.totalCents)}</span></li>)}</ul>
        </Panel>
        <Panel title="Atendimentos">
          {tickets.length === 0 ? <p className="text-sm text-muted">Nenhum.</p> : <ul className="divide-y divide-line text-sm">{tickets.map((t) => <li key={t.id} className="py-2"><Link href={`/admin/atendimento/${t.id}`} className="font-bold text-primary">#{t.number} {t.subject}</Link> <Badge>{TICKET_TYPE_LABEL[t.type]}</Badge> <Badge tone="blue">{TICKET_STATUS_LABEL[t.status]}</Badge></li>)}</ul>}
        </Panel>
        <Panel title="Endereços">
          {addrs.length === 0 ? <p className="text-sm text-muted">Nenhum.</p> : <ul className="space-y-1 text-sm">{addrs.map((a) => <li key={a.id}>{a.street}, {a.number} — {a.district}, {a.city}/{a.state} · {a.zip}</li>)}</ul>}
        </Panel>
      </div>
    </div>
  );
}

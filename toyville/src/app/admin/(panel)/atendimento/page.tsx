import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { supportTickets } from "@/server/db/schema";
import { TICKET_STATUS_LABEL, TICKET_TYPE_LABEL } from "@/server/services/support";
import { PageHead, Table, Badge } from "@/components/admin/server-ui";

export default async function SupportAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage("support.handle");
  const st = (await searchParams).status;
  const rows = await db.select().from(supportTickets)
    .where(st && st in TICKET_STATUS_LABEL ? eq(supportTickets.status, st as "open") : inArray(supportTickets.status, ["open", "in_progress", "waiting_customer"]))
    .orderBy(desc(supportTickets.updatedAt)).limit(100);
  return (
    <div className="max-w-5xl">
      <PageHead title="Atendimento" subtitle="Dúvidas, trocas, devoluções, arrependimento e solicitações LGPD." />
      <div className="mb-4 flex flex-wrap gap-2"><Link href="?" className="btn btn-outline btn-sm">Em aberto</Link>{Object.entries(TICKET_STATUS_LABEL).map(([k, v]) => <Link key={k} href={`?status=${k}`} className="btn btn-ghost btn-sm">{v}</Link>)}</div>
      <Table head={["#", "Assunto", "Tipo", "Cliente", "Status", "Atualizado"]} empty="Nenhuma solicitação.">
        {rows.map((t) => (
          <tr key={t.id}><td className="px-3 py-2 font-bold">{t.number}</td><td className="px-3 py-2"><Link href={`/admin/atendimento/${t.id}`} className="font-bold text-primary">{t.subject}</Link></td>
            <td className="px-3 py-2"><Badge tone={t.type === "withdrawal" || t.type.startsWith("data_") ? "red" : "gray"}>{TICKET_TYPE_LABEL[t.type]}</Badge></td>
            <td className="px-3 py-2 text-xs">{t.name}<br />{t.email}</td><td className="px-3 py-2"><Badge tone="blue">{TICKET_STATUS_LABEL[t.status]}</Badge></td>
            <td className="px-3 py-2 text-xs">{t.updatedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td></tr>
        ))}
      </Table>
    </div>
  );
}

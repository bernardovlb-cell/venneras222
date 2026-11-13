import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/server/auth/guards";
import { myTickets } from "@/server/services/customer";
import { TICKET_STATUS_LABEL, TICKET_TYPE_LABEL } from "@/server/services/support";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Atendimentos", robots: { index: false } };

export default async function Tickets() {
  const u = await requireUserPage("/conta/atendimentos");
  const list = await myTickets(u.id);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><h1 className="text-3xl font-extrabold text-primary-dark">Atendimentos</h1><Link href="/atendimento" className="btn btn-primary btn-sm">Nova solicitação</Link></div>
      {list.length === 0 ? <EmptyState title="Nenhuma solicitação" emoji="💬" /> : (
        <ul className="space-y-3">
          {list.map((t) => (
            <li key={t.id}><Link href={`/conta/atendimentos/${t.id}`} className="card flex flex-wrap items-center gap-3 p-4 hover:shadow-pop">
              <span className="font-extrabold">#{t.number}</span><span className="flex-1">{t.subject}</span>
              <span className="chip bg-soft-blue text-primary-dark">{TICKET_TYPE_LABEL[t.type]}</span><span className="chip bg-cream">{TICKET_STATUS_LABEL[t.status]}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserPage } from "@/server/auth/guards";
import { getTicketForUser, TICKET_STATUS_LABEL, TICKET_TYPE_LABEL } from "@/server/services/support";
import { TicketReplyForm } from "@/components/account/Forms";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUserPage("/conta/atendimentos");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getTicketForUser(id, u.id);
  if (!data) notFound();
  const { ticket: t, messages } = data;
  return (
    <div className="space-y-4">
      <Link href="/conta/atendimentos" className="text-sm font-bold text-primary">← Atendimentos</Link>
      <h1 className="text-2xl font-extrabold">#{t.number} — {t.subject}</h1>
      <p className="flex gap-2"><span className="chip bg-soft-blue text-primary-dark">{TICKET_TYPE_LABEL[t.type]}</span><span className="chip bg-cream">{TICKET_STATUS_LABEL[t.status]}</span></p>
      <ol className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className={`card max-w-[85%] p-4 text-sm ${m.authorType === "staff" ? "bg-soft-blue" : "ml-auto"}`}>
            <p className="whitespace-pre-line">{m.body}</p>
            <p className="mt-2 text-xs text-muted">{m.authorType === "staff" ? "ToyVille" : "Você"} · {m.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
          </li>
        ))}
      </ol>
      {t.status !== "closed" && <div className="card p-4"><TicketReplyForm ticketId={t.id} /></div>}
    </div>
  );
}

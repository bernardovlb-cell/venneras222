import { desc, eq } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { auditLogs, users } from "@/server/db/schema";
import { PageHead, Table } from "@/components/admin/server-ui";

export default async function AuditPage() {
  await requireStaffPage("audit.read");
  const rows = await db.select({ l: auditLogs, name: users.name }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.userId)).orderBy(desc(auditLogs.createdAt)).limit(200);
  return (
    <div>
      <PageHead title="Auditoria" subtitle="Últimas 200 ações administrativas." />
      <Table head={["Quando", "Quem", "Ação", "Registro", "Detalhes"]}>
        {rows.map(({ l, name }) => (
          <tr key={l.id}><td className="px-3 py-2 text-xs">{l.createdAt.toLocaleString("pt-BR")}</td><td className="px-3 py-2">{name ?? "sistema"}</td><td className="px-3 py-2 font-mono text-xs">{l.action}</td>
            <td className="px-3 py-2 text-xs">{l.entity} {l.entityId?.slice(0, 8)}</td><td className="max-w-xs truncate px-3 py-2 text-xs text-muted" title={JSON.stringify(l.data)}>{l.data ? JSON.stringify(l.data) : ""}</td></tr>
        ))}
      </Table>
    </div>
  );
}

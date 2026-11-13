import Link from "next/link";
import { requireStaffPage } from "@/server/auth/guards";
import { listCustomers } from "@/server/services/admin";
import { PageHead, Table } from "@/components/admin/server-ui";
import { formatBRL } from "@/lib/money";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  await requireStaffPage("customers.read");
  const sp = await searchParams;
  const rows = await listCustomers(sp.q, Number(sp.pagina) || 1);
  return (
    <div>
      <PageHead title="Clientes" subtitle="Clientes com conta. Compras de visitantes aparecem nos pedidos." />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Nome ou e-mail" className="field !min-h-[40px] max-w-xs !text-sm" /><button className="btn btn-outline btn-sm">Buscar</button></form>
      <Table head={["Cliente", "Cadastro", "Pedidos", "Total pago"]} empty="Nenhum cliente encontrado.">
        {rows.map((c) => (
          <tr key={c.id}><td className="px-3 py-2"><Link href={`/admin/clientes/${c.id}`} className="font-bold text-primary">{c.name}</Link><p className="text-xs text-muted">{c.email}</p></td>
            <td className="px-3 py-2 text-xs">{c.createdAt.toLocaleDateString("pt-BR")}</td><td className="px-3 py-2">{c.orders}</td><td className="px-3 py-2 font-bold">{formatBRL(c.spent)}</td></tr>
        ))}
      </Table>
    </div>
  );
}

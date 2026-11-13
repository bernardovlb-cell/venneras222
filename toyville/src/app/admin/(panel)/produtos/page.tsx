import Link from "next/link";
import Image from "next/image";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { categories, products } from "@/server/db/schema";
import { PageHead, Table, Badge } from "@/components/admin/server-ui";
import { formatBRL } from "@/lib/money";

const STATUS: Record<string, [string, "green" | "gray" | "red"]> = { active: ["Publicado", "green"], draft: ["Rascunho", "gray"], archived: ["Arquivado", "red"] };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; pagina?: string }> }) {
  await requireStaffPage("products.read");
  const sp = await searchParams;
  const conds: SQL[] = [];
  if (sp.q) conds.push(or(ilike(products.name, `%${sp.q}%`), ilike(products.sku, `%${sp.q}%`), sql`exists (select 1 from product_variants v where v.product_id = ${products.id} and v.sku ilike ${"%" + sp.q + "%"})`)!);
  if (sp.status && STATUS[sp.status]) conds.push(eq(products.status, sp.status as "active"));
  const page = Math.max(1, Number(sp.pagina) || 1);
  const rows = await db.select({
    id: products.id, name: products.name, sku: products.sku, status: products.status, isDemo: products.isDemo, category: categories.name,
    minPrice: sql<number>`(select min(price_cents) from product_variants v where v.product_id = ${products.id} and v.is_active)`,
    stock: sql<number>`(select coalesce(sum(stock_on_hand - stock_reserved),0)::int from product_variants v where v.product_id = ${products.id} and v.is_active)`,
    reserved: sql<number>`(select coalesce(sum(stock_reserved),0)::int from product_variants v where v.product_id = ${products.id})`,
    variants: sql<number>`(select count(*)::int from product_variants v where v.product_id = ${products.id})`,
    image: sql<string | null>`(select coalesce(thumb_url, url) from product_images i where i.product_id = ${products.id} order by position limit 1)`,
  }).from(products).leftJoin(categories, eq(categories.id, products.categoryId)).where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(products.updatedAt)).limit(50).offset((page - 1) * 50);

  return (
    <div>
      <PageHead title="Produtos" actions={<><Link href="/admin/produtos/importar" className="btn btn-outline btn-sm">Importar planilha</Link><Link href="/admin/produtos/novo" className="btn btn-primary btn-sm">Novo produto</Link></>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nome ou SKU" className="field !min-h-[40px] max-w-xs !text-sm" />
        <select name="status" defaultValue={sp.status ?? ""} className="field !min-h-[40px] max-w-[180px] !text-sm"><option value="">Todos</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className="btn btn-outline btn-sm">Filtrar</button>
      </form>
      <Table head={["", "Produto", "Categoria", "Preço", "Disponível", "Status"]} empty="Nenhum produto encontrado.">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-cream/60">
            <td className="w-14 px-3 py-2"><span className="relative block size-11 overflow-hidden rounded-lg bg-soft-yellow">{r.image ? <Image src={r.image} alt="" fill sizes="44px" className="object-contain" /> : null}</span></td>
            <td className="px-3 py-2"><Link href={`/admin/produtos/${r.id}`} className="font-bold text-primary hover:underline">{r.name}</Link><p className="text-xs text-muted">{r.sku} · {r.variants} variação(ões){r.isDemo ? " · DEMO" : ""}</p></td>
            <td className="px-3 py-2">{r.category ?? <span className="text-muted">—</span>}</td>
            <td className="px-3 py-2">{r.minPrice ? formatBRL(r.minPrice) : <Badge tone="red">sem preço</Badge>}</td>
            <td className="px-3 py-2">{r.stock <= 0 ? <Badge tone="red">Esgotado</Badge> : r.stock}{r.reserved > 0 && <span className="ml-1 text-xs text-muted">({r.reserved} reserv.)</span>}</td>
            <td className="px-3 py-2"><Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge></td>
          </tr>
        ))}
      </Table>
      <div className="mt-4 flex gap-2">{page > 1 && <Link className="btn btn-outline btn-sm" href={`?${new URLSearchParams({ ...sp, pagina: String(page - 1) })}`}>Anterior</Link>}{rows.length === 50 && <Link className="btn btn-outline btn-sm" href={`?${new URLSearchParams({ ...sp, pagina: String(page + 1) })}`}>Próxima</Link>}</div>
    </div>
  );
}

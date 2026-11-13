import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, inArray } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { getProductForAdmin } from "@/server/services/admin-products";
import { categoryOptions, brandOptions } from "@/server/services/admin-lookups";
import { db } from "@/server/db/client";
import { inventoryMovements } from "@/server/db/schema";
import { ProductForm } from "@/components/admin/ProductForm";
import { VariantsEditor, ImagesEditor, DeleteProduct } from "@/components/admin/ProductEditors";
import { PageHead, Panel, Badge, toLocalInput } from "@/components/admin/server-ui";

const REASON: Record<string, string> = { manual_adjust: "Ajuste manual", import: "Importação", order_reserved: "Reserva de pedido", order_released: "Reserva liberada", order_committed: "Venda confirmada", return_restock: "Devolução/reposição", channel_sync: "Sincronização de canal", initial: "Estoque inicial" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }) {
  await requireStaffPage("products.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getProductForAdmin(id);
  if (!data) notFound();
  const [cats, brands, sp] = await Promise.all([categoryOptions(), brandOptions(), searchParams]);
  const { product: p, variants, images } = data;
  const moves = variants.length ? await db.select().from(inventoryMovements).where(inArray(inventoryMovements.variantId, variants.map((v) => v.id))).orderBy(desc(inventoryMovements.createdAt)).limit(30) : [];
  const skuBy = new Map(variants.map((v) => [v.id, v.sku]));
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/admin/produtos" className="text-sm font-bold text-primary">← Produtos</Link>
        <PageHead title={p.name} subtitle={`SKU ${p.sku}`} actions={<>
          <Badge tone={p.status === "active" ? "green" : p.status === "draft" ? "gray" : "red"}>{p.status === "active" ? "Publicado" : p.status === "draft" ? "Rascunho" : "Arquivado"}</Badge>
          {p.status === "active" && <Link href={`/produto/${p.slug}`} target="_blank" className="btn btn-outline btn-sm">Ver na loja</Link>}
        </>} />
        {sp.novo && <p className="rounded-xl bg-soft-green px-3 py-2 text-sm font-bold text-[#1d5e1d]">Produto criado como rascunho. Agora cadastre variações e imagens; depois altere o status para “Publicado”.</p>}
      </div>
      <Panel title="Variações, preços e estoque">
        <VariantsEditor productId={p.id} images={images.map((i) => ({ id: i.id, url: i.url, thumbUrl: i.thumbUrl, alt: i.alt, width: i.width, height: i.height }))}
          variants={variants.map((v) => ({ id: v.id, sku: v.sku, name: v.name, options: v.options, priceCents: v.priceCents, salePriceCents: v.salePriceCents, saleStartsAt: toLocalInput(v.saleStartsAt), saleEndsAt: toLocalInput(v.saleEndsAt), stockOnHand: v.stockOnHand, stockReserved: v.stockReserved, imageId: v.imageId, weightGrams: v.weightGrams, isActive: v.isActive, position: v.position }))} />
      </Panel>
      <Panel title="Imagens"><ImagesEditor productId={p.id} images={images.map((i) => ({ id: i.id, url: i.url, thumbUrl: i.thumbUrl, alt: i.alt, width: i.width, height: i.height }))} /></Panel>
      <Panel title="Dados do produto"><ProductForm p={p} categories={cats} brands={brands} /></Panel>
      <Panel title="Movimentações de estoque (últimas 30)">
        {moves.length === 0 ? <p className="text-sm text-muted">Sem movimentações.</p> : (
          <ul className="divide-y divide-line text-sm">{moves.map((m) => (
            <li key={m.id} className="flex flex-wrap justify-between gap-2 py-1.5">
              <span>{m.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {skuBy.get(m.variantId)} · {REASON[m.reason]}{m.note ? ` — ${m.note}` : ""}</span>
              <span className="font-mono">{m.deltaOnHand ? `físico ${m.deltaOnHand > 0 ? "+" : ""}${m.deltaOnHand}` : ""} {m.deltaReserved ? `reserv. ${m.deltaReserved > 0 ? "+" : ""}${m.deltaReserved}` : ""}</span>
            </li>
          ))}</ul>
        )}
      </Panel>
      <DeleteProduct productId={p.id} />
    </div>
  );
}

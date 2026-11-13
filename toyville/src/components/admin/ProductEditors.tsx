"use client";
import { useState } from "react";
import Image from "next/image";
import { AdminForm, F, Check, ActionButton } from "./ui";
import { saveVariantAction, deleteVariantAction, adjustStockAction, uploadImagesAction, imageOpAction, imageAltAction, replaceImageAction, deleteProductAction } from "@/app/admin/actions";
import { centsToInput, formatBRL } from "@/lib/money";

type V = { id: string; sku: string; name: string; options: Record<string, string>; priceCents: number; salePriceCents: number | null; saleStartsAt: string; saleEndsAt: string; stockOnHand: number; stockReserved: number; imageId: string | null; weightGrams: number | null; isActive: boolean; position: number };
type I = { id: string; url: string; thumbUrl: string | null; alt: string | null; width: number | null; height: number | null };

function VariantFields({ productId, v, images }: { productId: string; v?: V; images: I[] }) {
  return (
    <>
      <input type="hidden" name="productId" value={productId} />
      {v && <input type="hidden" name="variantId" value={v.id} />}
      <div className="grid gap-3 sm:grid-cols-4">
        <F label="SKU" name="sku" defaultValue={v?.sku} required />
        <F label="Nome da variação" name="name" defaultValue={v?.name ?? "Padrão"} required />
        <F label="Opções" name="options" defaultValue={v ? Object.entries(v.options).map(([k, x]) => `${k}=${x}`).join(";") : ""} hint="Ex.: Cor=Azul;Tamanho=M" className="sm:col-span-2" />
        <F label="Preço normal (R$)" name="price" inputMode="decimal" defaultValue={centsToInput(v?.priceCents)} required />
        <F label="Preço promocional (R$)" name="salePrice" inputMode="decimal" defaultValue={centsToInput(v?.salePriceCents)} hint="Vazio = sem promoção" />
        <F label="Promoção início" name="saleStartsAt" type="datetime-local" defaultValue={v?.saleStartsAt} />
        <F label="Promoção fim" name="saleEndsAt" type="datetime-local" defaultValue={v?.saleEndsAt} />
        {!v && <F label="Estoque inicial" name="stock" type="number" min={0} defaultValue="0" />}
        <F label="Peso (g)" name="weightGrams" type="number" min={0} defaultValue={v?.weightGrams ?? ""} hint="Se diferente do produto" />
        <F label="Imagem da variação" name="imageId" as="select" defaultValue={v?.imageId ?? ""}>
          <option value="">— padrão do produto —</option>
          {images.map((im, i) => <option key={im.id} value={im.id}>Imagem {i + 1}{im.alt ? ` (${im.alt})` : ""}</option>)}
        </F>
        <F label="Ordem" name="position" type="number" min={0} defaultValue={String(v?.position ?? 0)} />
        <div className="flex items-end"><Check label="Ativa (à venda)" name="isActive" defaultChecked={v?.isActive ?? true} /></div>
      </div>
    </>
  );
}

export function VariantsEditor({ productId, variants, images }: { productId: string; variants: V[]; images: I[] }) {
  const [editing, setEditing] = useState<string | null>(variants.length ? null : "new");
  return (
    <div className="space-y-3">
      {variants.map((v) => (
        <div key={v.id} className="rounded-xl border border-line p-3">
          {editing === v.id ? (
            <AdminForm action={saveVariantAction} onResult={(r) => r.ok && setEditing(null)} footer={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancelar</button>}>
              <VariantFields productId={productId} v={v} images={images} />
            </AdminForm>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{v.name} <span className="font-normal text-muted">· {v.sku}</span> {!v.isActive && <span className="chip bg-soft-red text-[#9c1015]">inativa</span>}</p>
                <p className="text-muted">
                  {v.salePriceCents ? <><s>{formatBRL(v.priceCents)}</s> <strong className="text-promo">{formatBRL(v.salePriceCents)}</strong></> : <strong className="text-ink">{formatBRL(v.priceCents)}</strong>}
                  {" · "}Estoque físico {v.stockOnHand} · Reservado {v.stockReserved} · <strong>Disponível {v.stockOnHand - v.stockReserved}</strong>
                </p>
              </div>
              <StockAdjust variantId={v.id} current={v.stockOnHand} />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(v.id)}>Editar</button>
              <ActionButton action={() => deleteVariantAction(productId, v.id)} confirm="Remover esta variação? Se já foi vendida, será apenas desativada." className="btn btn-ghost btn-sm text-promo">Remover</ActionButton>
            </div>
          )}
        </div>
      ))}
      {editing === "new" ? (
        <div className="rounded-xl border-2 border-dashed border-primary/40 p-3">
          <AdminForm action={saveVariantAction} submitLabel="Adicionar variação" resetOnSuccess onResult={(r) => r.ok && setEditing(null)}
            footer={variants.length ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancelar</button> : null}>
            <VariantFields productId={productId} images={images} />
          </AdminForm>
        </div>
      ) : <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing("new")}>+ Nova variação</button>}
    </div>
  );
}

function StockAdjust({ variantId, current }: { variantId: string; current: number }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>Ajustar estoque</button>;
  return (
    <AdminForm action={adjustStockAction} submitLabel="Aplicar" className="w-full rounded-xl bg-cream p-3" onResult={(r) => r.ok && setOpen(false)} footer={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancelar</button>}>
      <input type="hidden" name="variantId" value={variantId} />
      <div className="grid gap-2 sm:grid-cols-2">
        <F label="Novo estoque físico" name="stock" type="number" min={0} defaultValue={String(current)} required />
        <F label="Motivo" name="note" placeholder="Ex.: contagem, avaria, reposição" required />
      </div>
    </AdminForm>
  );
}

export function ImagesEditor({ productId, images }: { productId: string; images: I[] }) {
  return (
    <div className="space-y-4">
      <AdminForm action={uploadImagesAction} submitLabel="Enviar imagens" resetOnSuccess>
        <input type="hidden" name="productId" value={productId} />
        <F label="Adicionar imagens (até 20 por vez, 10 MB cada)" name="files" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hint="Convertidas para WebP otimizado; a primeira imagem é a principal." />
      </AdminForm>
      {images.length === 0 ? <p className="text-sm text-muted">Nenhuma imagem. Sem imagens, o site mostra uma ilustração neutra “Foto em breve”.</p> : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((im, i) => (
            <li key={im.id} className="rounded-xl border border-line p-2">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-cream">
                <Image src={im.thumbUrl ?? im.url} alt={im.alt ?? ""} fill sizes="240px" className="object-contain" />
                {i === 0 && <span className="chip absolute left-2 top-2 bg-primary text-white">Principal</span>}
              </div>
              <p className="mt-1 text-xs text-muted">{im.width}×{im.height}px</p>
              <AdminForm action={imageAltAction} submitLabel="Salvar texto" className="!space-y-2">
                <input type="hidden" name="productId" value={productId} /><input type="hidden" name="imageId" value={im.id} />
                <F label="Texto alternativo (acessibilidade)" name="alt" defaultValue={im.alt ?? ""} />
              </AdminForm>
              <div className="mt-2 flex flex-wrap gap-1">
                {i > 0 && <ActionButton action={() => imageOpAction(productId, im.id, "first")} className="btn btn-outline btn-sm">Tornar principal</ActionButton>}
                {i > 0 && <ActionButton action={() => imageOpAction(productId, im.id, "up")} className="btn btn-ghost btn-sm" >↑</ActionButton>}
                {i < images.length - 1 && <ActionButton action={() => imageOpAction(productId, im.id, "down")} className="btn btn-ghost btn-sm">↓</ActionButton>}
                <ActionButton action={() => imageOpAction(productId, im.id, "delete")} confirm="Excluir esta imagem?" className="btn btn-ghost btn-sm text-promo">Excluir</ActionButton>
              </div>
              <details className="mt-1 text-sm"><summary className="cursor-pointer font-bold text-primary">Substituir</summary>
                <AdminForm action={replaceImageAction} submitLabel="Substituir">
                  <input type="hidden" name="productId" value={productId} /><input type="hidden" name="imageId" value={im.id} />
                  <F label="Nova imagem" name="file" type="file" accept="image/*" />
                </AdminForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DeleteProduct({ productId }: { productId: string }) {
  return (
    <ActionButton action={() => deleteProductAction(productId)} confirm="Excluir este produto? Se ele já tiver vendas, será arquivado (os pedidos mantêm o histórico)."
      className="btn btn-ghost btn-sm text-promo" onDone={(r) => { if (r.ok) window.location.assign("/admin/produtos"); }}>Excluir / arquivar produto</ActionButton>
  );
}

"use client";
import { useState } from "react";
import { AdminForm, F, Check, ActionButton } from "./ui";
import { saveCouponAction, savePromotionAction, toggleRecordAction, deleteRecordAction } from "@/app/admin/actions";

type Opt = { id: string; name: string };

function ScopePicker({ categories, brands, products, scope }: { categories: Opt[]; brands: Opt[]; products: Opt[]; scope?: { categoryIds?: string[]; productIds?: string[]; brandIds?: string[] } }) {
  const sel = (name: string, list: Opt[], chosen: string[] = []) => (
    <div>
      <label className="label !text-[13px]">{name === "categoryIds" ? "Categorias" : name === "brandIds" ? "Marcas" : "Produtos"}</label>
      <select name={name} multiple defaultValue={chosen} className="field !min-h-[96px] !text-sm">{list.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
    </div>
  );
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {sel("categoryIds", categories, scope?.categoryIds)}{sel("brandIds", brands, scope?.brandIds)}{sel("productIds", products, scope?.productIds)}
      <p className="hint sm:col-span-3">Ctrl/⌘ + clique para selecionar vários. Categorias incluem as subcategorias.</p>
    </div>
  );
}

export type CouponRow = { id: string; code: string; description: string | null; type: string; valueLabel: string; value: string; minSubtotal: string; maxDiscount: string; startsAt: string; endsAt: string; usageLimit: number | null; usageLimitPerCustomer: number | null; combinableWithPromotions: boolean; isActive: boolean; uses: number; scope: { categoryIds?: string[]; productIds?: string[]; brandIds?: string[] } };

export function CouponEditor({ c, opts }: { c?: CouponRow; opts: { categories: Opt[]; brands: Opt[]; products: Opt[] } }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return c ? (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono font-extrabold">{c.code}</span><span>{c.valueLabel}</span>
        <span className="text-muted">{c.uses} uso(s){c.usageLimit ? ` de ${c.usageLimit}` : ""}{c.endsAt ? ` · até ${c.endsAt.replace("T", " ")}` : ""}</span>
        {!c.isActive && <span className="chip bg-soft-red text-[#9c1015]">inativo</span>}
        <span className="ml-auto flex gap-1"><button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>Editar</button>
          <ActionButton action={() => toggleRecordAction("coupon", c.id, !c.isActive)} className="btn btn-ghost btn-sm">{c.isActive ? "Desativar" : "Ativar"}</ActionButton></span>
      </div>
    ) : <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>+ Novo cupom</button>;
  }
  return (
    <AdminForm action={saveCouponAction} onResult={(r) => r.ok && setOpen(false)} footer={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancelar</button>}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <F label="Código" name="code" defaultValue={c?.code} required />
        <F label="Tipo" name="type" as="select" defaultValue={c?.type ?? "percent"}><option value="percent">% de desconto</option><option value="fixed">Valor fixo (R$)</option><option value="free_shipping">Frete grátis</option></F>
        <F label="Valor (% ou R$)" name="value" defaultValue={c?.value} hint="Ignorado para frete grátis" />
        <F label="Pedido mínimo (R$)" name="minSubtotal" defaultValue={c?.minSubtotal} />
        <F label="Desconto máximo (R$)" name="maxDiscount" defaultValue={c?.maxDiscount} />
        <F label="Descrição interna" name="description" defaultValue={c?.description ?? ""} />
        <F label="Início" name="startsAt" type="datetime-local" defaultValue={c?.startsAt} />
        <F label="Fim" name="endsAt" type="datetime-local" defaultValue={c?.endsAt} />
        <div />
        <F label="Limite total de usos" name="usageLimit" type="number" min={1} defaultValue={c?.usageLimit ?? ""} />
        <F label="Limite por cliente" name="usageLimitPerCustomer" type="number" min={1} defaultValue={c?.usageLimitPerCustomer ?? ""} />
        <div className="space-y-1 pt-6">
          <Check label="Combinável com produtos em promoção" name="combinableWithPromotions" defaultChecked={c?.combinableWithPromotions} />
          <Check label="Ativo" name="isActive" defaultChecked={c?.isActive ?? true} />
        </div>
      </div>
      <p className="text-sm font-bold">Restringir a (vazio = carrinho inteiro):</p>
      <ScopePicker {...opts} scope={c?.scope} />
    </AdminForm>
  );
}

export type PromoRow = { id: string; name: string; kind: string; value: string; valueLabel: string; minSubtotal: string; startsAt: string; endsAt: string; isFlash: boolean; badge: string | null; isActive: boolean; live: boolean; scope: { all?: boolean; categoryIds?: string[]; productIds?: string[]; brandIds?: string[] } };

export function PromotionEditor({ p, opts }: { p?: PromoRow; opts: { categories: Opt[]; brands: Opt[]; products: Opt[] } }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return p ? (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-extrabold">{p.name}</span><span>{p.valueLabel}</span>{p.isFlash && <span className="chip bg-promo text-white">relâmpago</span>}
        {p.live ? <span className="chip bg-soft-green text-[#1d5e1d]">vigente</span> : <span className="chip bg-[#f0eee8]">fora do período/inativa</span>}
        <span className="text-muted">{p.startsAt ? p.startsAt.replace("T", " ") : "sem início"} → {p.endsAt ? p.endsAt.replace("T", " ") : "sem fim"}</span>
        <span className="ml-auto flex gap-1"><button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>Editar</button>
          <ActionButton action={() => toggleRecordAction("promotion", p.id, !p.isActive)} className="btn btn-ghost btn-sm">{p.isActive ? "Desativar" : "Ativar"}</ActionButton>
          <ActionButton action={() => deleteRecordAction("promotion", p.id)} confirm="Excluir esta promoção?" className="btn btn-ghost btn-sm text-promo">Excluir</ActionButton></span>
      </div>
    ) : <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>+ Nova promoção</button>;
  }
  return (
    <AdminForm action={savePromotionAction} onResult={(r) => r.ok && setOpen(false)} footer={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancelar</button>}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <F label="Nome" name="name" defaultValue={p?.name} required />
        <F label="Tipo" name="kind" as="select" defaultValue={p?.kind ?? "percent_off"}><option value="percent_off">% de desconto nos produtos</option><option value="fixed_off">R$ de desconto por unidade</option><option value="free_shipping">Frete grátis a partir de um valor</option></F>
        <F label="Valor (% ou R$)" name="value" defaultValue={p?.value} />
        <F label="Valor mínimo do pedido (frete grátis)" name="minSubtotal" defaultValue={p?.minSubtotal} />
        <F label="Início" name="startsAt" type="datetime-local" defaultValue={p?.startsAt} />
        <F label="Fim" name="endsAt" type="datetime-local" defaultValue={p?.endsAt} hint="Obrigatório para oferta relâmpago" />
        <F label="Selo exibido" name="badge" defaultValue={p?.badge ?? ""} placeholder="Ex.: Black Friday" />
        <div className="space-y-1 pt-6"><Check label="Oferta relâmpago (contagem regressiva)" name="isFlash" defaultChecked={p?.isFlash} /><Check label="Ativa" name="isActive" defaultChecked={p?.isActive ?? true} /></div>
        <div className="pt-6"><Check label="Vale para toda a loja" name="all" defaultChecked={p?.scope.all} /></div>
      </div>
      <p className="text-sm font-bold">Ou restringir a:</p>
      <ScopePicker {...opts} scope={p?.scope} />
      <p className="hint">Promoções não se acumulam: cada produto usa o MENOR preço entre o preço promocional da variação e a melhor promoção vigente.</p>
    </AdminForm>
  );
}

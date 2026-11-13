"use client";
import { useState } from "react";
import { AdminForm, F, Check, ActionButton } from "./ui";
import { saveBannerAction, saveHomeSectionAction, savePageAction, toggleRecordAction, deleteRecordAction } from "@/app/admin/actions";

const THEME_DOT: Record<string, string> = { blue: "bg-primary", yellow: "bg-accent", red: "bg-promo", green: "bg-success", cream: "bg-soft-yellow" };

export type BannerRow = { id: string; placement: string; title: string; subtitle: string | null; imageUrl: string | null; linkUrl: string | null; ctaLabel: string | null; theme: string; position: number; startsAt: string; endsAt: string; isActive: boolean; isDemo: boolean };

export function BannerEditor({ b }: { b?: BannerRow }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return b ? (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`size-4 rounded-full ${THEME_DOT[b.theme] ?? "bg-primary"}`} aria-hidden />
        <span className="font-bold">{b.title}</span>{b.imageUrl && <span className="chip bg-soft-blue">com imagem</span>}{!b.isActive && <span className="chip bg-soft-red">inativo</span>}
        <span className="text-muted">ordem {b.position}{b.endsAt ? ` · até ${b.endsAt.replace("T", " ")}` : ""}</span>
        <span className="ml-auto flex gap-1"><button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>Editar</button>
          <ActionButton action={() => toggleRecordAction("banner", b.id, !b.isActive)} className="btn btn-ghost btn-sm">{b.isActive ? "Desativar" : "Ativar"}</ActionButton>
          <ActionButton action={() => deleteRecordAction("banner", b.id)} confirm="Excluir banner?" className="btn btn-ghost btn-sm text-promo">Excluir</ActionButton></span>
      </div>
    ) : <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>+ Novo banner</button>;
  }
  return (
    <AdminForm action={saveBannerAction} onResult={(r) => r.ok && setOpen(false)} footer={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancelar</button>}>
      {b && <input type="hidden" name="id" value={b.id} />}
      <input type="hidden" name="placement" value="hero" />
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Título" name="title" defaultValue={b?.title} required />
        <F label="Subtítulo" name="subtitle" defaultValue={b?.subtitle ?? ""} />
        <F label="Link" name="linkUrl" defaultValue={b?.linkUrl ?? ""} placeholder="/ofertas" />
        <F label="Texto do botão" name="ctaLabel" defaultValue={b?.ctaLabel ?? ""} />
        <F label="Cor de fundo (sem imagem)" name="theme" as="select" defaultValue={b?.theme ?? "blue"}><option value="blue">Azul</option><option value="yellow">Amarelo</option><option value="red">Vermelho</option><option value="green">Verde</option><option value="cream">Creme</option></F>
        <F label="Ordem" name="position" type="number" min={0} defaultValue={String(b?.position ?? 0)} />
        <F label="Início" name="startsAt" type="datetime-local" defaultValue={b?.startsAt} />
        <F label="Fim" name="endsAt" type="datetime-local" defaultValue={b?.endsAt} />
        <F label="Imagem (desktop, ~1600×600)" name="image" type="file" accept="image/*" />
        <F label="Imagem (celular, ~800×800)" name="mobileImage" type="file" accept="image/*" />
        {b?.imageUrl && <Check label="Remover imagens atuais" name="removeImage" />}
        <Check label="Ativo" name="isActive" defaultChecked={b?.isActive ?? true} />
      </div>
    </AdminForm>
  );
}

const SECTION_LABEL: Record<string, string> = { hero: "Banner principal", categories: "Categorias", best_sellers: "Mais vendidos", deals: "Ofertas", flash: "Ofertas relâmpago", gift_finder: "Guia de presentes", benefits: "Diferenciais", featured_products: "Produtos em destaque", new_arrivals: "Lançamentos" };

export function SectionEditor({ s }: { s: { id: string; type: string; title: string | null; subtitle: string | null; position: number; isActive: boolean; limit: number | null } }) {
  return (
    <AdminForm action={saveHomeSectionAction} submitLabel="Salvar" className="!space-y-2">
      <input type="hidden" name="id" value={s.id} />
      <p className="text-sm font-extrabold">{SECTION_LABEL[s.type] ?? s.type}</p>
      <div className="grid gap-2 sm:grid-cols-[1.2fr_1.4fr_90px_90px_auto]">
        <F label="Título" name="title" defaultValue={s.title ?? ""} />
        <F label="Subtítulo" name="subtitle" defaultValue={s.subtitle ?? ""} />
        <F label="Ordem" name="position" type="number" min={0} defaultValue={String(s.position)} />
        <F label="Qtd." name="limit" type="number" min={1} max={16} defaultValue={String(s.limit ?? 8)} />
        <div className="pt-6"><Check label="Ativa" name="isActive" defaultChecked={s.isActive} /></div>
      </div>
    </AdminForm>
  );
}

export function PageEditor({ p }: { p?: { slug: string; title: string; body: string; status: string; pendingNotes: string | null } }) {
  const [open, setOpen] = useState(false);
  if (!open) return p ? <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>Editar</button> : <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>+ Nova página</button>;
  return (
    <AdminForm action={savePageAction} onResult={(r) => r.ok && setOpen(false)} className="mt-3 w-full" footer={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Fechar</button>}>
      {p ? <input type="hidden" name="slug" value={p.slug} /> : <><input type="hidden" name="create" value="1" /><F label="Endereço (/p/…)" name="slug" required /></>}
      <F label="Título" name="title" defaultValue={p?.title} required />
      <F label="Texto" name="body" as="textarea" rows={16} defaultValue={p?.body} hint='"## " cria subtítulo, "- " cria lista, linha em branco separa parágrafos. Trechos [PENDENTE: …] impedem a publicação.' />
      <div className="grid gap-2 sm:grid-cols-2">
        <F label="Status" name="status" as="select" defaultValue={p?.status ?? "draft"}><option value="draft">Rascunho (oculto)</option><option value="pending_review">Em revisão (visível com aviso)</option><option value="published">Publicado</option></F>
        <F label="O que falta aprovar" name="pendingNotes" defaultValue={p?.pendingNotes ?? ""} />
      </div>
    </AdminForm>
  );
}

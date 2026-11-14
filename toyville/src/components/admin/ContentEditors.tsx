"use client";
import { useState } from "react";
import { AdminForm, F, Check, ActionButton } from "./ui";
import { saveBannerAction, moveBannerAction, saveHomeSectionAction, savePageAction, toggleRecordAction, deleteRecordAction } from "@/app/admin/actions";

const THEME_DOT: Record<string, string> = { blue: "bg-primary", yellow: "bg-accent", red: "bg-promo", green: "bg-success", cream: "bg-soft-yellow" };
const POSITION_LABEL: Record<string, string> = { left: "texto à esquerda", right: "texto à direita", overlay: "texto sobre a foto" };

export type BannerRow = {
  id: string; placement: string; title: string; subtitle: string | null; imageUrl: string | null; mobileImageUrl: string | null; linkUrl: string | null; ctaLabel: string | null;
  theme: string; textPosition: string; imageMode: string; position: number; startsAt: string; endsAt: string; isActive: boolean; isDemo: boolean;
};

/**
 * Banner da home. `placement` define o grupo: "hero" (carrossel principal) ou "side" (secundário).
 * `preview`: o próprio componente da loja, já renderizado com os dados salvos.
 */
export function BannerEditor({ b, placement, preview, first = false, last = false }: { b?: BannerRow; placement: "hero" | "side"; preview?: React.ReactNode; first?: boolean; last?: boolean }) {
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const main = placement === "hero";
  if (!open) {
    return b ? (
      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`size-4 rounded-full ${THEME_DOT[b.theme] ?? "bg-primary"}`} aria-hidden />
          <span className="font-bold">{b.title}</span>
          {b.imageUrl ? <span className="chip bg-soft-blue">com foto</span> : <span className="chip bg-soft-yellow">sem foto</span>}
          {!b.isActive && <span className="chip bg-soft-red">inativo</span>}
          <span className="text-muted">{main ? POSITION_LABEL[b.textPosition] ?? "" : ""}{b.endsAt ? ` · até ${b.endsAt.replace("T", " ")}` : ""}</span>
          <span className="ml-auto flex flex-wrap gap-1">
            <ActionButton action={() => moveBannerAction(b.id, "up")} className="btn btn-ghost btn-sm" >{first ? <span className="opacity-40">↑</span> : "↑"}<span className="sr-only">Subir {b.title}</span></ActionButton>
            <ActionButton action={() => moveBannerAction(b.id, "down")} className="btn btn-ghost btn-sm">{last ? <span className="opacity-40">↓</span> : "↓"}<span className="sr-only">Descer {b.title}</span></ActionButton>
            {preview && <button className="btn btn-ghost btn-sm" aria-expanded={showPreview} onClick={() => setShowPreview((v) => !v)}>{showPreview ? "Ocultar prévia" : "Prévia"}</button>}
            <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>Editar</button>
            <ActionButton action={() => toggleRecordAction("banner", b.id, !b.isActive)} className="btn btn-ghost btn-sm">{b.isActive ? "Despublicar" : "Publicar"}</ActionButton>
            <ActionButton action={() => deleteRecordAction("banner", b.id)} confirm={`Excluir o banner "${b.title}"?`} className="btn btn-ghost btn-sm text-promo">Excluir</ActionButton>
          </span>
        </div>
        {showPreview && preview && (
          <div className="mt-3 rounded-xl border border-dashed border-line bg-cream p-3">
            <p className="mb-2 text-xs font-bold text-muted">Prévia com os dados salvos (no site, a largura acompanha a tela)</p>
            <div className={`tv-store pointer-events-none ${main ? "max-w-[760px]" : "max-w-[420px]"}`}>{preview}</div>
          </div>
        )}
      </div>
    ) : <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>{main ? "+ Nova campanha" : "+ Novo banner secundário"}</button>;
  }
  return (
    <AdminForm action={saveBannerAction} onResult={(r) => r.ok && setOpen(false)} footer={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancelar</button>}>
      {b && <input type="hidden" name="id" value={b.id} />}
      <input type="hidden" name="placement" value={placement} />
      <input type="hidden" name="position" value={String(b?.position ?? 99)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Título" name="title" defaultValue={b?.title} required />
        <F label="Texto complementar" name="subtitle" defaultValue={b?.subtitle ?? ""} />
        <F label="Link (para onde o banner leva)" name="linkUrl" defaultValue={b?.linkUrl ?? ""} placeholder="/ofertas" hint="Caminho do site (ex.: /c/pelucias) ou endereço https://" />
        <F label="Texto do botão" name="ctaLabel" defaultValue={b?.ctaLabel ?? ""} placeholder="Ver mais" />
        <F label="Cor" name="theme" as="select" defaultValue={b?.theme ?? "blue"}><option value="blue">Azul</option><option value="yellow">Amarelo</option><option value="red">Vermelho (promoções)</option><option value="green">Verde</option><option value="cream">Creme</option></F>
        {main ? (
          <F label="Posição do texto" name="textPosition" as="select" defaultValue={b?.textPosition ?? "left"} hint="“Sobre a foto” aplica um véu escuro para o texto continuar legível.">
            <option value="left">À esquerda (foto à direita)</option><option value="right">À direita (foto à esquerda)</option><option value="overlay">Sobre a foto</option>
          </F>
        ) : <input type="hidden" name="textPosition" value="left" />}
        <F label="Tipo de foto" name="imageMode" as="select" defaultValue={b?.imageMode ?? "cutout"} hint="Recortada: brinquedo inteiro, de preferência PNG/WebP com fundo transparente. Ambiente: foto que preenche a área (pode ser cortada nas bordas).">
          <option value="cutout">Brinquedo recortado</option><option value="cover">Foto de ambiente</option>
        </F>
        <div className="hidden sm:block" />
        <F label={main ? "Foto (computador, ~1600×900)" : "Foto (~800×800)"} name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" />
        {main ? <F label="Foto para celular (opcional, ~900×700)" name="mobileImage" type="file" accept="image/jpeg,image/png,image/webp,image/avif" hint="Use quando o enquadramento do computador cortar algo importante no celular." /> : <div className="hidden sm:block" />}
        <F label="Início (opcional)" name="startsAt" type="datetime-local" defaultValue={b?.startsAt} />
        <F label="Fim (opcional)" name="endsAt" type="datetime-local" defaultValue={b?.endsAt} />
        {b?.imageUrl && <Check label="Remover as fotos atuais" name="removeImage" />}
        <Check label="Publicado" name="isActive" defaultChecked={b?.isActive ?? true} />
      </div>
      <p className="text-xs text-muted">O título e o botão são sempre texto de verdade: não coloque texto dentro da foto. Use apenas fotos próprias ou com autorização de uso.</p>
    </AdminForm>
  );
}

const SECTION_LABEL: Record<string, string> = { hero: "Banners (principal + secundários)", categories: "Categorias + Compre por idade", best_sellers: "Mais vendidos (destaque + grade)", deals: "Ofertas (painel)", flash: "Ofertas relâmpago (carrossel)", gift_finder: "Guia de presentes", benefits: "Institucional — por que comprar na ToyVille", featured_products: "Seleção de produtos", new_arrivals: "Lançamentos (carrossel)" };

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

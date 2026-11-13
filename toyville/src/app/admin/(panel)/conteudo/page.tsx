import Link from "next/link";
import { asc } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { banners, homeSections, pages } from "@/server/db/schema";
import { PageHead, Panel, Badge, toLocalInput } from "@/components/admin/server-ui";
import { BannerEditor, SectionEditor, PageEditor, type BannerRow } from "@/components/admin/ContentEditors";
import { SettingsForm } from "@/components/admin/SettingsForms";
import { CampaignBanner, SideBanner } from "@/components/home/Banners";
import { getSettings } from "@/server/settings";

export default async function ContentPage() {
  await requireStaffPage("content.write");
  const [bs, secs, pgs, s] = await Promise.all([
    db.select().from(banners).orderBy(asc(banners.position), asc(banners.createdAt)),
    db.select().from(homeSections).orderBy(asc(homeSections.position)),
    db.select().from(pages).orderBy(asc(pages.title)),
    getSettings(),
  ]);
  const hero = bs.filter((b) => b.placement === "hero"), side = bs.filter((b) => b.placement === "side");
  const row = (b: (typeof bs)[number]): BannerRow => ({ ...b, startsAt: toLocalInput(b.startsAt), endsAt: toLocalInput(b.endsAt) });
  return (
    <div className="max-w-5xl space-y-6">
      <PageHead title="Conteúdo e home" subtitle="Banners, ordem das seções da página inicial e textos institucionais. Fotos de categoria ficam em Categorias; fotos de produto, em cada produto." actions={<Link href="/" target="_blank" className="btn btn-outline btn-sm">Ver home</Link>} />
      <Panel title="Carrossel principal (banner grande)">
        <p className="mb-3 text-xs text-muted">Campanhas que giram no banner grande da home. Use ↑ ↓ para ordenar. Sem nenhuma campanha publicada, a loja mostra uma chamada padrão da marca.</p>
        <ul className="divide-y divide-line">
          {hero.map((b, i) => (
            <li key={b.id} className="py-3">
              <BannerEditor placement="hero" first={i === 0} last={i === hero.length - 1} b={row(b)} preview={<CampaignBanner b={b} />} />
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-line pt-3"><BannerEditor placement="hero" /></div>
        <div className="mt-4 border-t border-line pt-4">
          <SettingsForm settingsKey="home">
            <div className="grid items-end gap-3 sm:grid-cols-2">
              <label className="block text-sm"><span className="label !text-[13px]">Tempo de cada campanha (segundos)</span>
                <input name="carouselSeconds" type="number" data-num min={3} max={20} defaultValue={String(s.home.carouselSeconds)} className="field !min-h-[38px] !text-sm" />
                <span className="hint block">A troca pausa com o mouse em cima, com o teclado e para quem pede menos movimento.</span>
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="newsletterEnabled" defaultChecked={s.home.newsletterEnabled} className="size-4" />Mostrar o cadastro de e-mails (newsletter) no rodapé</label>
            </div>
          </SettingsForm>
        </div>
      </Panel>
      <Panel title="Banners secundários (ao lado do principal)">
        <p className="mb-3 text-xs text-muted">Aparecem os <strong>2 primeiros publicados</strong>, ao lado do banner grande (no celular, deslizam embaixo dele). Só publique “Novidades” ou ofertas quando houver produtos para mostrar.</p>
        <ul className="divide-y divide-line">
          {side.map((b, i) => (
            <li key={b.id} className="py-3">
              <BannerEditor placement="side" first={i === 0} last={i === side.length - 1} b={row(b)} preview={<SideBanner b={b} variant={i + 1} />} />
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-line pt-3"><BannerEditor placement="side" /></div>
      </Panel>
      <Panel title="Seções da página inicial">
        <p className="mb-3 text-xs text-muted">Seções sem conteúdo real (ex.: ofertas sem produtos em promoção, diferenciais não cadastrados) ficam ocultas automaticamente.</p>
        <div className="space-y-4">{secs.map((s) => <div key={s.id} className="rounded-xl border border-line p-3"><SectionEditor s={{ id: s.id, type: s.type, title: s.title, subtitle: s.subtitle, position: s.position, isActive: s.isActive, limit: s.config.limit ?? null }} /></div>)}</div>
      </Panel>
      <Panel title="Páginas institucionais e políticas">
        <ul className="divide-y divide-line">
          {pgs.map((p) => (
            <li key={p.slug} className="flex flex-wrap items-center gap-2 py-2.5">
              <Link href={`/p/${p.slug}`} target="_blank" className="font-bold text-primary">{p.title}</Link>
              <Badge tone={p.status === "published" ? "green" : p.status === "pending_review" ? "yellow" : "gray"}>{p.status === "published" ? "Publicada" : p.status === "pending_review" ? "Em revisão" : "Rascunho"}</Badge>
              {p.pendingNotes && <span className="text-xs text-muted">Pendente: {p.pendingNotes}</span>}
              <div className="w-full"><PageEditor p={p} /></div>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-line pt-3"><PageEditor /></div>
      </Panel>
    </div>
  );
}

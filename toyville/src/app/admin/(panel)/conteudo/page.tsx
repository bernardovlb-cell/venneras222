import Link from "next/link";
import { asc } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { banners, homeSections, pages } from "@/server/db/schema";
import { PageHead, Panel, Badge, toLocalInput } from "@/components/admin/server-ui";
import { BannerEditor, SectionEditor, PageEditor } from "@/components/admin/ContentEditors";

export default async function ContentPage() {
  await requireStaffPage("content.write");
  const [bs, secs, pgs] = await Promise.all([
    db.select().from(banners).orderBy(asc(banners.position)),
    db.select().from(homeSections).orderBy(asc(homeSections.position)),
    db.select().from(pages).orderBy(asc(pages.title)),
  ]);
  return (
    <div className="max-w-5xl space-y-6">
      <PageHead title="Conteúdo e home" subtitle="Banners, ordem das seções da página inicial e textos institucionais." actions={<Link href="/" target="_blank" className="btn btn-outline btn-sm">Ver home</Link>} />
      <Panel title="Banners do topo">
        <ul className="divide-y divide-line">{bs.map((b) => <li key={b.id} className="py-2.5"><BannerEditor b={{ ...b, startsAt: toLocalInput(b.startsAt), endsAt: toLocalInput(b.endsAt) }} /></li>)}</ul>
        <div className="mt-3 border-t border-line pt-3"><BannerEditor /></div>
        <p className="mt-2 text-xs text-muted">Sem banners ativos, a home mostra uma chamada padrão da marca.</p>
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

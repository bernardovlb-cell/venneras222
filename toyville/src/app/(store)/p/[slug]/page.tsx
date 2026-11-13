import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { pages } from "@/server/db/schema";
import { Notice } from "@/components/ui/States";
import { RichText } from "@/components/RichText";

async function load(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return (await db.select().from(pages).where(eq(pages.slug, slug)).limit(1))[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.title, robots: p.status === "published" ? undefined : { index: false } } : { title: "Página não encontrada" };
}

export default async function InstitutionalPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p || p.status === "draft") notFound();
  return (
    <article className="container-tv max-w-3xl py-8">
      <h1 className="text-3xl font-extrabold text-primary-dark sm:text-4xl">{p.title}</h1>
      {p.status !== "published" && (
        <div className="mt-4"><Notice kind="warn">Texto em revisão: este conteúdo é um rascunho pendente de aprovação da ToyVille e pode mudar.</Notice></div>
      )}
      <div className="prose-tv card mt-6 p-6 sm:p-8"><RichText text={p.body} /></div>
      <p className="mt-4 text-xs text-muted">Atualizado em {p.updatedAt.toLocaleDateString("pt-BR")}.</p>
    </article>
  );
}

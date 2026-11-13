import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { products, reviews } from "@/server/db/schema";
import { PageHead, Panel, Badge } from "@/components/admin/server-ui";
import { ActionButton } from "@/components/admin/ui";
import { moderateReviewAction } from "@/app/admin/actions";

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage("reviews.moderate");
  const status = ((await searchParams).status ?? "pending") as "pending" | "approved" | "rejected";
  const rows = await db.select({ r: reviews, product: products.name, slug: products.slug }).from(reviews).innerJoin(products, eq(products.id, reviews.productId))
    .where(eq(reviews.status, status)).orderBy(desc(reviews.createdAt)).limit(100);
  return (
    <div className="max-w-4xl">
      <PageHead title="Avaliações" subtitle="Nenhuma avaliação aparece na loja sem aprovação." />
      <div className="mb-4 flex gap-2">{(["pending", "approved", "rejected"] as const).map((s) => <Link key={s} href={`?status=${s}`} className={`btn btn-sm ${s === status ? "btn-primary" : "btn-outline"}`}>{s === "pending" ? "Pendentes" : s === "approved" ? "Aprovadas" : "Rejeitadas"}</Link>)}</div>
      <div className="space-y-3">
        {rows.length === 0 && <Panel><p className="text-sm text-muted">Nada aqui.</p></Panel>}
        {rows.map(({ r, product, slug }) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-accent">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></span>
              <Link href={`/produto/${slug}`} target="_blank" className="font-bold text-primary">{product}</Link>
              {r.verifiedPurchase ? <Badge tone="green">compra verificada</Badge> : <Badge>sem compra confirmada</Badge>}
              {r.moderationNote && <Badge tone="red">{r.moderationNote}</Badge>}
            </div>
            {r.title && <p className="mt-2 font-extrabold">{r.title}</p>}
            <p className="mt-1 whitespace-pre-line text-sm">{r.body}</p>
            <p className="mt-1 text-xs text-muted">{r.authorName} · {r.createdAt.toLocaleString("pt-BR")}</p>
            <div className="mt-3 flex gap-2">
              {status !== "approved" && <ActionButton action={moderateReviewAction.bind(null, r.id, "approved")} className="btn btn-primary btn-sm">Aprovar</ActionButton>}
              {status !== "rejected" && <ActionButton action={moderateReviewAction.bind(null, r.id, "rejected")} className="btn btn-outline btn-sm">Rejeitar</ActionButton>}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

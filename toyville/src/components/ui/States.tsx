import Link from "next/link";

export function EmptyState({ title, text, action, emoji = "🧸" }: { title: string; text?: string; action?: { href: string; label: string }; emoji?: string }) {
  return (
    <div className="card mx-auto flex max-w-lg flex-col items-center gap-3 p-8 text-center">
      <span aria-hidden className="grid size-20 place-items-center rounded-full bg-soft-yellow text-4xl">{emoji}</span>
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {text && <p className="text-muted">{text}</p>}
      {action && <Link href={action.href} className="btn btn-primary mt-2">{action.label}</Link>}
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "success"; children: React.ReactNode }) {
  const cls = { info: "bg-soft-blue text-primary-dark", warn: "bg-soft-yellow text-ink", error: "bg-soft-red text-[#9c1015]", success: "bg-soft-green text-[#1d5e1d]" }[kind];
  return <div role={kind === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${cls}`}>{children}</div>;
}

export function SectionTitle({ title, subtitle, href, linkLabel = "Ver todos" }: { title: string; subtitle?: string | null; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-extrabold leading-tight text-primary-dark sm:text-3xl">{title}</h2>
        <svg aria-hidden viewBox="0 0 120 10" className="mt-1 h-2.5 w-24 text-accent"><path d="M2 6c12-5 22 3 34-1s22-4 34 0 22 3 34-1 12-3 14-2" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
        {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {href && <Link href={href} className="shrink-0 text-sm font-extrabold text-primary hover:underline">{linkLabel} →</Link>}
    </div>
  );
}

export function Breadcrumb({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Você está em" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>›</span>}
            {it.href ? <Link href={it.href} className="hover:text-primary hover:underline">{it.name}</Link> : <span aria-current="page" className="font-bold text-ink">{it.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

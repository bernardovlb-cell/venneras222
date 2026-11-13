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

export function SectionTitle({ title, subtitle, href, linkLabel = "Ver todos", eyebrow, light = false }: {
  title: string; subtitle?: string | null; href?: string; linkLabel?: string; eyebrow?: string; light?: boolean;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
      <div className="min-w-0">
        {eyebrow && (
          <p className={`eyebrow ${light ? "!text-[#ffe08a]" : ""}`}>
            <svg aria-hidden viewBox="0 0 20 20" className="size-3.5"><path d="M10 1q1.6 7.4 9 9-7.4 1.6-9 9-1.6-7.4-9-9 7.4-1.6 9-9Z" fill="currentColor" /></svg>
            {eyebrow}
          </p>
        )}
        <h2 className={`text-[1.75rem] font-extrabold leading-[1.05] sm:text-[2.35rem] ${light ? "text-white" : "text-primary-dark"}`}>{title}</h2>
        {subtitle && <p className={`mt-1.5 text-[15px] sm:text-base ${light ? "text-white/85" : "text-muted"}`}>{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} aria-label={`${linkLabel}: ${title}`} className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white py-1.5 pl-3.5 pr-1.5 text-sm font-extrabold text-primary shadow-card transition hover:bg-soft-blue">
          <span className="hidden sm:inline">{linkLabel}</span><span className="sm:hidden">Ver</span>
          <span aria-hidden className="grid size-7 place-items-center rounded-full bg-primary text-white transition group-hover:translate-x-0.5">→</span>
        </Link>
      )}
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

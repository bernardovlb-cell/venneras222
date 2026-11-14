import Link from "next/link";
import { SearchIcon, BoxIcon, ChatIcon, HeartIcon, GiftIcon, CartIcon, ChevronRight } from "../icons";

const EMPTY_ICONS: Record<string, (p: { size?: number }) => React.ReactNode> = {
  "🔎": SearchIcon, "📦": BoxIcon, "💬": ChatIcon, "💛": HeartIcon, "🎁": GiftIcon, "🛒": CartIcon,
};

/** Estado vazio. `emoji` é mantido por compatibilidade e mapeado para um ícone de traço. */
export function EmptyState({ title, text, action, emoji = "📦" }: { title: string; text?: string; action?: { href: string; label: string }; emoji?: string }) {
  const Icon = EMPTY_ICONS[emoji] ?? BoxIcon;
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-line bg-white p-8 text-center">
      <span aria-hidden className="grid size-16 place-items-center rounded-2xl bg-soft-blue text-primary"><Icon size={30} /></span>
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {text && <p className="text-muted">{text}</p>}
      {action && <Link href={action.href} className="btn btn-primary mt-2">{action.label}</Link>}
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "success"; children: React.ReactNode }) {
  const cls = { info: "bg-soft-blue text-primary-dark", warn: "bg-soft-yellow text-ink", error: "bg-soft-red text-[#9c1015]", success: "bg-soft-green text-[#1d5e1d]" }[kind];
  return <div role={kind === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${cls}`}>{children}</div>;
}

export function SectionTitle({ title, subtitle, href, linkLabel = "Ver todos", shortLabel = "Ver todos", id }: {
  title: string; subtitle?: string | null; href?: string; linkLabel?: string; shortLabel?: string; id?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
      <div className="min-w-0">
        <h2 id={id} className="text-[1.6rem] font-semibold leading-tight text-ink sm:text-[2rem]">{title}</h2>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} aria-label={`${linkLabel}: ${title}`} className="group inline-flex shrink-0 items-center gap-1 py-2 text-sm font-extrabold text-primary hover:underline">
          <span className="hidden sm:inline">{linkLabel}</span><span className="sm:hidden">{shortLabel}</span>
          <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
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

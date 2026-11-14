import Link from "next/link";

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>{subtitle && <p className="text-sm text-muted">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, actions, className = "" }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-4 sm:p-5 ${className}`}>
      {(title || actions) && <div className="mb-3 flex flex-wrap items-center justify-between gap-2">{title && <h2 className="text-base font-extrabold">{title}</h2>}{actions}</div>}
      {children}
    </section>
  );
}

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "red" | "yellow" | "blue" }) {
  const c = { gray: "bg-[#f0eee8] text-ink", green: "bg-soft-green text-[#1d5e1d]", red: "bg-soft-red text-[#9c1015]", yellow: "bg-soft-yellow text-ink", blue: "bg-soft-blue text-primary-dark" }[tone];
  return <span className={`chip ${c}`}>{children}</span>;
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-cream text-xs uppercase tracking-wide text-muted"><tr>{head.map((h) => <th key={h} className="px-3 py-2.5 font-extrabold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {!hasRows && <p className="p-6 text-center text-sm text-muted">{empty ?? "Nada por aqui ainda."}</p>}
    </div>
  );
}

export function Stat({ label, value, hint, href, tone }: { label: string; value: string; hint?: string; href?: string; tone?: "red" | "green" }) {
  const inner = (
    <div className={`h-full rounded-2xl border border-line bg-white p-4 ${href ? "transition hover:border-primary/40 hover:shadow-card" : ""}`}>
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone === "red" ? "text-promo" : tone === "green" ? "text-[#1d5e1d]" : ""}`}>{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function toLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  const local = new Date(d.getTime() - 3 * 3600e3); // horário de Brasília
  return local.toISOString().slice(0, 16);
}

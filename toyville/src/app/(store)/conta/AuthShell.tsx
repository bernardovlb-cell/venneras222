export function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="container-tv grid max-w-4xl gap-6 py-8 md:grid-cols-[1fr_0.8fr] md:py-12">
      <div className="card p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold text-primary-dark">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {aside && <div className="rounded-[1.5rem] bg-soft-yellow p-6 sm:p-8">{aside}</div>}
    </div>
  );
}

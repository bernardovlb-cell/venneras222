/** Página de texto simples (Sobre, Ajuda, Políticas). */
export function PaginaTexto({
  titulo,
  rascunho = false,
  children,
}: {
  titulo: string;
  rascunho?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl px-4 pt-14 lg:pt-20">
      <h1 className="title text-2xl lg:text-3xl">{titulo}</h1>
      {rascunho && (
        <p className="mt-4 border-l-2 border-amber bg-ink/[0.03] px-3 py-2 text-xs text-muted">
          [REVISAR] Rascunho — texto ainda não revisado juridicamente.
        </p>
      )}
      <div className="mt-10 space-y-5 text-[0.9375rem] leading-relaxed [&_h2]:title [&_h2]:pt-6 [&_h2]:text-base [&_li]:ml-5 [&_li]:list-disc [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </article>
  );
}

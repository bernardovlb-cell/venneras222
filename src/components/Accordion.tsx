/** Acordeão nativo (<details>): acessível por teclado e leitor de tela sem JS. */
export function Accordion({ titulo, children, aberto = false }: { titulo: string; children: React.ReactNode; aberto?: boolean }) {
  return (
    <details className="group border-b border-line" open={aberto}>
      <summary className="label flex min-h-14 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
        {titulo}
        <span aria-hidden="true" className="text-base font-normal transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="space-y-3 pb-6 text-sm leading-relaxed text-ink/85">{children}</div>
    </details>
  );
}

/**
 * Formatação simples e segura (sem HTML do usuário): "## " → subtítulo, "- " → lista,
 * parágrafos separados por linha em branco, [PENDENTE: ...] destacado.
 */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\[PENDENTE:[^\]]*\])/g);
  return <>{parts.map((p, i) => p.startsWith("[PENDENTE") ? <mark key={i} className="rounded bg-soft-yellow px-1 font-bold text-ink">{p}</mark> : p)}</>;
}

export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- "))) return <ul key={i}>{lines.map((l, j) => <li key={j}><Inline text={l.slice(2)} /></li>)}</ul>;
        return lines.map((l, j) => l.startsWith("## ") ? <h2 key={`${i}-${j}`}><Inline text={l.slice(3)} /></h2> : l.trim() ? <p key={`${i}-${j}`}><Inline text={l} /></p> : null);
      })}
    </>
  );
}

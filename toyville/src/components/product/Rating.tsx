import { StarIcon } from "../icons";

export function Rating({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Nota ${value.toFixed(1).replace(".", ",")} de 5${count != null ? `, ${count} ${count === 1 ? "avaliação" : "avaliações"}` : ""}`}>
      <span className="flex text-accent" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} size={size} filled={i <= full} className={i <= full ? "" : "text-line"} />)}
      </span>
      {count != null && <span className="text-xs font-bold text-muted" aria-hidden>({count})</span>}
    </span>
  );
}

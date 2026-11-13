"use client";
import { useEffect, useState } from "react";
import { ClockIcon } from "../icons";

/** Contagem regressiva de ofertas com prazo REAL (data de término cadastrada). */
export function Countdown({ endsAt, compact = false }: { endsAt: string; compact?: boolean }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const t = setInterval(tick, 1000);
    return () => { cancelAnimationFrame(first); clearInterval(t); };
  }, []);
  if (now === null) return null;
  const left = Math.max(0, end - now);
  if (left === 0) return <span className="text-xs font-bold text-muted">Oferta encerrada</span>;
  const d = Math.floor(left / 86400000), h = Math.floor((left % 86400000) / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className={`inline-flex items-center gap-1.5 font-extrabold tabular-nums ${compact ? "text-xs" : "text-sm"}`} role="timer" aria-live="off">
      <ClockIcon size={compact ? 14 : 16} />
      {d > 0 && `${d}d `}{pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

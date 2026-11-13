/** Faixas etárias usadas em filtros e no guia de presentes (em meses). */
export const AGE_BANDS = [
  { key: "0-12m", label: "0 a 12 meses", min: 0, max: 12 },
  { key: "1-2", label: "1 a 2 anos", min: 12, max: 36 },
  { key: "3-4", label: "3 a 4 anos", min: 36, max: 60 },
  { key: "5-7", label: "5 a 7 anos", min: 60, max: 96 },
  { key: "8-11", label: "8 a 11 anos", min: 96, max: 144 },
  { key: "12+", label: "12 anos ou mais", min: 144, max: 1200 },
] as const;

export type AgeBandKey = (typeof AGE_BANDS)[number]["key"];

export function ageBand(key: string | null | undefined) {
  return AGE_BANDS.find((b) => b.key === key) ?? null;
}

export function formatAgeRange(minM: number | null, maxM: number | null): string | null {
  if (minM == null && maxM == null) return null;
  const fmt = (m: number) => (m < 24 ? `${m} ${m === 1 ? "mês" : "meses"}` : `${Math.floor(m / 12)} anos`);
  if (minM != null && maxM == null) return `A partir de ${fmt(minM)}`;
  if (minM == null && maxM != null) return `Até ${fmt(maxM)}`;
  return `${fmt(minM!)} a ${fmt(maxM!)}`;
}

/** O produto é adequado para alguém na faixa [min,max)? Considera sobreposição de intervalos. */
export function ageOverlaps(prodMin: number | null, prodMax: number | null, bandMin: number, bandMax: number) {
  const pMin = prodMin ?? 0;
  const pMax = prodMax ?? 1200;
  return pMin < bandMax && pMax >= bandMin;
}

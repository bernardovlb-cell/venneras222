/** Faixas de orçamento do guia de presentes (valores em centavos). */
export const BUDGETS = [
  { key: "ate-50", label: "Até R$ 50", min: null, max: 5000 },
  { key: "50-100", label: "R$ 50 a R$ 100", min: 5000, max: 10000 },
  { key: "100-200", label: "R$ 100 a R$ 200", min: 10000, max: 20000 },
  { key: "200-mais", label: "Acima de R$ 200", min: 20000, max: null },
] as const;

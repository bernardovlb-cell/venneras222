import { AGE_BANDS } from "@/lib/age";

export const BUDGETS = [
  { key: "ate-50", label: "Até R$ 50", min: null, max: 5000 },
  { key: "50-100", label: "R$ 50 a R$ 100", min: 5000, max: 10000 },
  { key: "100-200", label: "R$ 100 a R$ 200", min: 10000, max: 20000 },
  { key: "200-mais", label: "Acima de R$ 200", min: 20000, max: null },
] as const;

/** Formulário GET: funciona sem JavaScript e gera URL compartilhável. */
export function GiftFinderForm({ categories, defaults = {} }: { categories: { id: string; name: string }[]; defaults?: { idade?: string; orcamento?: string; categoria?: string } }) {
  return (
    <form action="/presentes" method="get" className="card grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
      <div>
        <label className="label" htmlFor="gf-idade">Idade da criança</label>
        <select id="gf-idade" name="idade" className="field" defaultValue={defaults.idade ?? ""} required>
          <option value="" disabled>Selecione</option>
          {AGE_BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="gf-orc">Orçamento</label>
        <select id="gf-orc" name="orcamento" className="field" defaultValue={defaults.orcamento ?? ""}>
          <option value="">Qualquer valor</option>
          {BUDGETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="gf-cat">Interesse</label>
        <select id="gf-cat" name="categoria" className="field" defaultValue={defaults.categoria ?? ""}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <button type="submit" className="btn btn-primary sm:col-span-3">Ver sugestões</button>
    </form>
  );
}

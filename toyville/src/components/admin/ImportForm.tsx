"use client";
import { useActionState, useState, useTransition } from "react";
import { importAction } from "@/app/admin/actions";

export function ImportForm() {
  const [state, act, pending] = useActionState(importAction, null);
  const [file, setFile] = useState<File | null>(null);
  const [, start] = useTransition();
  const plan = state?.ok ? state.data?.plan : undefined;
  const done = state?.ok && state.data?.done;
  const send = (confirm: boolean) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("confirm", confirm ? "1" : "0");
    start(() => act(fd));
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="file">Planilha (.csv ou .xlsx)</label>
        <input id="file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="field !text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <button type="button" className="btn btn-outline btn-sm" disabled={pending || !file} onClick={() => send(false)}>{pending ? "Processando…" : "Pré-visualizar"}</button>
      {state && !state.ok && <p role="alert" className="rounded-xl bg-soft-red px-3 py-2 text-sm font-bold text-[#9c1015]">{state.error}</p>}
      {done && <p role="status" className="rounded-xl bg-soft-green px-3 py-2 text-sm font-bold text-[#1d5e1d]">{state.message}</p>}
      {plan && (
        <div className="space-y-3">
          <p className="text-sm"><strong>{file?.name}</strong>: {plan.summary.create} produto(s) novo(s), {plan.summary.update} a atualizar, {plan.summary.variants} variação(ões).</p>
          {plan.issues.length > 0 ? (
            <div className="rounded-xl bg-soft-red p-3 text-sm">
              <p className="font-extrabold text-[#9c1015]">{plan.issues.length} erro(s) — nada será importado até a correção:</p>
              <ul className="mt-2 max-h-72 list-disc space-y-0.5 overflow-auto pl-5">{plan.issues.map((i, k) => <li key={k}>Linha {i.row}, <strong>{i.field}</strong>: {i.message}</li>)}</ul>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-cream"><tr><th className="p-2">Ação</th><th className="p-2">SKU</th><th className="p-2">Nome</th><th className="p-2">Categoria</th><th className="p-2">Variações</th><th className="p-2">Status</th></tr></thead>
                  <tbody className="divide-y divide-line">{plan.products.map((p) => (
                    <tr key={p.sku}><td className="p-2 font-bold">{p.action === "create" ? "Criar" : "Atualizar"}</td><td className="p-2">{p.sku}</td><td className="p-2">{p.name}</td><td className="p-2">{p.categorySlug ?? "—"}</td>
                      <td className="p-2">{p.variants.map((v) => `${v.sku} (R$ ${(v.priceCents / 100).toFixed(2).replace(".", ",")}${v.stock != null ? `, ${v.stock} un.` : ""})`).join("; ")}</td><td className="p-2">{p.status ?? (p.action === "create" ? "rascunho" : "mantém")}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => send(true)}>{pending ? "Importando…" : "Confirmar importação"}</button>
              <p className="text-xs text-muted">A importação roda em uma única transação: se algo falhar, nada é gravado. Campos vazios não apagam dados existentes.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

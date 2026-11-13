"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettingsAction, saveShippingAction } from "@/app/admin/actions";
import type { ActionResult } from "@/server/errors";

/**
 * Formulário de configurações: serializa os campos em JSON (checkbox → boolean, data-num → número)
 * e envia para a ação que valida com o schema da configuração no servidor.
 */
function useJsonForm(action: (p: unknown, fd: FormData) => Promise<ActionResult<unknown>>) {
  const [state, act, pending] = useActionState(action, null);
  const [, start] = useTransition();
  const router = useRouter();
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  const onSubmit = (extra: (fd: FormData, obj: Record<string, unknown>) => void) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const obj: Record<string, unknown> = {};
    for (const el of Array.from(form.elements) as HTMLInputElement[]) {
      if (!el.name || el.dataset.skip !== undefined || el.type === "file") continue;
      if (el.type === "checkbox") obj[el.name] = el.checked;
      else if (el.dataset.num !== undefined) obj[el.name] = el.value === "" ? null : Number(el.value);
      else obj[el.name] = el.value;
    }
    const fd = new FormData();
    for (const el of Array.from(form.elements) as HTMLInputElement[]) if (el.type === "file" && el.files?.[0]) fd.set(el.name, el.files[0]);
    extra(fd, obj);
    start(() => act(fd));
  };
  return { state, pending, onSubmit };
}

function Feedback({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;
  const fe = !state.ok && state.fieldErrors ? Object.entries(state.fieldErrors).map(([k, v]) => `${k}: ${v}`).join(" · ") : "";
  return state.ok ? <p role="status" className="rounded-xl bg-soft-green px-3 py-2 text-sm font-bold text-[#1d5e1d]">{state.message}</p>
    : <p role="alert" className="rounded-xl bg-soft-red px-3 py-2 text-sm font-bold text-[#9c1015]">{state.error}{fe && <span className="block font-normal">{fe}</span>}</p>;
}

export function SettingsForm({ settingsKey, children }: { settingsKey: string; children: React.ReactNode }) {
  const { state, pending, onSubmit } = useJsonForm(saveSettingsAction);
  return (
    <form onSubmit={onSubmit((fd, obj) => { fd.set("key", settingsKey); fd.set("json", JSON.stringify(obj)); })} className="space-y-3">
      <Feedback state={state} />
      {children}
      <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
    </form>
  );
}

export function BenefitsForm({ initial }: { initial: { title: string; description: string; icon: string }[] }) {
  const [items, setItems] = useState(initial);
  const { state, pending, onSubmit } = useJsonForm(saveSettingsAction);
  const icons = ["truck", "shield", "card", "gift", "store", "chat", "star", "refresh"];
  return (
    <form onSubmit={onSubmit((fd) => { fd.set("key", "benefits"); fd.set("json", JSON.stringify({ items })); })} className="space-y-3">
      <Feedback state={state} />
      <p className="text-sm text-muted">Liste apenas benefícios que a loja realmente oferece (ex.: “Retirada grátis na loja”). Sem itens, a seção não aparece.</p>
      {items.map((it, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_2fr_140px_auto]">
          <input data-skip aria-label="Título" className="field !min-h-[38px] !text-sm" value={it.title} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} placeholder="Título" />
          <input data-skip aria-label="Descrição" className="field !min-h-[38px] !text-sm" value={it.description} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)))} placeholder="Descrição" />
          <select data-skip aria-label="Ícone" className="field !min-h-[38px] !text-sm" value={it.icon} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, icon: e.target.value } : x)))}>{icons.map((ic) => <option key={ic}>{ic}</option>)}</select>
          <button type="button" className="btn btn-ghost btn-sm text-promo" onClick={() => setItems(items.filter((_, k) => k !== i))}>Remover</button>
        </div>
      ))}
      <div className="flex gap-2">
        {items.length < 6 && <button type="button" className="btn btn-outline btn-sm" onClick={() => setItems([...items, { title: "", description: "", icon: "star" }])}>+ Benefício</button>}
        <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}

type Method = { id: string; type: string; name: string; isActive: boolean; config: Record<string, unknown> };

export function ShippingMethodForm({ m }: { m: Method }) {
  const { state, pending, onSubmit } = useJsonForm(saveShippingAction);
  const c = m.config as Record<string, string | number | null | { from: string; to: string }[]>;
  const ranges = (c.zipRanges as { from: string; to: string }[] | undefined) ?? [];
  return (
    <form className="space-y-3" onSubmit={onSubmit((fd, obj) => {
      fd.set("id", m.id); fd.set("name", String(obj.name ?? "")); if (obj.isActive) fd.set("isActive", "on");
      const config: Record<string, unknown> = { ...obj };
      delete config.name; delete config.isActive;
      if (m.type === "local_delivery") {
        config.zipRanges = String(obj.zipRanges ?? "").split("\n").map((l) => l.replace(/[^\d-]/g, "")).filter(Boolean).map((l) => { const [from, to] = l.split("-"); return { from, to: to || from }; });
        config.priceCents = obj.price === "" ? null : Math.round(Number(String(obj.price).replace(",", ".")) * 100);
        delete config.price;
      }
      fd.set("config", JSON.stringify(config));
    })}>
      <Feedback state={state} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm"><span className="label !text-[13px]">Nome exibido</span><input name="name" defaultValue={m.name} className="field !min-h-[38px] !text-sm" /></label>
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="isActive" defaultChecked={m.isActive} className="size-4" /> Ativa no checkout</label>
      </div>
      {m.type === "pickup" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2"><span className="label !text-[13px]">Endereço de retirada</span><input name="address" defaultValue={String(c.address ?? "")} className="field !min-h-[38px] !text-sm" /></label>
          <label className="text-sm"><span className="label !text-[13px]">Cidade</span><input name="city" defaultValue={String(c.city ?? "")} className="field !min-h-[38px] !text-sm" /></label>
          <label className="text-sm"><span className="label !text-[13px]">UF</span><input name="state" maxLength={2} defaultValue={String(c.state ?? "")} className="field !min-h-[38px] !text-sm" /></label>
          <label className="text-sm"><span className="label !text-[13px]">Horários</span><input name="hours" defaultValue={String(c.hours ?? "")} className="field !min-h-[38px] !text-sm" placeholder="Seg a sex, 9h às 18h" /></label>
          <label className="text-sm"><span className="label !text-[13px]">Prazo de preparo (dias úteis)</span><input name="prepDays" data-num type="number" min={0} defaultValue={String(c.prepDays ?? 1)} className="field !min-h-[38px] !text-sm" /></label>
          <label className="text-sm sm:col-span-2"><span className="label !text-[13px]">Instruções (documento, local de retirada…)</span><input name="instructions" defaultValue={String(c.instructions ?? "")} className="field !min-h-[38px] !text-sm" /></label>
        </div>
      )}
      {m.type === "local_delivery" && (
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-sm sm:col-span-3"><span className="label !text-[13px]">Faixas de CEP atendidas (uma por linha: inicio-fim)</span>
            <textarea name="zipRanges" rows={3} defaultValue={ranges.map((r) => `${r.from}-${r.to}`).join("\n")} className="field !text-sm" placeholder="01000000-05999999" /></label>
          <label className="text-sm"><span className="label !text-[13px]">Valor (R$)</span><input name="price" defaultValue={c.priceCents != null ? (Number(c.priceCents) / 100).toFixed(2).replace(".", ",") : ""} className="field !min-h-[38px] !text-sm" /></label>
          <label className="text-sm"><span className="label !text-[13px]">Prazo mín. (dias úteis)</span><input name="minDays" data-num type="number" min={0} defaultValue={String(c.minDays ?? 1)} className="field !min-h-[38px] !text-sm" /></label>
          <label className="text-sm"><span className="label !text-[13px]">Prazo máx. (dias úteis)</span><input name="maxDays" data-num type="number" min={0} defaultValue={String(c.maxDays ?? 3)} className="field !min-h-[38px] !text-sm" /></label>
        </div>
      )}
      {(m.type === "correios" || m.type === "carrier") && (
        <p className="rounded-xl bg-soft-yellow p-3 text-sm">Integração ainda não implementada: depende da escolha do provedor e de credenciais (veja <code>docs/INTEGRACOES.md</code>). Não é possível ativar esta modalidade sem cotação real.<input type="hidden" name="provider" value={String(c.provider ?? "")} /><input type="hidden" name="notes" value={String(c.notes ?? "")} /></p>
      )}
      <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Salvando…" : "Salvar modalidade"}</button>
    </form>
  );
}

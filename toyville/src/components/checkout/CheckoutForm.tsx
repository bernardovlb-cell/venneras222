"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { quoteShippingAction, previewTotalsAction, placeOrderAction, saveCartContactAction, type QuoteOption } from "@/app/actions/checkout";
import { Summary } from "../cart/Summary";
import { Notice } from "../ui/States";
import { formatBRL } from "@/lib/money";
import type { PricingResult } from "@/lib/pricing";
import { StoreIcon, TruckIcon, ShieldIcon } from "../icons";
import { track } from "@/lib/analytics";

type Addr = { recipient: string; phone: string; zip: string; street: string; number: string; complement: string; district: string; city: string; state: string };
const emptyAddr: Addr = { recipient: "", phone: "", zip: "", street: "", number: "", complement: "", district: "", city: "", state: "" };
const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export function CheckoutForm(props: {
  idempotencyKey: string; initialPricing: PricingResult; lines: { name: string; variant: string | null; qty: number; totalCents: number }[];
  user: { email: string; name: string; phone: string | null } | null; savedAddresses: (Addr & { id: string; label: string | null; isDefault: boolean })[];
  requireCpf: boolean;
}) {
  const [email, setEmail] = useState(props.user?.email ?? "");
  const [name, setName] = useState(props.user?.name ?? "");
  const [phone, setPhone] = useState(props.user?.phone ?? "");
  const [cpf, setCpf] = useState("");
  const def = props.savedAddresses.find((a) => a.isDefault) ?? props.savedAddresses[0];
  const [addr, setAddr] = useState<Addr>(def ? { ...emptyAddr, ...def, phone: def.phone ?? "", complement: def.complement ?? "" } : { ...emptyAddr, recipient: props.user?.name ?? "" });
  const [options, setOptions] = useState<QuoteOption[] | null>(null);
  const [unavailable, setUnavailable] = useState<{ name: string; reason: string }[]>([]);
  const [shipping, setShipping] = useState<string>("");
  const [pricing, setPricing] = useState<PricingResult>(props.initialPricing);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [quoting, startQuote] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const tracked = useRef(false);

  const selected = options?.find((o) => o.code === shipping) ?? null;
  const needsAddress = !!selected?.requiresAddress;
  const zipDigits = addr.zip.replace(/\D/g, "");

  useEffect(() => {
    if (!tracked.current) { tracked.current = true; track("begin_checkout", { value: props.initialPricing.totalCents / 100 }); }
    startQuote(async () => {
      const r = await quoteShippingAction(null);
      if (r.ok && r.data) { setOptions(r.data.options); setUnavailable(r.data.unavailable); if (r.data.options.length === 1) setShipping(r.data.options[0].code); }
    });
  }, [props.initialPricing.totalCents]);

  function calcShipping() {
    if (zipDigits.length !== 8) { setErrors((e) => ({ ...e, "address.zip": "Informe um CEP com 8 dígitos" })); return; }
    setErrors((e) => { const n = { ...e }; delete n["address.zip"]; return n; });
    startQuote(async () => {
      const r = await quoteShippingAction({ ...addr, zip: zipDigits });
      if (r.ok && r.data) { setOptions(r.data.options); setUnavailable(r.data.unavailable); if (!r.data.options.some((o) => o.code === shipping)) setShipping(""); }
      else if (!r.ok) setFormError(r.error);
    });
  }

  useEffect(() => {
    startQuote(async () => {
      const r = await previewTotalsAction(shipping || null, needsAddress ? { ...addr, zip: zipDigits } : null, email || null);
      if (r.ok && r.data) setPricing(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipping]);

  // Consentimento de lembretes: grava o contato no carrinho só quando marcado (e apaga ao desmarcar).
  function syncContact(nextConsent: boolean, nextEmail = email) {
    if (nextConsent && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nextEmail.trim())) return;
    void saveCartContactAction(nextEmail, nextConsent);
  }

  const deliveryOptions = useMemo(() => options?.filter((o) => o.requiresAddress) ?? [], [options]);
  const pickupOptions = useMemo(() => options?.filter((o) => !o.requiresAddress) ?? [], [options]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const local: Record<string, string> = {};
    if (!shipping) local.shippingCode = "Escolha como receber o pedido";
    if (!acceptTerms) local.acceptTerms = "É preciso aceitar os termos para continuar";
    if (props.requireCpf && !cpf) local.cpf = "Informe o CPF";
    if (Object.keys(local).length) { setErrors(local); document.getElementById(Object.keys(local)[0])?.focus(); return; }
    startSubmit(async () => {
      const r = await placeOrderAction({
        idempotencyKey: props.idempotencyKey, email, name, phone, cpf, shippingCode: shipping,
        address: needsAddress ? { ...addr, zip: zipDigits } : null, acceptTerms: true, marketingConsent: marketing,
      });
      if (r.ok && r.data) { window.location.assign(r.data.redirect); return; }
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const err = (k: string) => errors[k] ? <p className="error-text" id={`${k}-err`}>{errors[k]}</p> : null;
  const inv = (k: string) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined });
  const setA = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {formError && <Notice kind="error">{formError}</Notice>}

        <section className="card p-5" aria-labelledby="s1">
          <h2 id="s1" className="flex items-center gap-2 text-xl font-extrabold"><span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-white">1</span> Seus dados</h2>
          {!props.user && <p className="mt-1 text-sm text-muted">Compre sem cadastro ou <Link href="/conta/entrar?next=/checkout" className="font-bold text-primary underline">entre na sua conta</Link>.</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => marketing && syncContact(true)} className="field" {...inv("email")} />{err("email")}</div>
            <div><label className="label" htmlFor="name">Nome completo</label><input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className="field" {...inv("name")} />{err("name")}</div>
            <div><label className="label" htmlFor="phone">Celular com DDD</label><input id="phone" type="tel" autoComplete="tel-national" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="field" placeholder="(11) 98888-7777" {...inv("phone")} />{err("phone")}</div>
            <div><label className="label" htmlFor="cpf">CPF {props.requireCpf ? "" : <span className="font-normal text-muted">(opcional, para nota fiscal)</span>}</label><input id="cpf" inputMode="numeric" autoComplete="off" value={cpf} onChange={(e) => setCpf(e.target.value)} className="field" placeholder="000.000.000-00" {...inv("cpf")} />{err("cpf")}</div>
          </div>
        </section>

        <section className="card p-5" aria-labelledby="s2">
          <h2 id="s2" className="flex items-center gap-2 text-xl font-extrabold"><span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-white">2</span> Entrega ou retirada</h2>
          <fieldset className="mt-4" id="shippingCode" tabIndex={-1}>
            <legend className="sr-only">Modalidade</legend>
            {options === null && <div className="space-y-2"><div className="skeleton h-16" /><div className="skeleton h-16" /></div>}
            <div className="space-y-2">
              {pickupOptions.map((o) => (
                <label key={o.code} className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition ${shipping === o.code ? "border-primary bg-soft-blue" : "border-line hover:border-primary/40"}`}>
                  <input type="radio" name="ship" value={o.code} checked={shipping === o.code} onChange={() => setShipping(o.code)} className="mt-1 size-5 accent-[var(--tv-primary)]" />
                  <StoreIcon className="mt-0.5 shrink-0 text-primary" />
                  <span className="flex-1 text-sm">
                    <span className="flex justify-between font-extrabold"><span>{o.name}</span><span className="text-[#1d5e1d]">Grátis</span></span>
                    <span className="block text-muted">{String(o.details.address ?? "")} — {String(o.details.city ?? "")}/{String(o.details.state ?? "")}</span>
                    <span className="block text-muted">{String(o.details.hours ?? "")} · {o.etaText}</span>
                  </span>
                </label>
              ))}
              {deliveryOptions.map((o) => (
                <label key={o.code} className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition ${shipping === o.code ? "border-primary bg-soft-blue" : "border-line hover:border-primary/40"}`}>
                  <input type="radio" name="ship" value={o.code} checked={shipping === o.code} onChange={() => setShipping(o.code)} className="mt-1 size-5 accent-[var(--tv-primary)]" />
                  <TruckIcon className="mt-0.5 shrink-0 text-primary" />
                  <span className="flex-1 text-sm">
                    <span className="flex justify-between font-extrabold"><span>{o.name}</span><span>{o.priceCents === 0 ? "Grátis" : formatBRL(o.priceCents)}</span></span>
                    <span className="block text-muted">{o.etaText} após a confirmação do pagamento</span>
                  </span>
                </label>
              ))}
            </div>
            {err("shippingCode")}
          </fieldset>

          <div className="mt-4 rounded-2xl bg-cream p-4">
            <p className="text-sm font-bold">Receber em casa? Informe o CEP para ver as opções de entrega.</p>
            <div className="mt-2 flex gap-2">
              <input id="address.zip" aria-label="CEP" inputMode="numeric" autoComplete="postal-code" value={addr.zip} onChange={setA("zip")} placeholder="00000-000" className="field max-w-[180px]" {...inv("address.zip")} />
              <button type="button" onClick={calcShipping} className="btn btn-outline" disabled={quoting}>{quoting ? "Calculando…" : "Calcular"}</button>
            </div>
            {err("address.zip")}
            {options && zipDigits.length === 8 && deliveryOptions.length === 0 && (
              <p className="mt-2 text-sm text-muted">Ainda não entregamos neste CEP{unavailable.length ? "" : ""}. {pickupOptions.length ? "Você pode retirar na loja." : ""}</p>
            )}
          </div>

          {options && options.length === 0 && (
            <div className="mt-4"><Notice kind="warn">A loja ainda não configurou modalidades de entrega ou retirada. Não é possível finalizar pedidos no momento. <Link href="/atendimento" className="underline">Fale conosco</Link>.</Notice></div>
          )}

          {needsAddress && (
            <div className="mt-4 grid gap-3 sm:grid-cols-6">
              {props.savedAddresses.length > 0 && (
                <div className="sm:col-span-6">
                  <label className="label" htmlFor="saved">Endereços salvos</label>
                  <select id="saved" className="field" onChange={(e) => { const a = props.savedAddresses.find((x) => x.id === e.target.value); if (a) setAddr({ ...emptyAddr, ...a, phone: a.phone ?? "", complement: a.complement ?? "" }); }} defaultValue="">
                    <option value="">Escolher…</option>
                    {props.savedAddresses.map((a) => <option key={a.id} value={a.id}>{a.label || `${a.street}, ${a.number}`}</option>)}
                  </select>
                </div>
              )}
              <div className="sm:col-span-6"><label className="label" htmlFor="address.recipient">Quem recebe</label><input id="address.recipient" autoComplete="name" value={addr.recipient} onChange={setA("recipient")} className="field" {...inv("address.recipient")} />{err("address.recipient")}</div>
              <div className="sm:col-span-4"><label className="label" htmlFor="address.street">Rua</label><input id="address.street" autoComplete="address-line1" value={addr.street} onChange={setA("street")} className="field" {...inv("address.street")} />{err("address.street")}</div>
              <div className="sm:col-span-2"><label className="label" htmlFor="address.number">Número</label><input id="address.number" inputMode="numeric" value={addr.number} onChange={setA("number")} className="field" {...inv("address.number")} />{err("address.number")}</div>
              <div className="sm:col-span-3"><label className="label" htmlFor="address.complement">Complemento</label><input id="address.complement" autoComplete="address-line2" value={addr.complement} onChange={setA("complement")} className="field" /></div>
              <div className="sm:col-span-3"><label className="label" htmlFor="address.district">Bairro</label><input id="address.district" value={addr.district} onChange={setA("district")} className="field" {...inv("address.district")} />{err("address.district")}</div>
              <div className="sm:col-span-4"><label className="label" htmlFor="address.city">Cidade</label><input id="address.city" autoComplete="address-level2" value={addr.city} onChange={setA("city")} className="field" {...inv("address.city")} />{err("address.city")}</div>
              <div className="sm:col-span-2"><label className="label" htmlFor="address.state">UF</label>
                <select id="address.state" autoComplete="address-level1" value={addr.state} onChange={setA("state")} className="field" {...inv("address.state")}>
                  <option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}
                </select>{err("address.state")}</div>
            </div>
          )}
        </section>

        <section className="card p-5" aria-labelledby="s3">
          <h2 id="s3" className="flex items-center gap-2 text-xl font-extrabold"><span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-white">3</span> Pagamento</h2>
          <div className="mt-3 flex gap-3 rounded-2xl bg-soft-blue p-4 text-sm">
            <ShieldIcon className="shrink-0 text-primary" />
            <p>Você será direcionado ao ambiente seguro do <strong>Mercado Pago</strong> para pagar com <strong>Pix, cartão de crédito, cartão de débito ou boleto</strong> (conforme as opções habilitadas). A ToyVille não recebe os dados do seu cartão. O pedido é confirmado assim que o Mercado Pago aprovar o pagamento.</p>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <label className="flex items-start gap-2" id="acceptTerms" tabIndex={-1}>
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 size-5 accent-[var(--tv-primary)]" />
              <span>Li e aceito os <Link href="/p/termos-de-uso" target="_blank" className="font-bold text-primary underline">termos de uso</Link>, a <Link href="/p/politica-de-privacidade" target="_blank" className="font-bold text-primary underline">política de privacidade</Link> e a <Link href="/p/trocas-e-devolucoes" target="_blank" className="font-bold text-primary underline">política de trocas</Link>.</span>
            </label>
            {err("acceptTerms")}
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={marketing} onChange={(e) => { setMarketing(e.target.checked); syncContact(e.target.checked); }} className="mt-0.5 size-5 accent-[var(--tv-primary)]" />
              <span className="text-muted">Quero receber novidades, ofertas e lembretes do meu carrinho por e-mail (opcional).</span>
            </label>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="card space-y-4 p-5">
          <h2 className="text-xl font-extrabold">Resumo</h2>
          <ul className="space-y-2 text-sm">
            {props.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3"><span className="min-w-0"><span className="font-bold">{l.qty}×</span> {l.name}{l.variant ? ` — ${l.variant}` : ""}</span><span className="shrink-0 font-bold">{formatBRL(l.totalCents)}</span></li>
            ))}
          </ul>
          <div className={quoting ? "opacity-60 transition" : "transition"}><Summary pricing={pricing} shippingLabel={selected ? selected.name : undefined} /></div>
          <button type="submit" className="btn btn-primary w-full !min-h-[52px] text-base" disabled={submitting || !options?.length}>
            {submitting ? "Criando pedido…" : "Ir para o pagamento"}
          </button>
          <p className="text-center text-xs text-muted">Os itens ficam reservados enquanto aguardamos o pagamento.</p>
        </div>
      </aside>
    </form>
  );
}

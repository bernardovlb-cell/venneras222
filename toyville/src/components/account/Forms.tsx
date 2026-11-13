"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import type { ActionResult } from "@/server/errors";
import {
  loginAction, registerAction, forgotPasswordAction, resetPasswordAction, updateProfileAction, changePasswordAction,
  saveAddressAction, deleteAccountAction, openTicketAction, replyTicketAction,
} from "@/app/actions/account";
import { Notice } from "../ui/States";
import { useSubmit } from "../ui/useSubmit";

type S = ActionResult<unknown> | null;
const fe = (s: S, k: string) => (s && !s.ok ? s.fieldErrors?.[k] : undefined);

function Field({ label, name, state, type = "text", hint, ...rest }: { label: string; name: string; state: S; type?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const err = fe(state, name);
  return (
    <div>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      <input id={`f-${name}`} name={name} type={type} className="field" aria-invalid={!!err} aria-describedby={err ? `f-${name}-e` : undefined} {...rest} />
      {hint && !err && <p className="hint">{hint}</p>}
      {err && <p id={`f-${name}-e`} className="error-text">{err}</p>}
    </div>
  );
}

function Feedback({ state }: { state: S }) {
  if (!state) return null;
  if (state.ok) return state.message ? <Notice kind="success">{state.message}</Notice> : null;
  return <Notice kind="error">{state.error}</Notice>;
}

function PasswordField({ state, name = "password", label = "Senha", autoComplete = "current-password", hint }: { state: S; name?: string; label?: string; autoComplete?: string; hint?: string }) {
  const [show, setShow] = useState(false);
  const err = fe(state, name);
  return (
    <div>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      <div className="relative">
        <input id={`f-${name}`} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required className="field pr-20" aria-invalid={!!err} aria-describedby={err ? `f-${name}-e` : undefined} />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-bold text-primary hover:bg-soft-blue" aria-pressed={show}>{show ? "Ocultar" : "Mostrar"}</button>
      </div>
      {hint && !err && <p className="hint">{hint}</p>}
      {err && <p id={`f-${name}-e`} className="error-text">{err}</p>}
    </div>
  );
}

export function LoginForm({ next, staff = false, action = loginAction }: { next?: string; staff?: boolean; action?: typeof loginAction }) {
  const [state, act, pending] = useActionState(action, null);
  const submit = useSubmit(act);
  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Feedback state={state} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required state={state} />
      <PasswordField state={state} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
      {!staff && <p className="text-center text-sm"><Link href="/conta/recuperar" className="font-bold text-primary underline">Esqueci minha senha</Link></p>}
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, act, pending] = useActionState(registerAction, null);
  const submit = useSubmit(act);
  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Feedback state={state} />
      <Field label="Nome completo" name="name" autoComplete="name" required state={state} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required state={state} />
      <PasswordField state={state} autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="acceptTerms" required className="mt-0.5 size-5 accent-[var(--tv-primary)]" /><span>Aceito os <Link href="/p/termos-de-uso" target="_blank" className="font-bold text-primary underline">termos de uso</Link> e a <Link href="/p/politica-de-privacidade" target="_blank" className="font-bold text-primary underline">política de privacidade</Link>.</span></label>
      {fe(state, "acceptTerms") && <p className="error-text">{fe(state, "acceptTerms")}</p>}
      <label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" name="marketingConsent" className="mt-0.5 size-5 accent-[var(--tv-primary)]" />Quero receber novidades e ofertas por e-mail.</label>
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Criando conta…" : "Criar conta"}</button>
    </form>
  );
}

export function ForgotForm() {
  const [state, act, pending] = useActionState(forgotPasswordAction, null);
  const submit = useSubmit(act);
  if (state?.ok) return <Notice kind="success">{state.message}</Notice>;
  return (
    <form onSubmit={submit} className="space-y-4">
      <Feedback state={state} />
      <Field label="E-mail da conta" name="email" type="email" autoComplete="email" required state={state} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Enviando…" : "Enviar link"}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, act, pending] = useActionState(resetPasswordAction, null);
  const submit = useSubmit(act);
  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Feedback state={state} />
      <PasswordField state={state} label="Nova senha" autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." />
      <PasswordField state={state} name="confirm" label="Confirme a nova senha" autoComplete="new-password" />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar nova senha"}</button>
    </form>
  );
}

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string | null; marketingConsent: boolean } }) {
  const [state, act, pending] = useActionState(updateProfileAction, null);
  const submit = useSubmit(act);
  return (
    <form onSubmit={submit} className="space-y-4">
      <Feedback state={state} />
      <Field label="Nome" name="name" defaultValue={user.name} required state={state} />
      <Field label="E-mail" name="emailRO" defaultValue={user.email} disabled state={state} hint="Para alterar o e-mail, fale com o atendimento." />
      <Field label="Celular" name="phone" type="tel" defaultValue={user.phone ?? ""} state={state} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="marketingConsent" defaultChecked={user.marketingConsent} className="size-5 accent-[var(--tv-primary)]" />Receber novidades e ofertas por e-mail</label>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, act, pending] = useActionState(changePasswordAction, null);
  const submit = useSubmit(act);
  return (
    <form onSubmit={submit} className="space-y-4">
      <Feedback state={state} />
      <PasswordField state={state} name="current" label="Senha atual" />
      <PasswordField state={state} label="Nova senha" autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." />
      <button className="btn btn-outline" disabled={pending}>{pending ? "Alterando…" : "Alterar senha"}</button>
    </form>
  );
}

type Addr = { id?: string; label?: string | null; recipient?: string; phone?: string | null; zip?: string; street?: string; number?: string; complement?: string | null; district?: string; city?: string; state?: string; isDefault?: boolean };
export function AddressForm({ address, onDone }: { address?: Addr; onDone?: () => void }) {
  const [state, act, pending] = useActionState(async (p: unknown, fd: FormData) => { const r = await saveAddressAction(p, fd); if (r.ok) onDone?.(); return r; }, null);
  const submit = useSubmit(act);
  const a = address ?? {};
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-6">
      {a.id && <input type="hidden" name="id" value={a.id} />}
      <div className="sm:col-span-6"><Feedback state={state} /></div>
      <div className="sm:col-span-3"><Field label="Apelido (ex.: Casa)" name="label" defaultValue={a.label ?? ""} state={state} /></div>
      <div className="sm:col-span-3"><Field label="Quem recebe" name="recipient" defaultValue={a.recipient ?? ""} required state={state} /></div>
      <div className="sm:col-span-2"><Field label="CEP" name="zip" inputMode="numeric" defaultValue={a.zip ?? ""} required state={state} /></div>
      <div className="sm:col-span-4"><Field label="Rua" name="street" defaultValue={a.street ?? ""} required state={state} /></div>
      <div className="sm:col-span-2"><Field label="Número" name="number" defaultValue={a.number ?? ""} required state={state} /></div>
      <div className="sm:col-span-4"><Field label="Complemento" name="complement" defaultValue={a.complement ?? ""} state={state} /></div>
      <div className="sm:col-span-2"><Field label="Bairro" name="district" defaultValue={a.district ?? ""} required state={state} /></div>
      <div className="sm:col-span-3"><Field label="Cidade" name="city" defaultValue={a.city ?? ""} required state={state} /></div>
      <div className="sm:col-span-1"><Field label="UF" name="state" maxLength={2} defaultValue={a.state ?? ""} required state={state} /></div>
      <div className="sm:col-span-3"><Field label="Telefone" name="phone" type="tel" defaultValue={a.phone ?? ""} state={state} /></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="isDefault" defaultChecked={a.isDefault} className="size-5 accent-[var(--tv-primary)]" />Endereço principal</label>
      <div className="sm:col-span-6"><button className="btn btn-primary" disabled={pending}>{pending ? "Salvando…" : "Salvar endereço"}</button></div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, act, pending] = useActionState(deleteAccountAction, null);
  const submit = useSubmit(act);
  return (
    <form onSubmit={submit} className="space-y-3">
      <Feedback state={state} />
      <p className="text-sm text-muted">Seus dados de cadastro, endereços e favoritos serão apagados e o acesso encerrado. Pedidos já realizados são mantidos apenas com os dados exigidos por lei (obrigações fiscais e de consumo).</p>
      <Field label='Digite "EXCLUIR" para confirmar' name="confirm" autoComplete="off" state={state} />
      <button className="btn btn-promo" disabled={pending}>{pending ? "Excluindo…" : "Excluir minha conta"}</button>
    </form>
  );
}

export const TICKET_TYPES: [string, string][] = [
  ["question", "Dúvida"], ["exchange", "Troca"], ["return", "Devolução (produto com defeito)"], ["withdrawal", "Desistência da compra (até 7 dias do recebimento)"],
  ["complaint", "Reclamação"], ["data_access", "LGPD: acessar meus dados"], ["data_deletion", "LGPD: excluir meus dados"],
];

export function TicketForm({ defaults }: { defaults: { name?: string; email?: string; type?: string; orderNumber?: string } }) {
  const [state, act, pending] = useActionState(openTicketAction, null);
  const submit = useSubmit(act);
  if (state?.ok) return <Notice kind="success">{state.message}</Notice>;
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Feedback state={state} /></div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="f-type">Motivo</label>
        <select id="f-type" name="type" className="field" defaultValue={defaults.type ?? "question"}>{TICKET_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <Field label="Nome" name="name" defaultValue={defaults.name} required state={state} />
      <Field label="E-mail" name="email" type="email" defaultValue={defaults.email} required state={state} />
      <Field label="Telefone (opcional)" name="phone" type="tel" state={state} />
      <Field label="Número do pedido" name="orderNumber" defaultValue={defaults.orderNumber} placeholder="TV000123" state={state} hint="Obrigatório para trocas, devoluções e desistência." />
      <div className="sm:col-span-2"><Field label="Assunto" name="subject" required state={state} /></div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="f-message">Mensagem</label>
        <textarea id="f-message" name="message" rows={5} required minLength={10} className="field" aria-invalid={!!fe(state, "message")} />
        {fe(state, "message") && <p className="error-text">{fe(state, "message")}</p>}
      </div>
      <div className="hidden" aria-hidden><label>Não preencha<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="sm:col-span-2"><button className="btn btn-primary" disabled={pending}>{pending ? "Enviando…" : "Enviar solicitação"}</button></div>
    </form>
  );
}

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const [state, act, pending] = useActionState(replyTicketAction, null);
  const submit = useSubmit(act);
  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Feedback state={state} />
      <label className="label" htmlFor="reply">Responder</label>
      <textarea id="reply" name="body" rows={3} required className="field" />
      <button className="btn btn-primary btn-sm" disabled={pending}>Enviar</button>
    </form>
  );
}

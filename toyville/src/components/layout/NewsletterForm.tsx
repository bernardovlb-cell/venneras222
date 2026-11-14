"use client";
import { useActionState, useEffect, useId, useRef } from "react";
import { subscribeNewsletterAction } from "@/app/actions/newsletter";
import { useSubmit } from "../ui/useSubmit";

/**
 * Cadastro de e-mail para novidades. O consentimento é obrigatório e a confirmação só aparece
 * depois que o servidor gravou a inscrição. O campo "website" é uma isca invisível contra robôs.
 */
export function NewsletterForm({ consentText }: { consentText: string }) {
  const [state, act, pending] = useActionState(subscribeNewsletterAction, null);
  const submit = useSubmit(act);
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  const emailError = state && !state.ok ? state.fieldErrors?.email : undefined;
  const consentError = state && !state.ok ? state.fieldErrors?.consent : undefined;
  const generalError = state && !state.ok && !emailError && !consentError ? state.error : undefined;
  return (
    <form ref={form} onSubmit={submit} noValidate className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">Seu e-mail</label>
        <input id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" required placeholder="seu@email.com.br"
          aria-invalid={!!emailError} aria-describedby={emailError ? `${id}-email-erro` : undefined}
          className="min-h-[48px] w-full min-w-0 flex-1 rounded-ctl border-2 border-transparent bg-white px-4 text-base text-ink outline-none placeholder:text-muted focus:border-accent" />
        <button type="submit" disabled={pending} className="btn btn-accent min-h-[48px] shrink-0">{pending ? "Enviando…" : "Quero receber"}</button>
      </div>
      {/* isca para robôs: fora da tela, sem foco e ignorada por leitores de tela */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>Não preencha este campo<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-white/85">
        <input type="checkbox" name="consent" required aria-invalid={!!consentError} aria-describedby={consentError ? `${id}-consent-erro` : undefined}
          className="mt-0.5 size-5 shrink-0 rounded accent-[var(--tv-accent)]" />
        <span>{consentText}</span>
      </label>
      <div aria-live="polite" className="min-h-[1.25rem] text-sm font-bold">
        {state?.ok && <p role="status" className="text-accent">{state.message}</p>}
        {emailError && <p id={`${id}-email-erro`} role="alert" className="text-[#ffd1d1]">{emailError}</p>}
        {consentError && <p id={`${id}-consent-erro`} role="alert" className="text-[#ffd1d1]">{consentError}</p>}
        {generalError && <p role="alert" className="text-[#ffd1d1]">{generalError}</p>}
      </div>
    </form>
  );
}

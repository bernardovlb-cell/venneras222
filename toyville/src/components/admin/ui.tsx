"use client";
import { createContext, useActionState, useContext, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/errors";
import { useSubmit } from "../ui/useSubmit";

type S = ActionResult<unknown> | null;
const FormState = createContext<S>(null);

/** Formulário padrão do painel: envia para uma Server Action, mostra sucesso/erro e erros por campo. */
export function AdminForm({ action, children, submitLabel = "Salvar", className = "", resetOnSuccess = false, footer, onResult }: {
  action: (prev: unknown, fd: FormData) => Promise<ActionResult<unknown>>; children: React.ReactNode; submitLabel?: string | null; className?: string;
  resetOnSuccess?: boolean; footer?: React.ReactNode; onResult?: (r: ActionResult<unknown>) => void;
}) {
  const [state, act, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const submit = useSubmit(act);
  useEffect(() => {
    if (!state) return;
    onResult?.(state);
    if (state.ok) { if (resetOnSuccess) ref.current?.reset(); router.refresh(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <FormState.Provider value={state}>
      <form ref={ref} onSubmit={submit} className={`space-y-4 ${className}`}>
        {state && (state.ok ? state.message && <p role="status" className="rounded-xl bg-soft-green px-3 py-2 text-sm font-bold text-[#1d5e1d]">{state.message}</p> : <p role="alert" className="rounded-xl bg-soft-red px-3 py-2 text-sm font-bold text-[#9c1015]">{state.error}</p>)}
        {children}
        {(submitLabel || footer) && (
          <div className="flex flex-wrap items-center gap-2">
            {submitLabel && <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Salvando…" : submitLabel}</button>}
            {footer}
          </div>
        )}
      </form>
    </FormState.Provider>
  );
}

export function useFieldError(name: string) {
  const s = useContext(FormState);
  return s && !s.ok ? s.fieldErrors?.[name] : undefined;
}

export function F({ label, name, hint, className = "", as, children, ...rest }: {
  label: string; name: string; hint?: string; className?: string; as?: "textarea" | "select"; children?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement> & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const err = useFieldError(name);
  const id = `a-${name}-${rest.id ?? ""}`;
  const common = { id, name, "aria-invalid": !!err, className: "field !min-h-[40px] !text-sm", ...rest } as Record<string, unknown>;
  return (
    <div className={className}>
      <label htmlFor={id} className="label !text-[13px]">{label}</label>
      {as === "textarea" ? <textarea {...(common as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} /> : as === "select" ? <select {...(common as React.SelectHTMLAttributes<HTMLSelectElement>)}>{children}</select> : <input {...(common as React.InputHTMLAttributes<HTMLInputElement>)} />}
      {err ? <p className="error-text">{err}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Check({ label, name, defaultChecked, value }: { label: string; name: string; defaultChecked?: boolean; value?: string }) {
  return <label className="flex min-h-[36px] items-center gap-2 text-sm"><input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="size-4 accent-[var(--tv-primary)]" />{label}</label>;
}

/** Botão para ações diretas (excluir, publicar…), com confirmação opcional. */
export function ActionButton({ action, confirm: confirmText, children, className = "btn btn-outline btn-sm", onDone }: {
  action: () => Promise<ActionResult<unknown>>; confirm?: string; children: React.ReactNode; className?: string; onDone?: (r: ActionResult<unknown>) => void;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" disabled={pending} className={className}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (!r.ok) window.alert(r.error);
          onDone?.(r);
          router.refresh();
        });
      }}>
      {pending ? "…" : children}
    </button>
  );
}

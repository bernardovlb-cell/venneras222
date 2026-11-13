export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400, public field?: string) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function isNextControlFlow(e: unknown): boolean {
  const d = (e as { digest?: unknown })?.digest;
  return typeof d === "string" && /NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR)/.test(d);
}

/** Converte exceções em resultado seguro para o cliente (sem vazar detalhes internos). */
export function toActionError(e: unknown): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (isNextControlFlow(e)) throw e;
  if (e instanceof AppError) return { ok: false, error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined };
  if (e && typeof e === "object" && "issues" in e && Array.isArray((e as { issues: unknown[] }).issues)) {
    const fieldErrors: Record<string, string> = {};
    for (const i of (e as { issues: { path: (string | number)[]; message: string }[] }).issues) {
      const k = i.path.join(".");
      if (!fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { ok: false, error: "Verifique os campos destacados.", fieldErrors };
  }
  console.error("[toyville] erro inesperado", e);
  return { ok: false, error: "Não foi possível concluir a operação. Tente novamente." };
}

export function isUniqueViolation(e: unknown, constraint?: string): boolean {
  let err: unknown = e;
  for (let i = 0; i < 3 && err; i++) {
    const code = (err as { code?: string }).code;
    if (code === "23505") {
      // node-postgres usa `constraint`; postgres-js usava `constraint_name`
      const c = (err as { constraint?: string }).constraint ?? (err as { constraint_name?: string }).constraint_name;
      return !constraint || c === constraint;
    }
    err = (err as { cause?: unknown }).cause;
  }
  return false;
}

"use client";
import { useActionState, useState } from "react";
import { submitReviewAction } from "@/app/actions/account";
import { StarIcon } from "../icons";
import { Notice } from "../ui/States";

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(submitReviewAction, null);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <Notice kind="success">{state.message}</Notice>;
  return (
    <form action={action} className="card space-y-3 p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="label">Sua nota</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`} onClick={() => setRating(n)}
              className={`grid size-11 place-items-center rounded-full transition hover:scale-110 ${n <= rating ? "text-accent" : "text-line"}`}>
              <StarIcon size={28} />
            </button>
          ))}
        </div>
        {state && !state.ok && state.fieldErrors?.rating && <p className="error-text">{state.fieldErrors.rating}</p>}
      </fieldset>
      <div>
        <label className="label" htmlFor="rv-title">Título (opcional)</label>
        <input id="rv-title" name="title" maxLength={80} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="rv-body">Comentário</label>
        <textarea id="rv-body" name="body" rows={4} required minLength={10} maxLength={2000} className="field" aria-invalid={!!(state && !state.ok && state.fieldErrors?.body)} />
        {state && !state.ok && state.fieldErrors?.body && <p className="error-text">{state.fieldErrors.body}</p>}
      </div>
      {state && !state.ok && !state.fieldErrors && <Notice kind="error">{state.error}</Notice>}
      <button className="btn btn-primary" disabled={pending || rating === 0}>{pending ? "Enviando…" : "Enviar avaliação"}</button>
      <p className="hint">Avaliações são publicadas após moderação. Compras confirmadas recebem o selo “Compra verificada”.</p>
    </form>
  );
}

"use client";
import { useState, useTransition } from "react";
import { payOrderAction } from "@/app/actions/checkout";

export function PayButton({ orderId, token }: { orderId: string; token: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button type="button" className="btn btn-primary" disabled={pending}
        onClick={() => start(async () => {
          const r = await payOrderAction(orderId, token);
          if (r.ok && r.data) window.location.assign(r.data.redirect);
          else if (!r.ok) setError(r.error);
        })}>
        {pending ? "Abrindo Mercado Pago…" : "Pagar agora"}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

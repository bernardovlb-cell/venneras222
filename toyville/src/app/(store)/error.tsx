"use client";
import Link from "next/link";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-tv grid min-h-[50vh] place-items-center py-12">
      <div className="card max-w-md p-8 text-center">
        <p className="text-5xl" aria-hidden>🧩</p>
        <h1 className="mt-3 text-2xl font-extrabold">Algo saiu do lugar</h1>
        <p className="mt-2 text-muted">Não foi possível carregar esta página. Tente novamente em instantes.</p>
        <div className="mt-5 flex justify-center gap-2"><button onClick={reset} className="btn btn-primary">Tentar de novo</button><Link href="/" className="btn btn-ghost">Início</Link></div>
      </div>
    </div>
  );
}

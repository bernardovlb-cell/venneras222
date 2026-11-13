"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AddressForm } from "./Forms";
import { deleteAddressAction } from "@/app/actions/account";

type A = { id: string; label: string | null; recipient: string; phone: string | null; zip: string; street: string; number: string; complement: string | null; district: string; city: string; state: string; isDefault: boolean };

export function AddressManager({ list }: { list: A[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(list.length ? null : "new");
  const [pending, start] = useTransition();
  const router = useRouter();
  const done = () => { setEditing(null); router.refresh(); };
  return (
    <div className="space-y-3">
      {list.map((a) => (
        <div key={a.id} className="card p-4">
          {editing === a.id ? <AddressForm address={a} onDone={done} /> : (
            <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-extrabold">{a.label || "Endereço"} {a.isDefault && <span className="chip ml-1 bg-soft-blue text-primary-dark">Principal</span>}</p>
                <p className="text-muted">{a.recipient} · {a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ""} · {a.district} · {a.city}/{a.state} · CEP {a.zip}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(a.id)}>Editar</button>
                <button className="btn btn-ghost btn-sm text-promo" disabled={pending} onClick={() => { if (confirm("Excluir este endereço?")) start(async () => { await deleteAddressAction(a.id); router.refresh(); }); }}>Excluir</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {editing === "new" ? <div className="card p-4"><AddressForm onDone={done} /></div> : <button className="btn btn-primary" onClick={() => setEditing("new")}>Adicionar endereço</button>}
    </div>
  );
}

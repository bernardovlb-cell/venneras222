"use client";
import { useState } from "react";
import { ActionButton } from "./ui";
import { removeNewsletterSubscriberAction } from "@/app/admin/actions";

export function NewsletterRow({ id, email }: { id: string; email: string }) {
  return <ActionButton action={() => removeNewsletterSubscriberAction(id)} confirm={`Remover ${email} da lista?`} className="btn btn-ghost btn-sm text-promo">Remover</ActionButton>;
}

/** Lista pronta para copiar e colar na ferramenta de envio. */
export function CopyEmails({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = emails.join("\n");
  return (
    <div className="space-y-2">
      <textarea readOnly value={text} rows={Math.min(8, Math.max(3, emails.length))} aria-label="E-mails ativos" className="field !text-sm" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="btn btn-outline btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } }}>
        {copied ? "Copiado" : "Copiar e-mails"}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const CHAVE = "venneras-cookies-v1";

type Escolha = "aceito" | "recusado";

function lerEscolha(): Escolha | null {
  try {
    const v = window.localStorage.getItem(CHAVE);
    return v === "aceito" || v === "recusado" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Banner de cookies + carregamento de GA4/Meta Pixel.
 * Nada de análise carrega antes do "Aceitar". Sem IDs configurados, nem o banner aparece.
 */
export function Analytics() {
  const [escolha, setEscolha] = useState<Escolha | null | "carregando">("carregando");
  const temAnalise = Boolean(GA4_ID || PIXEL_ID);

  useEffect(() => {
    setEscolha(lerEscolha());
  }, []);

  function decidir(e: Escolha) {
    try {
      window.localStorage.setItem(CHAVE, e);
    } catch {}
    setEscolha(e);
  }

  if (!temAnalise) return null;

  return (
    <>
      {escolha === "aceito" && GA4_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA4_ID}');`}
          </Script>
        </>
      )}
      {escolha === "aceito" && PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
      {escolha === null && (
        <div
          role="region"
          aria-label="Aviso de cookies"
          className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-xl flex-col gap-3 border border-line bg-paper p-4 text-xs shadow-lg sm:flex-row sm:items-center"
        >
          <p className="flex-1 text-muted">
            Usamos cookies de análise para entender como o site é usado.{" "}
            <Link href="/politicas/privacidade" className="text-ink underline underline-offset-2">
              Saiba mais
            </Link>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => decidir("recusado")} className="label min-h-11 flex-1 border border-ink px-4 sm:flex-none">
              Recusar
            </button>
            <button type="button" onClick={() => decidir("aceito")} className="label min-h-11 flex-1 bg-ink px-4 text-paper sm:flex-none">
              Aceitar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

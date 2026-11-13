"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { CONSENT_EVENT, OPEN_PREFS_EVENT, readConsent, writeConsent, type Consent } from "./consent";

/**
 * Banner de consentimento + carregamento CONDICIONAL de rastreadores.
 * Nenhum script de análise/marketing é carregado antes do consentimento.
 * GA4/GTM → categoria "análise"; Meta Pixel → categoria "marketing".
 * Se nenhum ID estiver configurado no painel, o banner nem aparece (só há cookies essenciais).
 */
export function ConsentAndAnalytics({ ga4Id, gtmId, metaPixelId }: { ga4Id: string; gtmId: string; metaPixelId: string }) {
  const hasTrackers = !!(ga4Id || gtmId || metaPixelId);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const init = setTimeout(() => {
      const c = readConsent();
      setConsent(c);
      setAnalytics(!!c?.analytics);
      setMarketing(!!c?.marketing);
      setReady(true);
    }, 0);
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent>).detail);
    const onOpen = () => setShowPrefs(true);
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener(OPEN_PREFS_EVENT, onOpen);
    return () => { clearTimeout(init); window.removeEventListener(CONSENT_EVENT, onChange); window.removeEventListener(OPEN_PREFS_EVENT, onOpen); };
  }, []);

  if (!hasTrackers || !ready) return null;
  const decide = (a: boolean, m: boolean) => {
    const revoking = (consent?.analytics && !a) || (consent?.marketing && !m);
    writeConsent(a, m);
    setShowPrefs(false);
    if (revoking) location.reload(); // descarrega scripts já carregados
  };
  const banner = !consent || showPrefs;

  return (
    <>
      {consent?.analytics && ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4Id}',{anonymize_ip:true});`}</Script>
        </>
      )}
      {consent?.analytics && gtmId && (
        <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</Script>
      )}
      {consent?.marketing && metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}</Script>
      )}
      {banner && (
        <div role="dialog" aria-label="Preferências de cookies" className="fixed inset-x-3 bottom-3 z-[65] animate-pop-in sm:left-auto sm:right-5 sm:max-w-md">
          <div className="card border border-line p-5">
            <p className="font-display text-lg font-extrabold">Cookies 🍪</p>
            <p className="mt-1 text-sm text-muted">
              Usamos cookies essenciais para o site funcionar (carrinho e login). Com sua permissão, também usamos cookies de análise e de marketing.{" "}
              <Link href="/p/politica-de-privacidade" className="font-bold text-primary underline">Saiba mais</Link>.
            </p>
            {showPrefs && (
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2 opacity-70"><input type="checkbox" checked disabled /> Essenciais (sempre ativos)</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /> Análise (Google Analytics / Tag Manager)</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> Marketing (Meta Pixel)</label>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {showPrefs ? (
                <button className="btn btn-primary btn-sm" onClick={() => decide(analytics, marketing)}>Salvar preferências</button>
              ) : (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => decide(true, true)}>Aceitar todos</button>
                  <button className="btn btn-outline btn-sm" onClick={() => decide(false, false)}>Somente essenciais</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowPrefs(true)}>Personalizar</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

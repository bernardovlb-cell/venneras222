/** Preferências de cookies (LGPD). Necessários: sempre ativos. Análise e marketing: só com opt-in. */
export type Consent = { v: 1; analytics: boolean; marketing: boolean; at: string };
export const CONSENT_COOKIE = "tv_consent";
export const CONSENT_EVENT = "tv-consent-change";
export const OPEN_PREFS_EVENT = "tv-open-cookie-prefs";

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(CONSENT_COOKIE + "="))?.split("=")[1];
  if (!raw) return null;
  try {
    const c = JSON.parse(decodeURIComponent(raw)) as Consent;
    return c.v === 1 ? c : null;
  } catch { return null; }
}

export function writeConsent(analytics: boolean, marketing: boolean) {
  const c: Consent = { v: 1, analytics, marketing, at: new Date().toISOString() };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(c))}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
}

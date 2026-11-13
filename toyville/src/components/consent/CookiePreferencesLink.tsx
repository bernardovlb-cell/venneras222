"use client";
import { OPEN_PREFS_EVENT } from "./consent";

export function CookiePreferencesLink({ className = "text-left hover:text-accent" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_PREFS_EVENT))}>
      Preferências de cookies
    </button>
  );
}

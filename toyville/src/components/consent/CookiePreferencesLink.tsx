"use client";
import { OPEN_PREFS_EVENT } from "./consent";

export function CookiePreferencesLink() {
  return (
    <button type="button" className="text-left hover:text-accent" onClick={() => window.dispatchEvent(new Event(OPEN_PREFS_EVENT))}>
      Preferências de cookies
    </button>
  );
}

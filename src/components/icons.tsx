type P = { className?: string };

export function BagIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={className} aria-hidden="true">
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={className} aria-hidden="true">
      <path d="M4 20l1.2-3.6A8 8 0 1 1 8 19.1L4 20Z" strokeLinejoin="round" />
      <path d="M9.2 8.6c.2-.5.6-.5.9-.5h.4l.9 2-.6.8c.5 1 1.3 1.8 2.3 2.3l.8-.6 2 .9v.4c0 .3 0 .7-.5.9-1 .5-2.4.2-3.9-1-1.4-1.1-2.4-2.6-2.6-3.6-.1-.6.1-1.2.3-1.6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function InstagramIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.9" cy="7.1" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

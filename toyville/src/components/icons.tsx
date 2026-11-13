import type { SVGProps } from "react";

/** Ícones de traço único (desenho próprio), herdam a cor do texto. */
type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2,
  strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false,
});

export const SearchIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const CartIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></svg>);
export const HeartIcon = ({ size, filled, ...p }: P & { filled?: boolean }) => (<svg {...base(size)} {...p} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7-4.4-9.2-8.6C1.4 8.5 3.2 5 6.6 5c2 0 3.4 1.1 4.4 2.6C12 6.1 13.4 5 15.4 5c3.4 0 5.2 3.5 3.8 6.4C19 15.6 12 20 12 20Z" /></svg>);
export const UserIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>);
export const MenuIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const CloseIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const ChevronRight = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="m9 6 6 6-6 6" /></svg>);
export const ChevronLeft = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="m15 6-6 6 6 6" /></svg>);
export const ChevronDown = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="m6 9 6 6 6-6" /></svg>);
export const FilterIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 6h16M7 12h10M10 18h4" /></svg>);
export const MinusIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M5 12h14" /></svg>);
export const PlusIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const TrashIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>);
export const StarIcon = ({ size, filled = true, ...p }: P & { filled?: boolean }) => (<svg {...base(size)} {...p} fill={filled ? "currentColor" : "none"} strokeWidth={1.6}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" /></svg>);
export const TruckIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></svg>);
export const ShieldIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z" /><path d="m9 12 2 2 4-4" /></svg>);
export const CardIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>);
export const GiftIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-3.5-5-1.2C7 8 9 8 12 8Zm0 0c1.5-3 5-3.5 5-1.2C17 8 15 8 12 8Z" /></svg>);
export const StoreIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 9 5.5 4h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6" /></svg>);
export const ChatIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 5h16v11H9l-5 4Z" /></svg>);
export const RefreshIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" /></svg>);
export const CheckIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="m5 12 4.5 4.5L19 7" /></svg>);
export const AlertIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 3 2 20h20Z" /><path d="M12 10v4M12 17h.01" /></svg>);
export const ClockIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const BoltIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p} fill="currentColor" stroke="none"><path d="M13 2 4 14h7l-1 8 9-12h-7Z" /></svg>);
export const ZoomIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></svg>);
export const WhatsAppIcon = ({ size = 26, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false" {...p}>
    <path fill="currentColor" d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.2.6 4.4 1.7 6.3L3 29l7.3-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.7 12.7-12.6S23 3 16 3Zm0 23.2c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.3 1.1 1.2-4.2-.3-.4a10.4 10.4 0 0 1-1.6-5.5C5.3 9.8 10.1 5.1 16 5.1s10.6 4.7 10.6 10.5S21.9 26.2 16 26.2Zm5.8-7.8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.6 8.6 0 0 1-4.3-3.7c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.7 5.8 5.1 2.2.9 3 1 4.1.8.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5l-.6-.3Z" />
  </svg>
);

/* Ícones de categoria (mesmo traço dos demais). */
export const PuzzleIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 6h5a2.5 2.5 0 0 1 5 0h5v5a2.5 2.5 0 0 1 0 5v4H4Z" /></svg>);
export const CarIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M5 17H3.5a.5.5 0 0 1-.5-.5V13l2.5-5h8l3.5 5h3a1 1 0 0 1 1 1v2.5a.5.5 0 0 1-.5.5H19M9 17h6M3 13h14" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>);
export const DiceIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="4" y="4" width="16" height="16" rx="3" />{[[9, 9], [12, 12], [15, 15]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.2" fill="currentColor" stroke="none" />)}</svg>);
export const TeddyIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="7" cy="5.5" r="2.2" /><circle cx="17" cy="5.5" r="2.2" /><circle cx="12" cy="9.5" r="5" /><path d="M7.5 21c0-2.8 2-4.6 4.5-4.6s4.5 1.8 4.5 4.6Z" /><circle cx="12" cy="11" r="1.4" /></svg>);
export const DollIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="6" r="3" /><path d="M9.5 11h5l3.5 9H6Z" /></svg>);
export const BottleIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M9 9h6v10a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2ZM10 9V7.5a2 2 0 0 1 4 0V9M8 9h8M12 13h3M12 16h3" /></svg>);
export const BlocksIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="12" width="18" height="8" rx="1.5" /><rect x="7" y="6.5" width="10" height="5.5" rx="1.5" /><path d="M6.5 12v-1.5M17.5 12v-1.5M10 6.5V5M14 6.5V5" /></svg>);
export const RobotIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 8V5.5M10 16h4M3 12v3M21 12v3" /><circle cx="12" cy="4.5" r="1" /><circle cx="9.5" cy="12.5" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="12.5" r="1" fill="currentColor" stroke="none" /></svg>);
export const BallIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M3.6 9.5c5.2 2.1 11.6 2.1 16.8 0M12 3c-2.6 3.2-2.6 14.8 0 18" /></svg>);
export const RocketIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 3c3 2.5 4 6 4 10l-1.5 3h-5L8 13c0-4 1-7.5 4-10ZM8 13l-3 3v2.5l3.5-1.5M16 13l3 3v2.5L15.5 17M10.5 19.5 12 22l1.5-2.5" /><circle cx="12" cy="9.5" r="1.5" /></svg>);
export const BoxIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5ZM4 7.5 12 11l8-3.5M12 11v9" /></svg>);

/* Redes sociais (traço, mesmo desenho dos demais). */
export const InstagramIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" /></svg>);
export const FacebookIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M14 8.5V7a1.5 1.5 0 0 1 1.5-1.5H17V3h-2.5A3.5 3.5 0 0 0 11 6.5v2H8.5V11H11v10h3V11h2.5l.5-2.5Z" /></svg>);
export const TikTokIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.3 2.6 2 4.4 4.5 4.6" /></svg>);
export const YouTubeIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9.5 4.5 2.5-4.5 2.5Z" fill="currentColor" /></svg>);
export const MailIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7.5 8 6 8-6" /></svg>);
export const MapPinIcon = ({ size, ...p }: P) => (<svg {...base(size)} {...p}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z" /><circle cx="12" cy="10" r="2.3" /></svg>);

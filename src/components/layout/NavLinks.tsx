"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navPrincipal } from "./nav";

export function NavLinks({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  return (
    <ul className={`flex items-center ${className}`}>
      {navPrincipal.map((item) => {
        const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className="label relative flex min-h-11 items-center px-2 text-ink hover:opacity-70"
            >
              {item.label}
              {/* Âmbar só como sublinhado do link ativo (detalhe, nunca texto). */}
              {ativo && <span aria-hidden="true" className="absolute inset-x-2 bottom-2 h-0.5 bg-amber" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = { title: { default: "Painel", template: "%s | Painel ToyVille" }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <ToastProvider><div className="min-h-dvh bg-[#f6f4ef]">{children}</div></ToastProvider>;
}

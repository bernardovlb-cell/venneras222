import { faixaTopoTexto } from "@/config/site";

export function TopBar() {
  return (
    <div className="bg-ink px-4 py-2 text-center text-[0.75rem] tracking-[0.04em] text-paper">
      {faixaTopoTexto()}
    </div>
  );
}

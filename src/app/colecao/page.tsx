import type { Metadata } from "next";
import { Colecao } from "@/components/Colecao";

export const metadata: Metadata = {
  title: "Coleção",
  description: "Bolsas crossbody, mochilas e carteiras com curadoria Venneras.",
  alternates: { canonical: "/colecao" },
};

export default function Page() {
  return <Colecao />;
}

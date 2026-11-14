import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="text-center">
        <p className="font-display text-7xl font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-extrabold text-primary-dark">Ops! Esta página foi brincar em outro lugar.</h1>
        <p className="mt-2 text-muted">O endereço pode ter mudado ou o produto não está mais disponível.</p>
        <div className="mt-6 flex justify-center gap-3"><Link href="/" className="btn btn-primary">Ir para o início</Link><Link href="/busca" className="btn btn-outline">Ver brinquedos</Link></div>
      </div>
    </div>
  );
}

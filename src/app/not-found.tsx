import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-32 text-center">
      <p className="label text-muted">Erro 404</p>
      <h1 className="title mt-4 text-2xl">Página não encontrada</h1>
      <p className="mt-4 text-sm text-muted">O endereço pode ter mudado ou a peça saiu da coleção.</p>
      <Link href="/colecao" className="label mt-10 inline-flex min-h-12 items-center bg-ink px-8 text-paper hover:bg-ink/90">
        Ver coleção
      </Link>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="container-tv py-6" aria-busy="true" aria-label="Carregando">
      <div className="skeleton h-9 w-60" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-[1.4rem] bg-white p-3 shadow-card"><div className="skeleton aspect-square" /><div className="skeleton mt-3 h-4" /><div className="skeleton mt-2 h-4 w-2/3" /><div className="skeleton mt-3 h-9 rounded-full" /></div>)}
      </div>
    </div>
  );
}

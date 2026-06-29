// Skeleton placeholdery pre loading.tsx — zlepšujú vnímaný výkon (žiadna biela obrazovka).

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line/70 ${className}`} aria-hidden="true" />;
}

/** Mriežka kariet (katalóg, produkty). */
export function GridSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Zoznam riadkov (objednávky, faktúry). */
export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Dashboard — karty + zoznam. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <Skeleton className="h-10 w-80" />
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

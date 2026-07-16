// Skeleton košíka pri navigácii (force-dynamic) — inak prázdno počas načítania.
export default function KosikLoading() {
  return (
    <div className="grid animate-pulse gap-6 lg:grid-cols-[1fr_380px]" aria-hidden="true">
      <div className="flex flex-col gap-3">
        <div className="h-24 rounded-xl bg-line/50" />
        <div className="h-24 rounded-xl bg-line/50" />
        <div className="h-24 rounded-xl bg-line/50" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-40 rounded-2xl bg-line/40" />
        <div className="h-56 rounded-2xl bg-line/40" />
      </div>
    </div>
  );
}

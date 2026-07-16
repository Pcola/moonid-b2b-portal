// Skeleton pri navigácii medzi (force-dynamic) staff stránkami — bez neho routy pri prechode "zamrznú".
export default function StaffLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-hidden="true">
      <div className="h-7 w-52 rounded-lg bg-line/70" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-2xl bg-line/40" />
        <div className="h-24 rounded-2xl bg-line/40" />
        <div className="h-24 rounded-2xl bg-line/40" />
      </div>
      <div className="h-72 rounded-2xl bg-line/40" />
    </div>
  );
}

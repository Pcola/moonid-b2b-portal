import Link from "next/link";

// Split-screen rám pre auth stránky: vľavo brand panel, vpravo plávajúca karta s formulárom.
export function AuthShell({
  panel,
  rightMax = "max-w-[470px]",
  children,
}: {
  panel: React.ReactNode;
  rightMax?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {panel}
      <div className="relative flex items-center justify-center bg-cream p-[clamp(20px,4vw,48px)]">
        <div className="microgrid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className={`relative flex w-full flex-col gap-6 ${rightMax}`}>
          <Link href="/" className="font-display self-start text-[26px] font-semibold tracking-[-0.03em] text-brand lg:hidden">moonid<span className="text-mint-ink">.</span></Link>
          <div className="flex flex-col gap-7 rounded-[22px] border border-line bg-white p-[clamp(24px,3.4vw,44px)] shadow-[0_30px_70px_-45px_rgba(13,33,27,0.4)]">
            {children}
          </div>
          <Link href="/" className="self-center text-[13.5px] font-medium text-muted-2 transition-colors hover:text-ink">← Späť na moonid.sk</Link>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";

// Split-screen rám pre auth stránky: vľavo panel, vpravo obsah (formulár).
export function AuthShell({
  panel,
  rightMax = "max-w-[440px]",
  children,
}: {
  panel: React.ReactNode;
  rightMax?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {panel}
      <div className="flex items-center justify-center bg-white p-[clamp(28px,5vw,56px)]">
        <div className={`flex w-full flex-col gap-7 ${rightMax}`}>
          <Link href="/" className="font-display text-[26px] font-semibold tracking-[-0.03em] text-brand lg:hidden">moonid<span className="text-mint-ink">.</span></Link>
          {children}
        </div>
      </div>
    </main>
  );
}

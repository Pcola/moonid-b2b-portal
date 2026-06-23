// Ľavý zelený brand panel — zdieľaný pre login / registráciu / reset hesla.
export function AuthPanel({
  eyebrow = "Pre vašu prevádzku",
  headline,
  lead,
  children,
}: {
  eyebrow?: string;
  headline: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="relative hidden flex-col justify-between overflow-hidden p-[clamp(40px,5vw,64px)] text-mintbg lg:flex"
      style={{ background: "radial-gradient(130% 120% at 80% -10%, #21564C 0%, #163F38 55%)" }}
    >
      <div className="relative z-[2] flex items-center gap-3">
        <span className="text-[30px] font-medium tracking-[-0.02em] text-white">moonid</span>
        <span className="border-l border-white/25 pl-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-2">B2B portál</span>
      </div>

      <div className="relative z-[2] flex max-w-[440px] flex-col gap-6">
        <span className="inline-flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-mint">
          <span className="h-[1.5px] w-[26px] bg-mint" />{eyebrow}
        </span>
        <h1 className="text-white" style={{ fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.06, letterSpacing: "-0.02em", textWrap: "balance" }}>{headline}</h1>
        {lead && <p className="text-[17px] leading-relaxed text-[#b7ccc6]">{lead}</p>}
        {children && <div className="mt-1.5 border-t border-white/15 pt-5">{children}</div>}
      </div>

      <span className="relative z-[2] text-[12.5px] text-[#6e938b]">© {new Date().getFullYear()} Moonid s.r.o. · moonid@moonid.sk</span>
    </div>
  );
}

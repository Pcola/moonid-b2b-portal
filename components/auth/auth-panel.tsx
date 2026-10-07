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
      style={{ background: "radial-gradient(130% 120% at 80% -10%, #21564C 0%, #143A33 55%)" }}
    >
      <div className="microgrid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative z-[2] flex items-center gap-3">
        <span className="font-display text-[30px] font-semibold tracking-[-0.03em] text-white">moonid<span className="text-mint">.</span></span>
        {/* mint-2 na #21564C = 4,27:1 (pod AA pre 11px); mint = 5,48:1 */}
        <span className="border-l border-white/25 pl-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint">B2B portál</span>
      </div>

      <div className="relative z-[2] flex max-w-[460px] flex-col gap-6">
        <span className="eyebrow eyebrow-dark">{eyebrow}</span>
        {/* panel je `hidden lg:flex` — nadpis tu nesmie byť h1, inak pod lg stránka nemá žiadny h1.
            Skutočný h1 je názov obrazovky v pravom stĺpci. */}
        <p className="font-display font-semibold text-white" style={{ fontSize: "clamp(36px,4.2vw,56px)", lineHeight: 1.02, letterSpacing: "-0.035em", textWrap: "balance" }}>{headline}</p>
        {lead && <p className="text-[17px] leading-relaxed text-[#b7ccc6]">{lead}</p>}
        {children && <div className="mt-1.5 border-t border-white/15 pt-5">{children}</div>}
      </div>

      {/* #6e938b malo 2,48:1 na svetlejšom konci gradientu; #b7ccc6 = 4,99:1 */}
      <span className="relative z-[2] text-[12.5px] text-[#b7ccc6]">© {new Date().getFullYear()} Moonid s.r.o. · moonid@moonid.sk</span>
    </div>
  );
}

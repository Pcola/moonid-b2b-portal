import { QuickOrderForm } from "./quick-order-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rýchla objednávka — Moonid portál", robots: { index: false, follow: false } };

export default function RychlaObjednavkaPage() {
  return (
    <div className="max-w-[760px]">
      <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">Rýchla objednávka</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
        Vložte viac položiek naraz podľa kódu (SKU). Jeden riadok = jedna položka vo formáte <b className="text-ink">SKU, množstvo</b> (množstvo je nepovinné, predvolene 1). Môžete aj nahrať CSV súbor. SKU nájdete pri produkte v katalógu.
      </p>
      <QuickOrderForm />
    </div>
  );
}

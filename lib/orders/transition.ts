// Stavový automat objednávky — zdieľaný server (akcie) aj klient (badge/stepper).
// Zámerne BEZ "server-only": labely/farby potrebujú aj klientske komponenty.

export type OrderStatus = "CAKA_SCHVALENIE" | "PRIJATA" | "POTVRDENA" | "PRIPRAVUJE" | "NA_CESTE" | "DORUCENA" | "STORNO";

// Dopredný tok (STORNO je vetva mimo toku).
export const ORDER_FLOW: OrderStatus[] = ["PRIJATA", "POTVRDENA", "PRIPRAVUJE", "NA_CESTE", "DORUCENA"];

export const STEP_TITLES = ["Prijatá", "Potvrdená", "Pripravuje sa", "Na ceste", "Doručená"];

// Farby zladené s prototypom (Moonid Admin). PRIJATA = oranžová = „čaká na akciu".
export const STATUS_META: Record<OrderStatus, { label: string; fg: string; bg: string }> = {
  CAKA_SCHVALENIE: { label: "Čaká na schválenie", fg: "#8A5A00", bg: "#FDF6E7" },
  PRIJATA: { label: "Prijatá", fg: "#9A6B0E", bg: "#FBF1DC" },
  POTVRDENA: { label: "Potvrdená", fg: "#1E5249", bg: "#EAF1EE" },
  PRIPRAVUJE: { label: "Pripravuje sa", fg: "#9A6B0E", bg: "#FBF1DC" },
  NA_CESTE: { label: "Na ceste", fg: "#1A5B8A", bg: "#E2EEF7" },
  DORUCENA: { label: "Doručená", fg: "#1E5249", bg: "#EAF1EE" },
  STORNO: { label: "Stornovaná", fg: "#A23B2A", bg: "#F7E4E0" },
};

const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  PRIJATA: "Potvrdiť objednávku",
  POTVRDENA: "Začať prípravu",
  PRIPRAVUJE: "Odoslať na rozvoz",
  NA_CESTE: "Označiť ako doručené",
};

/** Ďalší stav v doprednom toku, alebo null ak je objednávka vo finálnom stave. */
export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = ORDER_FLOW.indexOf(s);
  if (i < 0 || i >= ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[i + 1];
}

/** Text tlačidla pre posun stavu, alebo null ak sa už nedá posunúť. */
export function advanceLabel(s: OrderStatus): string | null {
  return ADVANCE_LABEL[s] ?? null;
}

/** Stornovať možno len kým objednávka nie je na ceste / doručená / už stornovaná. */
export function canCancel(s: OrderStatus): boolean {
  return s === "PRIJATA" || s === "POTVRDENA" || s === "PRIPRAVUJE";
}

/** Index v stepperi (−1 pre STORNO). */
export function stepIndex(s: OrderStatus): number {
  return ORDER_FLOW.indexOf(s);
}

export function isFinal(s: OrderStatus): boolean {
  return s === "DORUCENA" || s === "STORNO";
}

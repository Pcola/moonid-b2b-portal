// Bezpečná serializácia JSON-LD do <script type="application/ld+json">.
// JSON.stringify NEescapuje '<', '>', '&' ani U+2028/U+2029 (JS line separators).
// Bez escapovania môže reťazec "</script>" v dátach (názov/popis produktu z feedu
// alebo staff vstupu) predčasne ukončiť <script> blok → stored XSS breakout.
// Pozri docs/SECURITY_AUDIT_2026-06-29.md (H-1).
const JSONLD_ESCAPE = /[<>&\u2028\u2029]/g;

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    JSONLD_ESCAPE,
    (ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

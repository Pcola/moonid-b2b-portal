// Ochrana proti open-redirect: povolí LEN lokálne (relatívne) cesty.
// next musí začínať jedným '/', nie '//' (protocol-relative) ani '/\' (backslash trik).
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next;
  return fallback;
}

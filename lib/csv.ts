/** Prefixy, ktoré tabuľkové procesory môžu interpretovať ako vzorec aj po RFC 4180 quoting-u. */
const FORMULA_PREFIX = /^[\u0000-\u0020]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]/u;

/** Bezpečná CSV bunka pre import do Excelu/Calc: formula neutralizácia + RFC 4180 escaping. */
export function csvCell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  const safe = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  return /["\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** BOM + CRLF + bodkočiarka pre slovenský Excel. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
}

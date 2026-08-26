export function fmtHoursFa(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (n === 0) return "۰ ساعت";
  // keep 2 decimals but with Persian "ساعت"
  return `${n.toFixed(2)} ساعت`;
}

export function fmtHoursOrDash(v: number | string | null | undefined, emptyLabel: string = "—"): string {
  if (v == null || v === "") return emptyLabel;
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return emptyLabel;
  return `${n.toFixed(2)} ساعت`;
}

export function fmtHMSFa(h: number | string | null | undefined): string {
  if (h == null) return "—";
  const n = Number(h);
  if (!Number.isFinite(n) || n === 0) return "—";
  const hi = Math.floor(n);
  const mi = Math.round((n - hi) * 60);
  return `${hi}:${String(mi).padStart(2, "0")}`;
}

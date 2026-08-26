export function fmtHoursFa(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (n === 0) return "۰ ساعت";

  const totalMin = Math.round(n * 60);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  if (hours === 0 && mins > 0) {
    return `${mins} دقیقه`;
  }
  if (hours > 0 && mins === 0) {
    return `${hours} ساعت`;
  }
  if (hours > 0 && mins > 0) {
    return `${hours} ساعت و ${mins} دقیقه`;
  }
  return "۰ ساعت";
}

export function fmtHoursOrDash(v: number | string | null | undefined, emptyLabel: string = "—"): string {
  if (v == null || v === "") return emptyLabel;
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return emptyLabel;
  return fmtHoursFa(n);
}

export function fmtHMSFa(h: number | string | null | undefined): string {
  if (h == null) return "—";
  const n = Number(h);
  if (!Number.isFinite(n) || n === 0) return "—";
  const totalMin = Math.round(n * 60);
  const hi = Math.floor(totalMin / 60);
  const mi = totalMin % 60;
  return `${hi}:${String(mi).padStart(2, "0")}`;
}

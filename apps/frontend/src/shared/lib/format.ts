export function formatShamsiDateText(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const MONTH_NAMES = [
    "",
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];

  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && parts[0] > 1300) {
      const jy = parts[0];
      const jm = parts[1];
      const jd = parts[2];
      const mName = MONTH_NAMES[jm] || `${jm}`;
      return `${jd} ${mName} ${jy}`;
    }
  } catch {}
  return dateStr;
}

export function fmtHoursFa(val: number | string | null | undefined): string {
  if (val == null) return "۰ دقیقه";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "۰ دقیقه";

  const totalMinutes = Math.round(Math.abs(num) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) return "۰ دقیقه";
  if (hours === 0) return `${minutes} دقیقه`;
  if (minutes === 0) return `${hours} ساعت`;
  return `${hours} ساعت و ${minutes} دقیقه`;
}

/**
 * Compact duration formatter for tight cards/chips (e.g., "۴۹:۰۷ ساعت" or "۴۹س ۷د")
 * Avoids awkward multi-word line-wrapping in small mobile cards.
 */
export function fmtHoursCompactFa(val: number | string | null | undefined): string {
  if (val == null) return "۰:۰۰";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "۰:۰۰";

  const totalMinutes = Math.round(Math.abs(num) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

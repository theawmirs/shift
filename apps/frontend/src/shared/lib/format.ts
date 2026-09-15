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
 * Compact duration formatter for tight cards/chips.
 * Human-readable Persian: "۳ دقیقه", "۲ ساعت", "۲ ساعت و ۱۵ دقیقه".
 * Avoids ambiguous H:MM output like "0:03 ساعت".
 */
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toFaDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function toAsciiDigits(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function fmtHoursCompactFa(val: number | string | null | undefined): string {
  if (val == null) return "۰ دقیقه";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "۰ دقیقه";

  const totalMinutes = Math.round(Math.abs(num) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) return "۰ دقیقه";
  if (hours === 0) return `${toFaDigits(minutes)} دقیقه`;
  if (minutes === 0) return `${toFaDigits(hours)} ساعت`;
  return `${toFaDigits(hours)} ساعت و ${toFaDigits(minutes)} دقیقه`;
}

/**
 * Computes the overtime interval [startTime, endTime] based on checkout time and overtime hours.
 * Overtime occurs in the period directly before checkout.
 * Example: outTime="19:30", overtimeHours=1.5 -> ["18:00", "19:30"]
 */
export function computeOvertimeRange(
  outTime?: string | null,
  overtimeHours?: number | string | null,
  inTime?: string | null
): [string, string] | null {
  if (!outTime || !overtimeHours) return null;
  const otNum = typeof overtimeHours === "string" ? parseFloat(overtimeHours) : overtimeHours;
  if (isNaN(otNum) || otNum <= 0) return null;

  const cleanOut = toAsciiDigits(outTime).trim();
  if (!cleanOut.includes(":")) return null;
  const [outHStr, outMStr] = cleanOut.split(":");
  const outH = parseInt(outHStr, 10);
  const outM = parseInt(outMStr, 10);
  if (isNaN(outH) || isNaN(outM)) return null;

  const outTotalM = outH * 60 + outM;
  const otTotalM = Math.round(otNum * 60);
  let startTotalM = Math.max(0, outTotalM - otTotalM);

  if (inTime) {
    const cleanIn = toAsciiDigits(inTime).trim();
    if (cleanIn.includes(":")) {
      const [inHStr, inMStr] = cleanIn.split(":");
      const inH = parseInt(inHStr, 10);
      const inM = parseInt(inMStr, 10);
      if (!isNaN(inH) && !isNaN(inM)) {
        const inTotalM = inH * 60 + inM;
        if (startTotalM < inTotalM) {
          startTotalM = inTotalM;
        }
      }
    }
  }

  const sH = String(Math.floor(startTotalM / 60)).padStart(2, "0");
  const sM = String(startTotalM % 60).padStart(2, "0");
  return [`${sH}:${sM}`, cleanOut];
}


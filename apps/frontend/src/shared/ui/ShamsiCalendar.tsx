import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ── Pure JS Jalali helpers (no deps) — same logic as jalali.py ──
const _GD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const _JD = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

function _gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  let _gy = gy - 1600,
    _gm = gm - 1,
    _gd = gd - 1;
  let gDayNo =
    365 * _gy + Math.floor((_gy + 3) / 4) - Math.floor((_gy + 99) / 100) + Math.floor((_gy + 399) / 400);
  for (let i = 0; i < _gm; i++) gDayNo += _GD[i];
  if (_gm > 1 && ((_gy % 4 === 0 && _gy % 100 !== 0) || _gy % 400 === 0)) gDayNo += 1;
  gDayNo += _gd;
  let jDayNo = gDayNo - 79;
  let jNp = Math.floor(jDayNo / 12053);
  jDayNo %= 12053;
  let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
  jDayNo %= 1461;
  if (jDayNo >= 366) {
    jy += Math.floor((jDayNo - 1) / 365);
    jDayNo = (jDayNo - 1) % 365;
  }
  let i = 0;
  for (let k = 0; k < 11; k++) {
    if (jDayNo < _JD[k]) {
      i = k;
      break;
    }
    jDayNo -= _JD[k];
    i = k + 1;
  }
  return [jy, i + 1, jDayNo + 1]; // 1-indexed month/day
}

function _jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let _jy = jy - 979,
    _jm = jm - 1,
    _jd = jd - 1;
  let jDayNo = 365 * _jy + Math.floor(_jy / 33) * 8 + Math.floor(((_jy % 33) + 3) / 4);
  for (let i = 0; i < _jm; i++) jDayNo += _JD[i];
  jDayNo += _jd;
  let gDayNo = jDayNo + 79;
  let gy = 1600 + 400 * Math.floor(gDayNo / 146097);
  gDayNo %= 146097;
  let leap = 1;
  if (gDayNo >= 36525) {
    gDayNo -= 1;
    gy += 100 * Math.floor(gDayNo / 36524);
    gDayNo %= 36524;
    if (gDayNo >= 365) gDayNo += 1;
    else leap = 0;
  }
  gy += 4 * Math.floor(gDayNo / 1461);
  gDayNo %= 1461;
  if (gDayNo >= 366) {
    leap = 0;
    gDayNo -= 1;
    gy += Math.floor(gDayNo / 365);
    gDayNo %= 365;
  }
  let i = 0;
  while (gDayNo >= _GD[i] + (i === 1 && leap ? 1 : 0)) {
    gDayNo -= _GD[i] + (i === 1 && leap ? 1 : 0);
    i++;
  }
  return [gy, i + 1, gDayNo + 1];
}

function _jalaliMonthLen(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Esfand: 29 or 30 (leap year check: jy%33 in leap set)
  const leapSet = new Set([1, 5, 9, 13, 17, 22, 26, 30]);
  return leapSet.has(jy % 33) ? 30 : 29;
}

function _todayJalali(): [number, number, number] {
  const d = new Date();
  return _gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function _pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function jalaliStr(jy: number, jm: number, jd: number): string {
  return `${jy}-${_pad(jm)}-${_pad(jd)}`;
}

const MONTHS = [
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
const WD = ["ش", "ی", "د", "س", "چ", "پ", "ج"]; // Sat..Fri Persian week (Sat first)

export interface ShamsiCalendarProps {
  value?: string;
  onPick?: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  marks?: Record<string, string>;
  onMonthChange?: (year: number, month: number, monthKey: string) => void;
}

export function ShamsiCalendar({ value, onPick, minDate, maxDate, marks, onMonthChange }: ShamsiCalendarProps) {
  // value: "YYYY-MM-DD" or ""
  const [_jy, _jm] = value ? (value.split("-").map(Number) as [number, number, number]) : _todayJalali();
  const [jy, setJy] = useState(_jy);
  const [jm, setJm] = useState(_jm);

  useEffect(() => {
    if (!value) return;
    const [vy, vm] = value.split("-").map(Number);
    if (vy !== jy || vm !== jm) {
      setJy(vy);
      setJm(vm);
    }
  }, [value, jy, jm]);

  const grid = useMemo(() => {
    const len = _jalaliMonthLen(jy, jm);
    const [gy, gm, gd] = _jalaliToGregorian(jy, jm, 1);
    // JS weekday: 0=Sun ... 6=Sat ; we want Sat=0 -> mapping: (dow+1)%7
    const dow = new Date(gy, gm - 1, gd).getDay(); // 0 Sun
    const sat0 = (dow + 1) % 7; // Sat=0
    const cells: (number | null)[] = [];
    for (let i = 0; i < sat0; i++) cells.push(null);
    for (let d = 1; d <= len; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [jy, jm]);

  const isDisabled = (d: number | null) => {
    if (d == null) return true;
    const s = jalaliStr(jy, jm, d);
    if (minDate && s < minDate) return true;
    if (maxDate && s > maxDate) return true;
    return false;
  };
  const isSelected = (d: number | null) => {
    if (d == null || !value) return false;
    return value === jalaliStr(jy, jm, d);
  };
  const isToday = (d: number | null) => {
    if (d == null) return false;
    const [ty, tm, td] = _todayJalali();
    return jy === ty && jm === tm && d === td;
  };

  const nav = (delta: number) => {
    let y = jy,
      m = jm + delta;
    while (m > 12) {
      m -= 12;
      y++;
    }
    while (m < 1) {
      m += 12;
      y--;
    }
    setJy(y);
    setJm(m);
    onMonthChange?.(y, m, `${y}-${_pad(m)}`);
  };

  const navBtnStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    minWidth: 32,
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "1.5px solid #000",
    boxShadow: "2px 2px 0 #000",
    background: "#fff",
    color: "#0F172A",
    cursor: "pointer",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "2px solid #000",
        borderRadius: 14,
        boxShadow: "4px 4px 0 #000",
        padding: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, width: "100%" }}>
        <button
          style={navBtnStyle}
          onClick={() => nav(-1)}
          aria-label="قبلی"
        >
          <ChevronRight size={14} />
        </button>
        <b className="mono" style={{ fontSize: 13, textAlign: "center", flex: 1 }}>
          {MONTHS[jm - 1]} {jy}
        </b>
        <button
          style={navBtnStyle}
          onClick={() => nav(1)}
          aria-label="بعدی"
        >
          <ChevronLeft size={14} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
        {WD.map((w) => (
          <span
            key={w}
            className="mono"
            style={{ textAlign: "center", fontSize: 10, fontWeight: 800, color: "var(--muted)" }}
          >
            {w}
          </span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {grid.map((d, i) => {
          const dis = isDisabled(d);
          const sel = isSelected(d);
          const today = isToday(d);
          const mark = d != null ? marks?.[jalaliStr(jy, jm, d)] : null;
          return (
            <button
              key={i}
              disabled={dis || d == null}
              onClick={() => d != null && onPick?.(jalaliStr(jy, jm, d))}
              className="mono"
              style={{
                aspectRatio: "1",
                borderRadius: 10,
                border: sel ? "2px solid #000" : "1px solid rgba(0,0,0,.10)",
                background: sel ? "#0F172A" : d == null ? "transparent" : "#fff",
                color: sel ? "#fff" : dis ? "rgba(0,0,0,.22)" : "#0F172A",
                fontWeight: sel ? 800 : today ? 800 : 600,
                fontSize: 12,
                cursor: dis || d == null ? "default" : "pointer",
                position: "relative",
                boxShadow: sel ? "2px 2px 0 #000" : today ? "0 0 0 2px #0F172A inset" : undefined,
                opacity: d == null ? 0 : 1,
              }}
            >
              {d != null ? d : ""}
              {mark && d != null && !sel && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: mark === "leave" ? "#2563eb" : mark === "work" ? "#10b981" : "#f59e0b",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
      {(minDate || maxDate) && (
        <small className="mono" style={{ display: "block", marginTop: 8, fontSize: 10, color: "var(--muted)" }}>
          بازه مجاز: {minDate || "—"} تا {maxDate || "—"}
        </small>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHolidaysQuery } from "../shared/api/queries";
import { Drawer } from "../shared/ui/Drawer";

// ── Pure JS Jalali helpers (matching ShamsiCalendar / jalali.py) ──
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
  return [jy, i + 1, jDayNo + 1];
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

function jalaliStr(jy: number, jm: number, jd: number): string {
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

const WD = ["شنبه", "۱ش", "۲ش", "۳ش", "۴ش", "۵ش", "جمعه"];

export function CalendarPage() {
  const [_ty, _tm, _td] = useMemo(() => _todayJalali(), []);
  const [jy, setJy] = useState(_ty);
  const [jm, setJm] = useState(_tm);
  const [selectedHoliday, setSelectedHoliday] = useState<{ date: string; name: string; isFriday?: boolean } | null>(null);

  const { data: holidaysData } = useHolidaysQuery();

  // Map holidays by date "YYYY-MM-DD"
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    if (holidaysData?.holidays) {
      for (const h of holidaysData.holidays) {
        // Normalize date format "1405-6-8" vs "1405-06-08"
        const parts = h.date.split("-");
        if (parts.length === 3) {
          const norm = `${parseInt(parts[0], 10)}-${parseInt(parts[1], 10)}-${parseInt(parts[2], 10)}`;
          map.set(norm, h.name);
          map.set(h.date, h.name);
        }
      }
    }
    return map;
  }, [holidaysData]);

  const grid = useMemo(() => {
    const len = _jalaliMonthLen(jy, jm);
    const [gy, gm, gd] = _jalaliToGregorian(jy, jm, 1);
    const dow = new Date(gy, gm - 1, gd).getDay(); // 0 Sun, 6 Sat
    const sat0 = (dow + 1) % 7; // Sat=0, Sun=1 ... Fri=6
    const cells: (number | null)[] = [];
    for (let i = 0; i < sat0; i++) cells.push(null);
    for (let d = 1; d <= len; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [jy, jm]);

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
  };

  const isToday = (d: number | null) => {
    if (d == null) return false;
    return jy === _ty && jm === _tm && d === _td;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{ display: "grid", gap: 12 }}
    >
      <div className="card">
        {/* Header navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button
            className="btn btn-ghost"
            style={{ padding: "6px 12px" }}
            onClick={() => nav(-1)}
            aria-label="ماه قبل"
          >
            <ChevronRight size={18} />
          </button>
          <div style={{ textAlign: "center" }}>
            <h2 className="display" style={{ margin: 0 }}>
              {MONTHS[jm - 1]} {jy}
            </h2>
          </div>
          <button
            className="btn btn-ghost"
            style={{ padding: "6px 12px" }}
            onClick={() => nav(1)}
            aria-label="ماه بعد"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Weekday headers: شنبه تا جمعه */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
          {WD.map((w, idx) => (
            <span
              key={w}
              className="mono"
              style={{
                textAlign: "center",
                fontSize: 11,
                fontWeight: 800,
                color: idx === 6 ? "var(--red)" : "var(--muted)",
              }}
            >
              {w}
            </span>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {grid.map((d, i) => {
            if (d == null) {
              return <div key={`empty-${i}`} style={{ aspectRatio: "1" }} />;
            }
            const dateStr = jalaliStr(jy, jm, d);
            const dateNorm = `${jy}-${jm}-${d}`;
            const isFriday = i % 7 === 6;
            const officialHolidayName = holidayMap.get(dateStr) || holidayMap.get(dateNorm);
            const isHoliday = isFriday || Boolean(officialHolidayName);
            const today = isToday(d);

            return (
              <button
                key={dateStr}
                onClick={() => {
                  if (isHoliday) {
                    setSelectedHoliday({
                      date: dateStr,
                      name: officialHolidayName || "تعطیلی آخر هفته (جمعه)",
                      isFriday,
                    });
                  }
                }}
                className="mono"
                style={{
                  aspectRatio: "1",
                  borderRadius: 12,
                  border: isHoliday ? "2px solid #ef4444" : "1px solid rgba(0,0,0,.15)",
                  background: isHoliday ? "rgba(239,68,68,0.08)" : "#fff",
                  color: isHoliday ? "#dc2626" : "#0F172A",
                  fontWeight: today ? 900 : isHoliday ? 800 : 600,
                  fontSize: 13,
                  cursor: isHoliday ? "pointer" : "default",
                  position: "relative",
                  boxShadow: today ? "0 0 0 2px #0F172A inset" : isHoliday ? "2px 2px 0 rgba(239,68,68,0.3)" : undefined,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span>{d}</span>
                {officialHolidayName && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#ef4444",
                      marginTop: 2,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)" }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, border: "1px solid #ef4444", background: "rgba(239,68,68,0.15)" }} />
          <span>روزهای قرمز: تعطیلات رسمی و جمعه‌ها (با کلیک مناسبت نمایش داده می‌شود)</span>
        </div>
      </div>

      {/* Holiday Detail Drawer */}
      <Drawer
        open={Boolean(selectedHoliday)}
        onClose={() => setSelectedHoliday(null)}
        title="مناسبت تعطیلی"
      >
        {selectedHoliday && (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="row">
              <b>تاریخ شمسی</b>
              <span className="mono" style={{ fontWeight: 800 }}>
                {selectedHoliday.date}
              </span>
            </div>
            <div className="row" style={{ borderColor: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
              <b>مناسبت</b>
              <span className="mono" style={{ fontWeight: 800, color: "#dc2626" }}>
                {selectedHoliday.name}
              </span>
            </div>
            {selectedHoliday.isFriday && (
              <small className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>
                جمعه — تعطیل هفتگی طبق قانون کار
              </small>
            )}
          </div>
        )}
      </Drawer>
    </motion.div>
  );
}

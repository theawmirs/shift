import { useState, useMemo } from "react";

const _GD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const _JD = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
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

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
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

export function jalaliMonthLen(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const leapSet = new Set([1, 5, 9, 13, 17, 22, 26, 30]);
  return leapSet.has(jy % 33) ? 30 : 29;
}

export function todayJalali(): [number, number, number] {
  const d = new Date();
  return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function jalaliStr(jy: number, jm: number, jd: number): string {
  return `${jy}-${pad2(jm)}-${pad2(jd)}`;
}

export const MONTHS = [
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

export const WD = ["شنبه", "۱ش", "۲ش", "۳ش", "۴ش", "۵ش", "جمعه"];

export function useCalendarNavigation() {
  const [_ty, _tm, _td] = useMemo(() => todayJalali(), []);
  const [jy, setJy] = useState(_ty);
  const [jm, setJm] = useState(_tm);

  const monthKey = `${jy}-${pad2(jm)}`;

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

  const grid = useMemo(() => {
    const len = jalaliMonthLen(jy, jm);
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
    const dow = new Date(gy, gm - 1, gd).getDay(); // 0 Sun, 6 Sat
    const sat0 = (dow + 1) % 7; // Sat=0, Sun=1 ... Fri=6
    const cells: (number | null)[] = [];
    for (let i = 0; i < sat0; i++) cells.push(null);
    for (let d = 1; d <= len; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [jy, jm]);

  return {
    jy,
    jm,
    setJy,
    setJm,
    monthKey,
    nav,
    isToday,
    grid,
    MONTHS,
    WD,
    _ty,
    _tm,
    _td,
  };
}

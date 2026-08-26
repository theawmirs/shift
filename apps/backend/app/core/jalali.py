"""Jalali (Shamsi) <-> Gregorian conversion — pure Python, no dependencies.
Derived from farsitools (parspooyesh), matching jdatetime 3.x / worktime CLI standard.
"""
import datetime

MONTHS_FA = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

WEEKDAY_FA = ["دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه", "یکشنبه"]

_G_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
_J_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]


def gregorian_to_jalali(gyear: int, gmonth: int, gday: int) -> tuple[int, int, int]:
    """Convert (gy, gm, gd) -> (jy, jm, jd)."""
    gy = gyear - 1600
    gm = gmonth - 1
    gd = gday - 1
    g_day_no = 365 * gy + (gy + 3) // 4 - (gy + 99) // 100 + (gy + 399) // 400
    for i in range(gm):
        g_day_no += _G_DAYS[i]
    if gm > 1 and ((gy % 4 == 0 and gy % 100 != 0) or (gy % 400 == 0)):
        g_day_no += 1
    g_day_no += gd
    j_day_no = g_day_no - 79
    j_np = j_day_no // 12053
    j_day_no %= 12053
    jy = 979 + 33 * j_np + 4 * int(j_day_no // 1461)
    j_day_no %= 1461
    if j_day_no >= 366:
        jy += (j_day_no - 1) // 365
        j_day_no = (j_day_no - 1) % 365
    i = 0
    for i in range(11):
        if not j_day_no >= _J_DAYS[i]:
            i -= 1
            break
        j_day_no -= _J_DAYS[i]
    jm = i + 2
    jd = j_day_no + 1
    return jy, jm, jd


def jalali_to_gregorian(jyear: int, jmonth: int, jday: int) -> tuple[int, int, int]:
    """Convert (jy, jm, jd) -> (gy, gm, gd)."""
    jy = jyear - 979
    jm = jmonth - 1
    jd = jday - 1
    j_day_no = 365 * jy + int(jy // 33) * 8 + (jy % 33 + 3) // 4
    for i in range(jm):
        j_day_no += _J_DAYS[i]
    j_day_no += jd
    g_day_no = j_day_no + 79
    gy = 1600 + 400 * int(g_day_no // 146097)
    g_day_no = g_day_no % 146097
    leap = 1
    if g_day_no >= 36525:
        g_day_no -= 1
        gy += 100 * int(g_day_no // 36524)
        g_day_no = g_day_no % 36524
        if g_day_no >= 365:
            g_day_no += 1
        else:
            leap = 0
    gy += 4 * int(g_day_no // 1461)
    g_day_no %= 1461
    if g_day_no >= 366:
        leap = 0
        g_day_no -= 1
        gy += g_day_no // 365
        g_day_no = g_day_no % 365
    i = 0
    while g_day_no >= _G_DAYS[i] + (1 if (i == 1 and leap) else 0):
        g_day_no -= _G_DAYS[i] + (1 if (i == 1 and leap) else 0)
        i += 1
    return gy, i + 1, g_day_no + 1


def jalali_date_str(jy: int, jm: int, jd: int) -> str:
    return "%04d-%02d-%02d" % (jy, jm, jd)


def weekday_fa(gy: int, gm: int, gd: int) -> str:
    return WEEKDAY_FA[datetime.date(gy, gm, gd).weekday()]


def is_friday(gy: int, gm: int, gd: int) -> bool:
    return datetime.date(gy, gm, gd).weekday() == 4

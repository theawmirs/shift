import sqlite3
import datetime
import os
from collections import Counter
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from app.core.config import settings
from app.core import jalali
from app.services import record_service, leave_service

def current_month_key() -> str:
    s = record_service.today_str()
    return s[:7]

def month_days(jy: int, jm: int) -> list[str]:
    days_in_month = 31 if jm <= 6 else (30 if jm <= 11 else 29)
    # Check 30 for Esfand if leap year
    if jm == 12:
        try:
            gy, gm, gd = jalali.jalali_to_gregorian(jy, 12, 30)
            jy2, jm2, jd2 = jalali.gregorian_to_jalali(gy, gm, gd)
            if (jy2, jm2, jd2) == (jy, 12, 30):
                days_in_month = 30
        except Exception:
            pass
    return [jalali.jalali_date_str(jy, jm, d) for d in range(1, days_in_month + 1)]

def leave_balance(conn: sqlite3.Connection, jy: int, user_id: int | None = None) -> tuple[float, float]:
    row = conn.execute("SELECT value FROM settings WHERE key='leave_quota_hours'").fetchone()
    quota = float(row["value"]) if row else 208.0
    
    # Calculate hourly leave from all events in year
    if user_id is None:
        rows = conn.execute("SELECT shamsi_date FROM events WHERE substr(shamsi_date,1,4)=? AND user_id IS NULL GROUP BY shamsi_date", (f"{jy:04d}",)).fetchall()
    else:
        rows = conn.execute("SELECT shamsi_date FROM events WHERE substr(shamsi_date,1,4)=? AND user_id=? GROUP BY shamsi_date", (f"{jy:04d}", user_id)).fetchall()
    
    hourly_total = 0.0
    for r in rows:
        d = record_service.compute_day(conn, r["shamsi_date"], user_id=user_id)
        hourly_total += d["leave"]
        
    return quota, hourly_total

def compute_month(conn: sqlite3.Connection, month_key: str, user_id: int | None = None) -> dict:
    parts = month_key.split("-")
    jy, jm = int(parts[0]), int(parts[1])
    m_name = jalali.MONTHS_FA[jm - 1]
    days = month_days(jy, jm)

    rows = []
    total_net = 0.0
    total_gross = 0.0
    total_leave = 0.0
    total_ot = 0.0
    total_deficit = 0.0
    total_late = 0.0
    late_days = 0
    work_days = 0
    holiday_days = 0
    holiday_worked = 0
    remote_days = 0

    for sdate in days:
        d = record_service.compute_day(conn, sdate, user_id=user_id)
        if d["is_holiday"]:
            holiday_days += 1
            if d["has_events"]:
                holiday_worked += 1
        else:
            if d["has_events"]:
                work_days += 1

        if d["has_events"]:
            rows.append(d)
            total_net += d["net"]
            total_gross += d["gross"]
            total_leave += d["leave"]
            if d["ot_declared"]:
                total_ot += d["overtime"]
            total_deficit += d["deficit"]
            if d["late"] > 0:
                total_late += d["late"]
                late_days += 1
            if d["work_mode"] == "remote":
                remote_days += 1

    return {
        "month_key": month_key,
        "month_name": m_name,
        "jy": jy,
        "jm": jm,
        "rows": rows,
        "net": total_net,
        "gross": total_gross,
        "leave": total_leave,
        "overtime": total_ot,
        "deficit": total_deficit,
        "late_total": total_late,
        "late_days": late_days,
        "work_days": work_days,
        "holiday_days": holiday_days,
        "holiday_worked": holiday_worked,
        "remote_days": remote_days,
    }

def get_month_report(conn: sqlite3.Connection, month_key: str | None = None, user_id: int | None = None) -> dict:
    mk = month_key or current_month_key()
    m = compute_month(conn, mk, user_id=user_id)
    
    # Overlay daily leaves
    days = m.get("rows", [])
    dl_by_date = {}
    for d in days:
        s = d.get("date")
        dl = leave_service.daily_leave_for_date(conn, s, user_id=user_id)
        if dl:
            dl_by_date[s] = dl

    summary = Counter()
    workday_dl = 0
    for s, dl in dl_by_date.items():
        summary[dl["type"]] += 1
        is_hol, _ = record_service.holiday_name(conn, s)
        if not is_hol:
            workday_dl += 1

    m_leave_adj = m["leave"] + workday_dl * 8.0
    jy = m["jy"]
    quota, hourly_consumed = leave_balance(conn, jy, user_id=user_id)
    annual_daily = leave_service.daily_leave_annual_hours_in_year(conn, user_id, jy) if user_id is not None else 0.0
    consumed_total = hourly_consumed + annual_daily

    leave_bal_info = {
        "quota": round(quota, 2),
        "consumed": round(consumed_total, 2),
        "remaining": round(max(0.0, quota - consumed_total), 2),
        "hourly": round(hourly_consumed, 2),
        "daily_annual": round(annual_daily, 2),
    }

    totals = {
        "net": round(m["net"], 2),
        "gross": round(m["gross"], 2),
        "leave": round(m_leave_adj, 2),
        "overtime": round(m["overtime"], 2),
        "deficit": round(m["deficit"], 2),
        "late_total": round(m["late_total"], 2),
        "late_days": m["late_days"],
        "work_days": m["work_days"],
        "holiday_days": m["holiday_days"],
        "holiday_worked": m["holiday_worked"],
        "remote_days": m["remote_days"],
    }

    report_text = f"گزارش ماه {m['month_name']} {m['jy']}\nکارکرد خالص: {totals['net']} ساعت\nکسری کار: {totals['deficit']} ساعت\nاضافه کار: {totals['overtime']} ساعت"

    return {
        "month_key": mk,
        "month_name": m["month_name"],
        "year": jy,
        "month": m["jm"],
        "rows": [record_service.day_payload(conn, d["date"], user_id=user_id) for d in m["rows"]],
        "totals": totals,
        "leave_balance": leave_bal_info,
        "daily_leaves_summary": dict(summary),
        "text": report_text,
    }

def get_week_report(conn: sqlite3.Connection, user_id: int | None = None) -> dict:
    base = record_service.now_tehran()
    jy, jm, jd = jalali.gregorian_to_jalali(base.year, base.month, base.day)
    gy, gm, gd = jalali.jalali_to_gregorian(jy, jm, jd)
    today_date = datetime.date(gy, gm, gd)
    start_date = today_date - datetime.timedelta(days=(today_date.weekday() - 5) % 7)
    
    days = []
    total_net = total_ot = total_def = total_leave = 0.0
    remote_days_w = 0
    work_days = 0
    
    for i in range(7):
        cur = start_date + datetime.timedelta(days=i)
        if cur > today_date:
            break
        cj = jalali.gregorian_to_jalali(cur.year, cur.month, cur.day)
        sdate = jalali.jalali_date_str(*cj)
        d = record_service.compute_day(conn, sdate, user_id=user_id)
        if not d["has_events"]:
            continue
        dp = record_service.day_payload(conn, sdate, user_id=user_id)
        days.append({
            "label": f"{jalali.weekday_fa(cur.year, cur.month, cur.day)} {cj[2]} {jalali.MONTHS_FA[cj[1]-1]}",
            **dp,
        })
        total_net += d["net"]
        total_ot += d["overtime"] if d["ot_declared"] else 0.0
        total_def += d["deficit"]
        total_leave += d["leave"]
        work_days += 1
        if d["work_mode"] == "remote":
            remote_days_w += 1

    totals = {
        "net": round(total_net, 2),
        "overtime": round(total_ot, 2),
        "deficit": round(total_def, 2),
        "leave": round(total_leave, 2),
        "work_days": work_days,
        "remote_days": remote_days_w,
    }
    report_text = f"گزارش هفته:\nروزهای کاری: {work_days}\nمجموع کارکرد: {totals['net']} ساعت"

    return {
        "days": days,
        "totals": totals,
        "text": report_text,
    }

def export_excel(conn: sqlite3.Connection, month_key: str | None = None, user_id: int | None = None) -> str:
    mk = month_key or current_month_key()
    m = compute_month(conn, mk, user_id=user_id)
    os.makedirs(settings.EXPORTS_DIR, exist_ok=True)
    out_path = os.path.join(settings.EXPORTS_DIR, f"گزارش {m['month_name']} {m['jy']}.xlsx")

    wb = Workbook()
    ws = wb.active
    ws.title = f"{m['month_name']} {m['jy']}"
    ws.views.sheetView[0].rightToLeft = True

    # Header
    headers = ["تاریخ", "روز", "وضعیت", "ورود", "خروج", "ناخالص", "مرخصی", "خالص", "کسری", "اضافه‌کار", "حالت"]
    ws.append(headers)

    header_font = Font(name="Tahoma", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
    align_center = Alignment(horizontal="center", vertical="center")

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = align_center

    for d in m["rows"]:
        dp = record_service.day_payload(conn, d["date"], user_id=user_id)
        ws.append([
            dp["date"],
            dp["weekday"],
            dp["day_status_label"],
            dp["in"] or "-",
            dp["out"] or "-",
            dp["gross"],
            dp["leave"],
            dp["net"],
            dp["deficit"],
            dp["overtime"],
            dp["work_mode_label"],
        ])

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    wb.save(out_path)
    return out_path

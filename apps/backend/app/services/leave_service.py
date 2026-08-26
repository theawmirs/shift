import sqlite3
import datetime
from app.core.config import settings
from app.core import jalali
from app.services import record_service

DAILY_LEAVE_TYPES = ("annual", "sick", "unpaid", "casual")
DAILY_LEAVE_LABEL = {"annual": "استحقاقی", "sick": "استعلاجی", "unpaid": "بدون‌حقوق", "casual": "ضروری"}

def daily_leave_for_date(conn: sqlite3.Connection, sdate: str, user_id: int | None = None) -> dict | None:
    if user_id is None:
        return None
    row = conn.execute(
        "SELECT id, start_date, end_date, type, reason, hours, created_at FROM daily_leaves WHERE user_id=? AND start_date <= ? AND end_date >= ? LIMIT 1",
        (user_id, sdate, sdate),
    ).fetchone()
    if row:
        d = dict(row)
        d["label"] = DAILY_LEAVE_LABEL.get(d["type"], d["type"])
        return d
    return None

def workdays_in_range(conn: sqlite3.Connection, start_date: str, end_date: str) -> int:
    try:
        jy1, jm1, jd1 = map(int, start_date.split("-"))
        jy2, jm2, jd2 = map(int, end_date.split("-"))
        gy1, gm1, gd1 = jalali.jalali_to_gregorian(jy1, jm1, jd1)
        gy2, gm2, gd2 = jalali.jalali_to_gregorian(jy2, jm2, jd2)
        cur = datetime.date(gy1, gm1, gd1)
        end = datetime.date(gy2, gm2, gd2)
        cnt = 0
        while cur <= end:
            cj = jalali.gregorian_to_jalali(cur.year, cur.month, cur.day)
            s = jalali.jalali_date_str(*cj)
            is_hol, _ = record_service.holiday_name(conn, s)
            if not is_hol:
                cnt += 1
            cur += datetime.timedelta(days=1)
        return cnt
    except Exception:
        return 0

def daily_leave_overlaps(conn: sqlite3.Connection, user_id: int, start_date: str, end_date: str) -> bool:
    row = conn.execute(
        "SELECT id FROM daily_leaves WHERE user_id=? AND start_date <= ? AND end_date >= ? LIMIT 1",
        (user_id, end_date, start_date),
    ).fetchone()
    return bool(row)

def daily_leave_annual_hours_in_year(conn: sqlite3.Connection, user_id: int, jy: int) -> float:
    rows = conn.execute(
        "SELECT hours FROM daily_leaves WHERE user_id=? AND type='annual' AND substr(start_date,1,4)=?",
        (user_id, f"{jy:04d}"),
    ).fetchall()
    return sum(float(r["hours"] or 0) for r in rows)

def today_shamsi_plus_days(n: int) -> str:
    s = record_service.today_str()
    jy, jm, jd = map(int, s.split("-"))
    gy, gm, gd = jalali.jalali_to_gregorian(jy, jm, jd)
    cur = datetime.date(gy, gm, gd) + datetime.timedelta(days=n)
    ny, nm, nd = jalali.gregorian_to_jalali(cur.year, cur.month, cur.day)
    return jalali.jalali_date_str(ny, nm, nd)

def create_daily_leave(conn: sqlite3.Connection, user_id: int, start_date: str, end_date: str, leave_type: str, reason: str | None) -> dict:
    if leave_type not in DAILY_LEAVE_TYPES:
        raise ValueError("نوع مرخصی باید یکی از annual/sick/unpaid/casual باشد")
    
    today = record_service.today_str()
    max_date = today_shamsi_plus_days(30)
    if start_date < today:
        raise ValueError("تاریخ شروع نمی‌تواند قبل از امروز باشد")
    if end_date > max_date:
        raise ValueError("تاریخ پایان حداکثر تا 30 روز بعد از امروز")
    
    workdays = workdays_in_range(conn, start_date, end_date)
    if workdays == 0:
        raise ValueError("بازه شامل روز کاری نیست (فقط جمعه/تعطیل)")
    
    if daily_leave_overlaps(conn, user_id, start_date, end_date):
        raise ValueError("این بازه با یک مرخصی روزانه دیگر هم‌پوشانی دارد")
    
    hours = float(workdays * 8)
    if leave_type == "annual":
        jy = int(start_date.split("-")[0])
        from app.db.schema import get_user_settings
        u_settings = get_user_settings(conn, user_id=user_id)
        quota = float(u_settings.get("leave_quota_hours", "208") or 208.0)
        from app.services import report_service
        _, hourly_consumed = report_service.leave_balance(conn, jy, user_id=user_id)
        annual_daily = daily_leave_annual_hours_in_year(conn, user_id, jy)
        remaining = quota - hourly_consumed - annual_daily
        if hours > remaining:
            raise ValueError(f"سهمیه استحقاقی کافی نیست — مانده {max(0, remaining):.1f} ساعت")
            
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    cur = conn.execute(
        "INSERT INTO daily_leaves(user_id, start_date, end_date, type, reason, hours, created_at) VALUES(?,?,?,?,?,?,?)",
        (user_id, start_date, end_date, leave_type, reason, hours, now_iso),
    )
    conn.commit()
    lid = cur.lastrowid
    return {
        "id": lid,
        "start_date": start_date,
        "end_date": end_date,
        "type": leave_type,
        "reason": reason,
        "hours": hours,
        "work_days_count": workdays,
        "label": DAILY_LEAVE_LABEL.get(leave_type, leave_type),
    }

def delete_daily_leave(conn: sqlite3.Connection, user_id: int, lid: int) -> bool:
    row = conn.execute("SELECT id, start_date FROM daily_leaves WHERE id=? AND user_id=?", (lid, user_id)).fetchone()
    if not row:
        return False
    today = record_service.today_str()
    if row["start_date"] <= today:
        raise ValueError("مرخصی شروع شده، قابل لغو نیست")
    conn.execute("DELETE FROM daily_leaves WHERE id=?", (lid,))
    conn.commit()
    return True

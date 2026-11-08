import re
import datetime
from typing import Any
from app.services import record_service

def parse_time_minutes(time_str: str) -> int:
    raw = (time_str or "").strip()
    m = re.match(r"^(\d{1,2}):(\d{2})$", raw)
    if not m:
        raise ValueError("فرمت ساعت باید HH:MM باشد")
    hh, mm = int(m.group(1)), int(m.group(2))
    if hh < 0 or hh > 23 or mm < 0 or mm > 59:
        raise ValueError("ساعت وارد شده نامعتبر است")
    return hh * 60 + mm

def format_time_str(time_str: str) -> str:
    raw = (time_str or "").strip()
    m = re.match(r"^(\d{1,2}):(\d{2})$", raw)
    if not m:
        raise ValueError("فرمت ساعت باید HH:MM باشد")
    hh, mm = int(m.group(1)), int(m.group(2))
    return f"{hh:02d}:{mm:02d}"

def compute_session_hours(start_time: str, end_time: str) -> tuple[float, bool]:
    start_fmt = format_time_str(start_time)
    end_fmt = format_time_str(end_time)
    if start_fmt == end_fmt:
        raise ValueError("ساعت شروع و پایان نمی‌تواند یکسان باشد")
    
    start_m = parse_time_minutes(start_fmt)
    end_m = parse_time_minutes(end_fmt)
    
    if end_m < start_m:
        is_overnight = True
        duration_m = (end_m + 24 * 60) - start_m
    else:
        is_overnight = False
        duration_m = end_m - start_m
        
    hours = round(duration_m / 60.0, 2)
    if hours > 16.0:
        raise ValueError("مدت اضافه‌کاری نمی‌تواند بیشتر از ۱۶ ساعت باشد")
    return hours, is_overnight

def create_overtime_session(
    conn: Any,
    user_id: int,
    sdate: str,
    start_time: str,
    end_time: str,
    mode: str = "office",
    description: str | None = None,
) -> dict[str, Any]:
    # Validate date
    record_service.parse_date(sdate)
    start_fmt = format_time_str(start_time)
    end_fmt = format_time_str(end_time)
    mode_clean = "remote" if mode in ("remote", "دورکار", "دورکاری") else "office"
    
    hours, is_overnight = compute_session_hours(start_fmt, end_fmt)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    cur = conn.execute(
        "INSERT INTO overtime_sessions(user_id, shamsi_date, start_time, end_time, hours, mode, is_overnight, description, created_at) "
        "VALUES(?,?,?,?,?,?,?,?,?)",
        (user_id, sdate, start_fmt, end_fmt, hours, mode_clean, is_overnight, description.strip() if description else None, now_iso),
    )
    conn.commit()
    
    sid = getattr(cur, "lastrowid", None)
    if not sid:
        row = conn.execute(
            "SELECT id FROM overtime_sessions WHERE user_id=? AND shamsi_date=? AND created_at=? LIMIT 1",
            (user_id, sdate, now_iso),
        ).fetchone()
        if row:
            sid = row["id"] if (isinstance(row, dict) or hasattr(row, "keys")) else row[0]
            
    return {
        "id": sid or 0,
        "user_id": user_id,
        "shamsi_date": sdate,
        "start_time": start_fmt,
        "end_time": end_fmt,
        "hours": hours,
        "mode": mode_clean,
        "is_overnight": is_overnight,
        "description": description.strip() if description else None,
        "created_at": now_iso,
    }

def list_overtime_sessions_for_date(conn: Any, user_id: int | None, sdate: str) -> list[dict[str, Any]]:
    if user_id is None:
        return []
    try:
        rows = conn.execute(
            "SELECT id, user_id, shamsi_date, start_time, end_time, hours, mode, is_overnight, description, created_at "
            "FROM overtime_sessions WHERE user_id=? AND shamsi_date=? ORDER BY start_time ASC",
            (user_id, sdate),
        ).fetchall()
        return [dict(r) for r in rows]
    except Exception:
        return []

def list_overtime_sessions_for_month(conn: Any, user_id: int | None, month_key: str) -> list[dict[str, Any]]:
    if user_id is None:
        return []
    try:
        rows = conn.execute(
            "SELECT id, user_id, shamsi_date, start_time, end_time, hours, mode, is_overnight, description, created_at "
            "FROM overtime_sessions WHERE user_id=? AND substr(shamsi_date,1,7)=? ORDER BY shamsi_date ASC, start_time ASC",
            (user_id, month_key),
        ).fetchall()
        return [dict(r) for r in rows]
    except Exception:
        return []

def delete_overtime_session(conn: Any, user_id: int, session_id: int) -> bool:
    row = conn.execute(
        "SELECT id FROM overtime_sessions WHERE id=? AND user_id=?",
        (session_id, user_id),
    ).fetchone()
    if not row:
        return False
    conn.execute("DELETE FROM overtime_sessions WHERE id=? AND user_id=?", (session_id, user_id))
    conn.commit()
    return True

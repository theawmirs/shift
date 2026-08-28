import datetime
import re
import sqlite3
from app.core.config import settings
from app.core import jalali

DAY_STATUS_LABELS = {
    "idle": "آماده ورود",
    "working": "مشغول به کار",
    "on_leave": "در مرخصی ساعتی",
    "done": "پایان روز کاری",
    "holiday": "تعطیل",
}

WORK_MODE_LABEL = {
    "office": "حضوری",
    "remote": "دورکاری",
}

def now_tehran() -> datetime.datetime:
    return datetime.datetime.now(settings.tehran_tz)

def today_str() -> str:
    now = now_tehran()
    jy, jm, jd = jalali.gregorian_to_jalali(now.year, now.month, now.day)
    return f"{jy:04d}-{jm:02d}-{jd:02d}"

def parse_date(s: str) -> tuple[int, int, int]:
    try:
        parts = s.split("-")
        return int(parts[0]), int(parts[1]), int(parts[2])
    except Exception:
        raise ValueError(f"فرمت تاریخ نامعتبر است: {s}")

def holiday_name(conn: sqlite3.Connection, sdate: str) -> tuple[bool, str | None]:
    row = conn.execute("SELECT name FROM holidays WHERE date=?", (sdate,)).fetchone()
    if row:
        return True, row["name"]
    jy, jm, jd = parse_date(sdate)
    gy, gm, gd = jalali.jalali_to_gregorian(jy, jm, jd)
    dt = datetime.date(gy, gm, gd)
    if dt.weekday() == 4: # Friday
        return True, "جمعه"
    return False, None

def get_work_mode(conn: sqlite3.Connection, sdate: str, user_id: int | None = None) -> str:
    if user_id is None:
        row = conn.execute("SELECT mode FROM day_work_mode WHERE shamsi_date=? AND user_id IS NULL", (sdate,)).fetchone()
    else:
        row = conn.execute("SELECT mode FROM day_work_mode WHERE shamsi_date=? AND user_id=?", (sdate, user_id)).fetchone()
    return row["mode"] if row else "office"

def set_work_mode(conn: sqlite3.Connection, sdate: str, mode: str, user_id: int | None = None) -> None:
    if user_id is None:
        conn.execute("INSERT OR REPLACE INTO day_work_mode(shamsi_date, mode, user_id) VALUES(?, ?, NULL)", (sdate, mode))
    else:
        conn.execute("INSERT OR REPLACE INTO day_work_mode(shamsi_date, mode, user_id) VALUES(?, ?, ?)", (sdate, mode, user_id))
    conn.commit()

def toggle_work_mode(conn: sqlite3.Connection, sdate: str, user_id: int | None = None) -> str:
    cur = get_work_mode(conn, sdate, user_id)
    new_m = "remote" if cur == "office" else "office"
    set_work_mode(conn, sdate, new_m, user_id)
    return new_m

def day_events(conn: sqlite3.Connection, sdate: str, user_id: int | None = None) -> list[tuple[str, datetime.datetime, str | None]]:
    if user_id is None:
        rows = conn.execute(
            "SELECT event_type, ts_utc, note FROM events WHERE shamsi_date=? AND user_id IS NULL ORDER BY ts_utc ASC",
            (sdate,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT event_type, ts_utc, note FROM events WHERE shamsi_date=? AND user_id=? ORDER BY ts_utc ASC",
            (sdate, user_id),
        ).fetchall()
    res = []
    for r in rows:
        dt_utc = datetime.datetime.fromisoformat(r["ts_utc"])
        dt_tehran = dt_utc.astimezone(settings.tehran_tz)
        res.append((r["event_type"], dt_tehran, r["note"]))
    return res

def company_clock(dt: datetime.datetime) -> datetime.datetime:
    return dt

def fmt_company_time(dt: datetime.datetime | None) -> str | None:
    if not dt:
        return None
    return dt.strftime("%H:%M")

def compute_day(conn: sqlite3.Connection, sdate: str, user_id: int | None = None) -> dict:
    jy, jm, jd = parse_date(sdate)
    gy, gm, gd = jalali.jalali_to_gregorian(jy, jm, jd)
    wdf = jalali.weekday_fa(gy, gm, gd)
    is_hol, hol_name = holiday_name(conn, sdate)
    wm = get_work_mode(conn, sdate, user_id)
    events = day_events(conn, sdate, user_id)

    in_dt = None
    out_dt = None
    leave_intervals = []
    leave_open = False
    cur_ls = None

    for et, dt, _ in events:
        if et == "in" and in_dt is None:
            in_dt = dt
        elif et == "out":
            out_dt = dt
        elif et == "leave_start":
            cur_ls = dt
            leave_open = True
        elif et == "leave_end" and cur_ls is not None:
            leave_intervals.append((cur_ls, dt))
            cur_ls = None
            leave_open = False

    gross = 0.0
    if in_dt and out_dt:
        gross = max(0.0, (company_clock(out_dt) - company_clock(in_dt)).total_seconds() / 3600.0)

    leave_closed = sum((company_clock(b) - company_clock(a)).total_seconds() / 3600.0 for a, b in leave_intervals)
    leave_h = max(0.0, leave_closed)

    net = max(0.0, gross - leave_h)
    late = 0.0
    if in_dt and not is_hol:
        # Window starts at 07:00, threshold at 09:15
        in_clock = company_clock(in_dt)
        lim = in_clock.replace(hour=9, minute=15, second=0, microsecond=0)
        if in_clock > lim:
            late = (in_clock - lim).total_seconds() / 3600.0

    standard = 8.0
    deficit = 0.0
    overtime = 0.0
    ot_declared = False

    # Check explicit OT in note of out event or summary
    for et, _, note in events:
        if et == "out" and note and "ot:" in note:
            try:
                overtime = float(note.split("ot:")[1].strip())
                ot_declared = True
            except Exception:
                pass

    if is_hol:
        overtime = net
        deficit = 0.0
        ot_declared = True
    else:
        if out_dt:
            deficit = max(0.0, standard - net)

    return {
        "date": sdate,
        "jy": jy,
        "jm": jm,
        "jd": jd,
        "weekday": wdf,
        "is_holiday": is_hol,
        "holiday_name": hol_name,
        "work_mode": wm,
        "work_mode_label": "دورکاری" if wm == "remote" else "حضوری",
        "in": in_dt,
        "out": out_dt,
        "leave_intervals": leave_intervals,
        "leave_open": leave_open,
        "gross": gross,
        "leave": leave_h,
        "net": net,
        "late": late,
        "deficit": deficit,
        "overtime": overtime,
        "ot_declared": ot_declared,
        "has_events": len(events) > 0,
    }

def compute_day_status(is_holiday: bool, in_dt: datetime.datetime | None, out_dt: datetime.datetime | None, leave_open: bool, holiday_name: str | None = None) -> tuple[str, str, str | None]:
    if is_holiday:
        reason = f"تعطیل ({holiday_name})" if holiday_name else "روز تعطیل رسمی / جمعه"
        return "holiday", DAY_STATUS_LABELS["holiday"], reason
    if out_dt is not None:
        return "done", DAY_STATUS_LABELS["done"], "امروز قبلاً خروج ثبت شده"
    if leave_open:
        return "on_leave", DAY_STATUS_LABELS["on_leave"], "در حال حاضر در مرخصی ساعتی هستید"
    if in_dt is not None:
        return "working", DAY_STATUS_LABELS["working"], None
    return "idle", DAY_STATUS_LABELS["idle"], None

def day_payload(conn: sqlite3.Connection, sdate: str, user_id: int | None = None) -> dict:
    from app.services import leave_service
    d = compute_day(conn, sdate, user_id=user_id)
    dl = leave_service.daily_leave_for_date(conn, sdate, user_id=user_id)
    
    if dl is not None and not d["is_holiday"]:
        d["leave"] = 8.0
        d["net"] = 0.0
        d["deficit"] = 0.0
        d["gross"] = 0.0
        d["late"] = 0.0
        d["daily_leave"] = dl
        d["is_daily_leave"] = True
    else:
        d["daily_leave"] = dl
        d["is_daily_leave"] = dl is not None

    jy, jm, jd = parse_date(sdate)
    ds, dsl, dsr = compute_day_status(d["is_holiday"], d["in"], d["out"], d["leave_open"], d["holiday_name"])
    if dl is not None and not d["is_holiday"] and d["out"] is None:
        ds = "on_leave"
        dsl = DAY_STATUS_LABELS[ds]
        dsr = f"مرخصی روزانه ({dl['label']})" + (f" — {dl['reason']}" if dl.get("reason") else "")

    return {
        "date": sdate, "year": jy, "month": jm, "day": jd,
        "weekday": d["weekday"], "is_holiday": d["is_holiday"], "holiday_name": d["holiday_name"],
        "has_events": d["has_events"],
        "in": fmt_company_time(d["in"]) if d["in"] else None,
        "out": fmt_company_time(d["out"]) if d["out"] else None,
        "leave_intervals": [[fmt_company_time(a), fmt_company_time(b)] for a, b in d["leave_intervals"]],
        "leave_open": d["leave_open"],
        "gross": round(d["gross"], 2), "leave": round(d["leave"], 2),
        "net": round(d["net"], 2), "late": round(d["late"], 2),
        "deficit": round(d["deficit"], 2), "overtime": round(d["overtime"], 2),
        "ot_declared": d["ot_declared"],
        "work_mode": d["work_mode"], "work_mode_label": d["work_mode_label"],
        "day_status": ds, "day_status_label": dsl, "day_status_reason": dsr,
        "daily_leave": dl,
    }

def record_event(conn: sqlite3.Connection, event_type: str, at: str | None = None, date_str: str | None = None, note: str | None = None, user_id: int | None = None, allow_holiday: bool = False) -> str:
    sdate = date_str or today_str()
    d = compute_day(conn, sdate, user_id=user_id)
    is_hol, hol_name = holiday_name(conn, sdate)
    ds, _, _ = compute_day_status(is_hol, d["in"], d["out"], d["leave_open"], hol_name)

    if ds == "holiday" and not allow_holiday:
        raise ValueError("امروز تعطیله — ثبت بسته‌ست تا فردا")
    if ds == "holiday" and allow_holiday and event_type not in ("in", "out", "leave_start", "leave_end"):
        raise ValueError("امروز تعطیله — ثبت بسته‌ست تا فردا")
    if ds == "done":
        raise ValueError("امروز قبلاً خروج ثبت شده — تا فردا")

    jy, jm, jd = parse_date(sdate)
    gy, gm, gd = jalali.jalali_to_gregorian(jy, jm, jd)

    if at:
        parts = at.strip().split(":")
        hh, mm = int(parts[0]), int(parts[1])
        dt_tehran = datetime.datetime(gy, gm, gd, hh, mm, tzinfo=settings.tehran_tz)
    else:
        dt_tehran = now_tehran()
        if date_str and date_str != today_str():
            dt_tehran = dt_tehran.replace(year=gy, month=gm, day=gd)

    dt_utc = dt_tehran.astimezone(datetime.timezone.utc)
    wdf = jalali.weekday_fa(gy, gm, gd)

    if user_id is None:
        conn.execute(
            "INSERT INTO events(event_type, ts_utc, shamsi_date, weekday, note, user_id) VALUES(?,?,?,?,?,NULL)",
            (event_type, dt_utc.isoformat(), sdate, wdf, note),
        )
    else:
        conn.execute(
            "INSERT INTO events(event_type, ts_utc, shamsi_date, weekday, note, user_id) VALUES(?,?,?,?,?,?)",
            (event_type, dt_utc.isoformat(), sdate, wdf, note, user_id),
        )
    conn.commit()

    time_str = dt_tehran.strftime("%H:%M")
    labels = {
        "in": f"✅ ورود در ساعت {time_str} ثبت شد",
        "out": f"🔴 خروج در ساعت {time_str} ثبت شد",
        "leave_start": f"☕ شروع مرخصی ساعتی در ساعت {time_str} ثبت شد",
        "leave_end": f"💼 بازگشت از مرخصی ساعتی در ساعت {time_str} ثبت شد",
    }
    return labels.get(event_type, f"رویداد {event_type} در {time_str} ثبت شد")

def record_overtime(conn: sqlite3.Connection, hours: str, date_str: str | None = None, user_id: int | None = None) -> str:
    sdate = date_str or today_str()
    try:
        ot_val = float(str(hours).translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")))
    except Exception:
        raise ValueError("ساعت اضافه‌کاری نامعتبر است")
    
    events = day_events(conn, sdate, user_id)
    if not any(et == "out" for et, _, _ in events):
        raise ValueError("ابتدا خروج را ثبت کنید، سپس اضافه کاری را اعلام نمایید")
    
    if user_id is None:
        conn.execute("UPDATE events SET note=? WHERE shamsi_date=? AND event_type='out' AND user_id IS NULL", (f"ot:{ot_val}", sdate))
    else:
        conn.execute("UPDATE events SET note=? WHERE shamsi_date=? AND event_type='out' AND user_id=?", (f"ot:{ot_val}", sdate, user_id))

    # Automatically create a task reminder to fill the overtime form if > 0
    if ot_val > 0:
        total_mins = int(round(ot_val * 60))
        h = total_mins // 60
        m = total_mins % 60
        dur_str = f"{h} ساعت و ${m} دقیقه" if h > 0 and m > 0 else f"{h} ساعت" if h > 0 else f"{m} دقیقه"
        task_title = f"📝 پر کردن برگه اضافه‌کاری ({dur_str} - {sdate})"
        
        # Check if task already exists
        existing_task = conn.execute(
            "SELECT id FROM tasks WHERE shamsi_date=? AND title=? AND ((? IS NULL AND user_id IS NULL) OR user_id=?)",
            (sdate, task_title, user_id, user_id),
        ).fetchone()
        if not existing_task:
            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
            conn.execute(
                "INSERT INTO tasks(shamsi_date, title, done, user_id, created_at) VALUES(?, ?, 0, ?, ?)",
                (sdate, task_title, user_id, now_str),
            )

    conn.commit()
    return f"✅ اضافه‌کاری {ot_val:.1f} ساعت برای تاریخ {sdate} ثبت شد"

def edit_or_create_day_record(
    conn: sqlite3.Connection,
    sdate: str,
    in_time: str | None = None,
    out_time: str | None = None,
    leave_hours: float = 0.0,
    overtime_hours: float = 0.0,
    work_mode: str = "office",
    notes: str | None = None,
    user_id: int | None = None,
) -> dict:
    """Explicitly rewrite or insert attendance events and work mode for a specific date."""
    jy, jm, jd = parse_date(sdate)
    gy, gm, gd = jalali.jalali_to_gregorian(jy, jm, jd)
    wdf = jalali.weekday_fa(gy, gm, gd)

    # Delete existing attendance events for this day
    if user_id is None:
        conn.execute("DELETE FROM events WHERE shamsi_date=? AND user_id IS NULL", (sdate,))
    else:
        conn.execute("DELETE FROM events WHERE shamsi_date=? AND user_id=?", (sdate, user_id))

    # Insert In Event
    if in_time and in_time.strip():
        parts = in_time.strip().split(":")
        hh, mm = int(parts[0]), int(parts[1])
        dt_tehran = datetime.datetime(gy, gm, gd, hh, mm, tzinfo=settings.tehran_tz)
        conn.execute(
            "INSERT INTO events(event_type, ts_utc, shamsi_date, weekday, note, user_id) VALUES(?,?,?,?,?,?)",
            ("in", dt_tehran.astimezone(datetime.timezone.utc).isoformat(), sdate, wdf, notes or None, user_id),
        )

    # Insert Leave Interval if leave_hours > 0
    if leave_hours > 0 and in_time and in_time.strip():
        parts = in_time.strip().split(":")
        hh, mm = int(parts[0]), int(parts[1])
        ls_tehran = datetime.datetime(gy, gm, gd, hh, mm, tzinfo=settings.tehran_tz) + datetime.timedelta(hours=2)
        le_tehran = ls_tehran + datetime.timedelta(hours=leave_hours)
        conn.execute(
            "INSERT INTO events(event_type, ts_utc, shamsi_date, weekday, note, user_id) VALUES(?,?,?,?,?,?)",
            ("leave_start", ls_tehran.astimezone(datetime.timezone.utc).isoformat(), sdate, wdf, None, user_id),
        )
        conn.execute(
            "INSERT INTO events(event_type, ts_utc, shamsi_date, weekday, note, user_id) VALUES(?,?,?,?,?,?)",
            ("leave_end", le_tehran.astimezone(datetime.timezone.utc).isoformat(), sdate, wdf, None, user_id),
        )

    # Insert Out Event
    if out_time and out_time.strip():
        parts = out_time.strip().split(":")
        hh, mm = int(parts[0]), int(parts[1])
        dt_tehran = datetime.datetime(gy, gm, gd, hh, mm, tzinfo=settings.tehran_tz)
        out_note = f"ot:{overtime_hours}" if overtime_hours > 0 else None
        conn.execute(
            "INSERT INTO events(event_type, ts_utc, shamsi_date, weekday, note, user_id) VALUES(?,?,?,?,?,?)",
            ("out", dt_tehran.astimezone(datetime.timezone.utc).isoformat(), sdate, wdf, out_note, user_id),
        )

    # Set Work Mode
    wm_clean = "remote" if work_mode in ("remote", "دورکار", "دورکاری") else "office"
    conn.execute(
        "INSERT OR REPLACE INTO day_work_mode(shamsi_date, user_id, mode) VALUES(?,?,?)",
        (sdate, user_id, wm_clean),
    )

    conn.commit()
    return day_payload(conn, sdate, user_id=user_id)

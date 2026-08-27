import csv
import io
import datetime
import sqlite3
from app.core.config import settings
from app.core import jalali
from app.services import record_service

CSV_HEADERS = ["date", "in", "out", "leave_hours", "overtime_hours", "work_mode", "notes"]

def export_attendance_csv(conn: sqlite3.Connection, user_id: int | None = None, month_key: str | None = None) -> str:
    """Generate CSV string containing attendance records for user/month."""
    output = io.StringIO()
    # Add UTF-8 BOM for flawless Excel display on Windows
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow(CSV_HEADERS)

    # Fetch unique dates where user has events or work mode
    query = """
        SELECT DISTINCT shamsi_date FROM events WHERE (? IS NULL AND user_id IS NULL) OR user_id = ?
        UNION
        SELECT DISTINCT shamsi_date FROM day_work_mode WHERE (? IS NULL AND user_id IS NULL) OR user_id = ?
        ORDER BY shamsi_date ASC
    """
    rows = conn.execute(query, (user_id, user_id, user_id, user_id)).fetchall()

    for r in rows:
        sdate = r[0]
        if month_key:
            # month_key format: YYYY-MM
            if not sdate.startswith(month_key):
                continue

        d = record_service.compute_day(conn, sdate, user_id=user_id)
        if not d["has_events"] and not d["work_mode"]:
            continue

        # Extract notes if any
        events = record_service.day_events(conn, sdate, user_id=user_id)
        notes_list = [note for _, _, note in events if note and not note.startswith("ot:")]
        notes_str = " | ".join(notes_list) if notes_list else ""

        writer.writerow([
            sdate,
            record_service.fmt_company_time(d["in"]) if d["in"] else "",
            record_service.fmt_company_time(d["out"]) if d["out"] else "",
            round(d["leave"], 2) if d["leave"] > 0 else 0,
            round(d["overtime"], 2) if d["overtime"] > 0 else 0,
            d["work_mode"] or "office",
            notes_str,
        ])

    return output.getvalue()

def generate_sample_csv() -> str:
    """Generate a sample CSV template for users to fill."""
    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow(CSV_HEADERS)
    writer.writerow(["1405-06-01", "08:30", "17:00", "0", "0.5", "office", "پروژه شیفت"])
    writer.writerow(["1405-06-02", "09:00", "18:15", "1.5", "0", "remote", "جلسه آنلاین"])
    writer.writerow(["1405-06-03", "08:15", "16:45", "0", "0", "office", ""])
    return output.getvalue()

def import_attendance_csv(conn: sqlite3.Connection, csv_content: str, user_id: int | None = None, mode: str = "upsert") -> dict:
    """
    Parse and import CSV records into events and day_work_mode.
    mode: 'upsert' (overwrite day's events) or 'skip' (ignore if day already has events).
    """
    # Strip potential BOM
    content = csv_content.strip()
    if content.startswith("\ufeff"):
        content = content[1:]

    reader = csv.DictReader(io.StringIO(content))
    imported_count = 0
    skipped_count = 0
    errors = []

    for idx, row in enumerate(reader, start=2):
        sdate = (row.get("date") or row.get("تاریخ") or "").strip()
        in_time = (row.get("in") or row.get("ورود") or "").strip()
        out_time = (row.get("out") or row.get("خروج") or "").strip()
        leave_h_raw = (row.get("leave_hours") or row.get("مرخصی") or "0").strip()
        ot_h_raw = (row.get("overtime_hours") or row.get("اضافه_کاری") or row.get("اضافه کاری") or "0").strip()
        work_mode = (row.get("work_mode") or row.get("حالت") or "office").strip().lower()
        notes = (row.get("notes") or row.get("یادداشت") or "").strip()

        if not sdate:
            continue

        try:
            jy, jm, jd = record_service.parse_date(sdate)
            gy, gm, gd = jalali.jalali_to_gregorian(jy, jm, jd)
            wdf = jalali.weekday_fa(gy, gm, gd)
        except Exception:
            errors.append(f"سطر {idx}: تاریخ نامعتبر '{sdate}'")
            continue

        # Check existing events
        existing = record_service.day_events(conn, sdate, user_id=user_id)
        if existing and mode == "skip":
            skipped_count += 1
            continue

        # Delete existing events for this day if upsert
        if existing:
            if user_id is None:
                conn.execute("DELETE FROM events WHERE shamsi_date=? AND user_id IS NULL", (sdate,))
            else:
                conn.execute("DELETE FROM events WHERE shamsi_date=? AND user_id=?", (sdate, user_id))

        # Insert In Event
        if in_time:
            try:
                p = in_time.split(":")
                hh, mm = int(p[0]), int(p[1])
                dt_tehran = datetime.datetime(gy, gm, gd, hh, mm, tzinfo=settings.tehran_tz)
                dt_utc = dt_tehran.astimezone(datetime.timezone.utc)
                conn.execute(
                    "INSERT INTO events(event_type, ts_utc, shamsi_date, weekday, note, user_id) VALUES(?,?,?,?,?,?)",
                    ("in", dt_utc.isoformat(), sdate, wdf, notes or None, user_id),
                )
            except Exception:
                errors.append(f"سطر {idx}: ساعت ورود نامعتبر '{in_time}'")

        # Insert Leave Interval if leave_hours > 0
        try:
            lh = float(leave_h_raw)
            if lh > 0 and in_time:
                p = in_time.split(":")
                hh, mm = int(p[0]), int(p[1])
                ls_tehran = datetime.datetime(gy, gm, gd, hh, mm, tzinfo=settings.tehran_tz) + datetime.timedelta(hours=2)
                le_tehran = ls_tehran + datetime.timedelta(hours=lh)
                conn.execute(
                    "INSERT INTO events(event_type, ts_utc, shamsi_date, weekday, note, user_id) VALUES(?,?,?,?,?,?)",
                    ("leave_start", ls_tehran.astimezone(datetime.timezone.utc).isoformat(), sdate, wdf, None, user_id),
                )
                conn.execute(
                    "INSERT INTO events(event_type, ts_utc, shamsi_date, weekday, note, user_id) VALUES(?,?,?,?,?,?)",
                    ("leave_end", le_tehran.astimezone(datetime.timezone.utc).isoformat(), sdate, wdf, None, user_id),
                )
        except Exception:
            pass

        # Insert Out Event
        if out_time:
            try:
                p = out_time.split(":")
                hh, mm = int(p[0]), int(p[1])
                dt_tehran = datetime.datetime(gy, gm, gd, hh, mm, tzinfo=settings.tehran_tz)
                dt_utc = dt_tehran.astimezone(datetime.timezone.utc)
                ot_float = float(ot_h_raw) if ot_h_raw else 0.0
                out_note = f"ot:{ot_float}" if ot_float > 0 else None
                conn.execute(
                    "INSERT INTO events(event_type, ts_utc, shamsi_date, weekday, note, user_id) VALUES(?,?,?,?,?,?)",
                    ("out", dt_utc.isoformat(), sdate, wdf, out_note, user_id),
                )
            except Exception:
                errors.append(f"سطر {idx}: ساعت خروج نامعتبر '{out_time}'")

        # Set Work Mode (remote / office)
        if work_mode in ("remote", "دورکار", "دورکاری"):
            wm_val = "remote"
        else:
            wm_val = "office"

        conn.execute(
            "INSERT OR REPLACE INTO day_work_mode(shamsi_date, user_id, mode) VALUES(?,?,?)",
            (sdate, user_id, wm_val),
        )

        imported_count += 1

    conn.commit()
    return {
        "ok": True,
        "imported": imported_count,
        "skipped": skipped_count,
        "errors": errors,
    }

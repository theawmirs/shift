import sqlite3
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from app.api.deps import get_db, get_current_user
from app.schemas.settings import SettingsUpdateRequest, SettingsUpdateResponse
from app.db.schema import DEFAULT_SETTINGS, SENSITIVE_SETTINGS_KEYS, get_user_settings, set_user_setting
from app.services import csv_service, record_service

router = APIRouter(tags=["Settings"])

@router.get("/settings", response_model=dict[str, str], summary="Get application configuration and settings")
def get_settings(uid: int = Depends(get_current_user), conn: Any = Depends(get_db)):
    return get_user_settings(conn, user_id=uid)

SETTABLE_SETTINGS = {
    "standard_hours",
    "start_time",
    "start_time_end",
    "end_time",
    "end_time_end",
    "leave_quota_hours",
    "system_offset_min",
    "default_work_mode",
}

def _validate_and_save_setting(body: SettingsUpdateRequest, uid: int, conn: Any):
    if body.key not in SETTABLE_SETTINGS:
        raise HTTPException(status_code=400, detail=f"کلید نامعتبر یا غیرقابل تغییر: {body.key}")

    clean_val = body.value.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")).strip()

    if body.key == "standard_hours":
        try:
            v = float(clean_val)
            if not (4.0 <= v <= 12.0):
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="ساعت کاری روزانه باید بین ۴ تا ۱۲ ساعت باشد")
    elif body.key == "leave_quota_hours":
        try:
            v = float(clean_val)
            if not (0.0 <= v <= 400.0):
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="سهمیه کل مرخصی سالانه باید بین ۰ تا ۴۰۰ ساعت باشد")
    elif body.key == "system_offset_min":
        try:
            v = int(clean_val)
            if not (-120 <= v <= 120):
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="آفست زمانی سیستم باید بین -۱۲۰ تا +۱۲۰ دقیقه باشد")
    elif body.key in ("start_time", "start_time_end", "end_time", "end_time_end"):
        try:
            parts = clean_val.split(":")
            if len(parts) != 2:
                raise ValueError()
            hh, mm = int(parts[0]), int(parts[1])
            if not (0 <= hh <= 23 and 0 <= mm <= 59):
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="فرمت ساعت نامعتبر است (HH:MM)")

        if body.key == "start_time" and not (5 <= hh <= 12):
            raise HTTPException(status_code=400, detail="آغاز پنجره ورود باید بین ۰۵:۰۰ تا ۱۲:۰۰ باشد")
        elif body.key == "start_time_end" and not (6 <= hh <= 14):
            raise HTTPException(status_code=400, detail="اتمام پنجره ورود باید بین ۰۶:۰۰ تا ۱۴:۰۰ باشد")
        elif body.key == "end_time" and not (12 <= hh <= 20):
            raise HTTPException(status_code=400, detail="آغاز پنجره خروج باید بین ۱۲:۰۰ تا ۲۰:۰۰ باشد")
        elif body.key == "end_time_end" and not (13 <= hh <= 23):
            raise HTTPException(status_code=400, detail="اتمام پنجره خروج باید بین ۱۳:۰۰ تا ۲۳:۵۹ باشد")

    elif body.key == "default_work_mode":
        if clean_val not in ("office", "remote"):
            raise HTTPException(status_code=400, detail="نوع قرارداد کاری نامعتبر است (office یا remote)")
        
        # When changing default_work_mode, ensure all days WITH EXISTING EVENTS (including today if started/done)
        # have their historical mode frozen using INSERT OR REPLACE into day_work_mode.
        past_events = conn.execute(
            "SELECT DISTINCT shamsi_date FROM events WHERE (? IS NULL AND user_id IS NULL) OR user_id = ?",
            (uid, uid),
        ).fetchall()
        for p in past_events:
            s = p["shamsi_date"]
            exists = conn.execute(
                "SELECT 1 FROM day_work_mode WHERE shamsi_date=? AND ((? IS NULL AND user_id IS NULL) OR user_id = ?)",
                (s, uid, uid),
            ).fetchone()
            if not exists:
                conn.execute(
                    "INSERT OR REPLACE INTO day_work_mode(shamsi_date, user_id, mode) VALUES(?, ?, 'office')",
                    (s, uid),
                )
        conn.commit()

    set_user_setting(conn, uid, body.key, body.value)
    return SettingsUpdateResponse(ok=True, key=body.key, value=body.value)

@router.put("/settings", response_model=SettingsUpdateResponse, summary="Update single setting value")
def put_settings(
    body: SettingsUpdateRequest,
    uid: int = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    return _validate_and_save_setting(body, uid, conn)

@router.post("/settings", response_model=SettingsUpdateResponse, summary="Update single setting value for authenticated user")
def post_settings(
    body: SettingsUpdateRequest,
    uid: int = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    return _validate_and_save_setting(body, uid, conn)

# ── CSV Import / Export Endpoints ──

@router.get("/csv/export", summary="Export full attendance events to CSV")
@router.get("/data/export/csv", summary="Export full attendance events to CSV (alias)")
def export_csv(
    uid: int = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    csv_text = csv_service.export_attendance_csv(conn, user_id=uid)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="worktime-export.csv"'},
    )

@router.get("/csv/sample", summary="Download sample CSV template for import")
@router.get("/data/sample/csv", summary="Download sample CSV template for import (alias)")
def sample_csv():
    sample_text = csv_service.generate_sample_csv()
    return Response(
        content=sample_text,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="worktime-sample-template.csv"'},
    )

@router.post("/csv/import", summary="Import attendance events from CSV file")
@router.post("/data/import/csv", summary="Import attendance events from CSV file (alias)")
async def import_csv(
    file: UploadFile = File(...),
    mode: str = Form("upsert"),
    uid: int = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="فایل باید پسوند .csv داشته باشد")
    content = await file.read()
    try:
        csv_text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            csv_text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="فرمت انکودینگ فایل نامعتبر است (UTF-8 لازم است)")

    result = csv_service.import_attendance_csv(conn, csv_text, mode=mode, user_id=uid)
    return result

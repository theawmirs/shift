import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_db, get_current_user_optional
from app.schemas.settings import SettingsUpdateRequest, SettingsUpdateResponse
from app.services import auth_service, record_service
from app.db.schema import DEFAULT_SETTINGS

router = APIRouter(tags=["Settings"])

@router.get("/settings", response_model=dict[str, str], summary="Get application configuration and settings")
def get_settings(uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    return {r["key"]: r["value"] for r in rows}

@router.put("/settings", response_model=SettingsUpdateResponse, summary="Update single setting value")
def put_settings(
    body: SettingsUpdateRequest,
    uid: int | None = Depends(get_current_user_optional),
    conn: sqlite3.Connection = Depends(get_db),
):
    if body.key not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=400, detail=f"کلید نامعتبر: {body.key}")

    if body.key == "standard_hours":
        try:
            v = float(body.value.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")))
            if not (1 <= v <= 24):
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="ساعت کاری باید بین ۱ تا ۲۴ باشد")
    elif body.key in ("start_time", "start_time_end", "end_time", "end_time_end"):
        try:
            parts = body.value.split(":")
            if len(parts) != 2:
                raise ValueError()
            hh, mm = int(parts[0]), int(parts[1])
            if not (0 <= hh <= 23 and 0 <= mm <= 59):
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="فرمت ساعت نامعتبر است (HH:MM)")

    auth_service.set_setting(conn, body.key, body.value)
    return SettingsUpdateResponse(ok=True, key=body.key, value=body.value)

import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_db, get_current_user_optional, get_current_user
from app.schemas.settings import SettingsUpdateRequest, SettingsUpdateResponse
from app.db.schema import DEFAULT_SETTINGS, get_user_settings, set_user_setting

router = APIRouter(tags=["Settings"])

@router.get("/settings", response_model=dict[str, str], summary="Get application configuration and settings")
def get_settings(uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    return get_user_settings(conn, user_id=uid)

def _validate_and_save_setting(body: SettingsUpdateRequest, uid: int | None, conn: sqlite3.Connection):
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

    if uid is not None:
        set_user_setting(conn, uid, body.key, body.value)
    else:
        conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)", (body.key, body.value))
        conn.commit()
    return SettingsUpdateResponse(ok=True, key=body.key, value=body.value)

@router.put("/settings", response_model=SettingsUpdateResponse, summary="Update single setting value")
def put_settings(
    body: SettingsUpdateRequest,
    uid: int | None = Depends(get_current_user_optional),
    conn: sqlite3.Connection = Depends(get_db),
):
    return _validate_and_save_setting(body, uid, conn)

@router.post("/settings", response_model=SettingsUpdateResponse, summary="Update single setting value for authenticated user")
def post_settings(
    body: SettingsUpdateRequest,
    uid: int | None = Depends(get_current_user_optional),
    conn: sqlite3.Connection = Depends(get_db),
):
    return _validate_and_save_setting(body, uid, conn)


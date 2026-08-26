import sqlite3
import datetime
import jwt as pyjwt
from typing import Generator
from fastapi import Header, HTTPException, Depends
from app.db.database import get_db_connection
from app.core import security
from app.services import auth_service

def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

def get_current_user_optional(
    authorization: str | None = Header(None),
    conn: sqlite3.Connection = Depends(get_db),
) -> int | None:
    """Returns user_id (int) or None for legacy admin token. Raises 401 on invalid/expired token."""
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="توکن نامعتبر")
    
    token = authorization.split(" ", 1)[1].strip()
    secret = auth_service.get_jwt_secret(conn)
    
    try:
        payload = security.decode_token(token, secret)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="توکن منقضی شده")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="توکن نامعتبر")

    sub = payload.get("sub")
    jti = payload.get("jti")
    
    # Legacy admin token
    if sub == "admin" and not jti:
        return None

    try:
        uid = int(sub)
    except Exception:
        raise HTTPException(status_code=401, detail="توکن نامعتبر")

    if not jti:
        raise HTTPException(status_code=401, detail="توکن نامعتبر")

    # Verify session active in DB
    row = conn.execute("SELECT id, expires_at FROM sessions WHERE id=? AND user_id=?", (jti, uid)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="توکن باطل شده — دوباره وارد شو")

    try:
        exp_at = datetime.datetime.fromisoformat(row["expires_at"])
        if exp_at.tzinfo is None:
            exp_at = exp_at.replace(tzinfo=datetime.timezone.utc)
        if exp_at < datetime.datetime.now(datetime.timezone.utc):
            raise HTTPException(status_code=401, detail="توکن منقضی شده")
    except HTTPException:
        raise
    except Exception:
        pass

    return uid

def get_current_user(
    uid: int | None = Depends(get_current_user_optional),
) -> int:
    """Enforces non-anonymous authenticated user."""
    if uid is None:
        raise HTTPException(status_code=401, detail="نیاز به ورود با تلگرام")
    return uid

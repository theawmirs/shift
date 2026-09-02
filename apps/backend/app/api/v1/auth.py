import time
import datetime
import sqlite3
import jwt as pyjwt
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from app.api.deps import get_db, get_current_user, get_current_user_optional
from app.schemas.auth import (
    UserResponse, LoginInitResponse, PollResponse,
    RefreshRequest, RefreshResponse, LogoutRequest,
    LegacyLoginRequest, LegacyLoginResponse,
    PatchMeRequest, PatchMeResponse, AuthCheckResponse,
    DeleteAccountResponse
)
from app.services import auth_service, bot_service
from app.core import security
from app.core.config import settings

router = APIRouter(tags=["Authentication"])

_init_hits: dict[str, list[float]] = {}

def _check_rate_limit(ip: str, limit: int = 5, key_prefix: str = "init"):
    now = time.time()
    k = f"{key_prefix}:{ip}"
    lst = _init_hits.get(k, [])
    lst = [t for t in lst if now - t < 60]
    if len(lst) >= limit:
        raise HTTPException(status_code=429, detail="تعداد درخواست زیاد است — یک دقیقه صبر کن")
    lst.append(now)
    _init_hits[k] = lst

def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

@router.post("/login", response_model=LegacyLoginResponse, summary="Legacy single-password login")
def api_login(body: LegacyLoginRequest, conn: sqlite3.Connection = Depends(get_db)):
    stored_hash = auth_service.get_setting(conn, "auth_password_hash")
    if not stored_hash:
        raise HTTPException(status_code=500, detail="سیستم احراز هویت تنظیم نشده")
    if security.verify_password(body.password, stored_hash):
        secret = auth_service.get_jwt_secret(conn)
        token = security.create_legacy_admin_token(secret)
        return LegacyLoginResponse(ok=True, token=token, expires_in_days=settings.JWT_EXP_DAYS_LEGACY, deprecated=True)
    raise HTTPException(status_code=401, detail="رمز عبور اشتباه است")

@router.get("/auth/check", response_model=AuthCheckResponse, summary="Validate token")
def auth_check(uid: int | None = Depends(get_current_user_optional)):
    return AuthCheckResponse(ok=True, deprecated=True)

@router.post("/auth/telegram/init", response_model=LoginInitResponse, summary="Initialize Telegram login QR/deep-link")
def auth_telegram_init(request: Request, conn: sqlite3.Connection = Depends(get_db)):
    ip = _client_ip(request)
    _check_rate_limit(ip, limit=5, key_prefix="init")
    token_data = auth_service.create_login_token(conn)
    return LoginInitResponse(**token_data)

@router.get("/auth/poll", response_model=PollResponse, summary="Poll Telegram login token status")
def auth_poll(token: str, conn: sqlite3.Connection = Depends(get_db)):
    if not token or len(token) < 8:
        raise HTTPException(status_code=400, detail="token لازم است")
    
    row = conn.execute("SELECT token, status, user_id, expires_at FROM login_tokens WHERE token=?", (token,)).fetchone()
    if not row:
        raise HTTPException(status_code=410, detail="token expired or not found")

    try:
        exp = datetime.datetime.fromisoformat(row["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=datetime.timezone.utc)
        if datetime.datetime.now(datetime.timezone.utc) > exp and row["status"] == "pending":
            conn.execute("UPDATE login_tokens SET status='expired' WHERE token=?", (token,))
            conn.commit()
            raise HTTPException(status_code=410, detail="token expired")
    except HTTPException:
        raise
    except Exception:
        pass

    status = row["status"]
    if status == "expired":
        raise HTTPException(status_code=410, detail="token expired")
    if status == "pending":
        return PollResponse(status="pending")
    
    if status == "verified":
        uid = row["user_id"]
        if not uid:
            raise HTTPException(status_code=500, detail="user_id missing")
        urow = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        if not urow:
            raise HTTPException(status_code=500, detail="user not found")
        user = auth_service.user_dict(urow)
        access_token, refresh_token = auth_service.issue_token_pair(conn, uid, user["telegram_id"])
        return PollResponse(
            status="verified",
            jwt=access_token,
            access_token=access_token,
            refresh_token=refresh_token,
            refreshToken=refresh_token,
            expires_in=settings.JWT_EXP_MINUTES * 60,
            user=UserResponse(**user),
        )

    raise HTTPException(status_code=410, detail="token expired or not found")

@router.post("/auth/telegram/webhook", summary="Telegram Bot Webhook Receiver")
async def telegram_webhook(request: Request, conn: sqlite3.Connection = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    return bot_service.handle_telegram_update(conn, body)

@router.get("/auth/me", response_model=UserResponse, summary="Get current user profile")
def auth_me(uid: int = Depends(get_current_user), conn: sqlite3.Connection = Depends(get_db)):
    user = auth_service.get_user_by_id(conn, uid)
    if not user:
        raise HTTPException(status_code=404, detail="کاربر پیدا نشد")
    return UserResponse(**user)

@router.patch("/auth/me", response_model=PatchMeResponse, summary="Update user display name")
def patch_me(body: PatchMeRequest, uid: int = Depends(get_current_user), conn: sqlite3.Connection = Depends(get_db)):
    name = body.display_name.strip()
    conn.execute("UPDATE users SET display_name=? WHERE id=?", (name, uid))
    conn.commit()
    user = auth_service.get_user_by_id(conn, uid)
    return PatchMeResponse(ok=True, user=UserResponse(**user))

@router.delete("/auth/me", response_model=DeleteAccountResponse, summary="Permanently delete user account and all data")
def delete_me(uid: int = Depends(get_current_user), conn: sqlite3.Connection = Depends(get_db)):
    auth_service.hard_delete_user(conn, uid)
    return DeleteAccountResponse(ok=True, message="حساب کاربری و کلیه اطلاعات مربوطه با موفقیت حذف شد")

@router.post("/auth/refresh", response_model=RefreshResponse, summary="Refresh access token")
async def auth_refresh(request: Request, body: RefreshRequest | None = None, conn: sqlite3.Connection = Depends(get_db)):
    ip = _client_ip(request)
    _check_rate_limit(ip, limit=60, key_prefix="refresh")

    refresh_token = None
    if body:
        refresh_token = body.refresh_token or body.refreshToken
    if not refresh_token:
        try:
            b = await request.json()
            if isinstance(b, dict):
                refresh_token = b.get("refresh_token") or b.get("refreshToken")
        except Exception:
            pass
    if not refresh_token:
        refresh_token = request.query_params.get("refresh_token") or request.query_params.get("refreshToken")
    
    if not refresh_token or not isinstance(refresh_token, str) or len(refresh_token) < 8:
        raise HTTPException(status_code=400, detail="refresh_token لازم است")

    h = security.hash_token(refresh_token)
    row = conn.execute("SELECT id, user_id, expires_at, revoked_at FROM refresh_sessions WHERE refresh_hash=?", (h,)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="refresh_token نامعتبر")
    
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    
    if row["revoked_at"] is not None:
        # Check grace period for concurrent requests
        try:
            rev_at = datetime.datetime.fromisoformat(row["revoked_at"])
            if rev_at.tzinfo is None:
                rev_at = rev_at.replace(tzinfo=datetime.timezone.utc)
            grace_sec = getattr(settings, "REFRESH_GRACE_SECONDS", 60)
            if (now_utc - rev_at).total_seconds() > grace_sec:
                raise HTTPException(status_code=401, detail="refresh_token باطل شده — دوباره وارد شو")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="refresh_token باطل شده — دوباره وارد شو")
    
    try:
        exp = datetime.datetime.fromisoformat(row["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=datetime.timezone.utc)
        if now_utc > exp:
            raise HTTPException(status_code=401, detail="refresh_token منقضی شده")
    except HTTPException:
        raise
    except Exception:
        pass

    uid = row["user_id"]
    now_iso = now_utc.isoformat()
    if row["revoked_at"] is None:
        conn.execute("UPDATE refresh_sessions SET revoked_at=? WHERE id=?", (now_iso, row["id"]))
        conn.commit()

    urow = conn.execute("SELECT telegram_id FROM users WHERE id=?", (uid,)).fetchone()
    if not urow:
        raise HTTPException(status_code=401, detail="کاربر پیدا نشد")

    access_token, new_refresh = auth_service.issue_token_pair(conn, uid, urow["telegram_id"])
    return RefreshResponse(
        access_token=access_token,
        jwt=access_token,
        refresh_token=new_refresh,
        refreshToken=new_refresh,
        expires_in=settings.JWT_EXP_MINUTES * 60,
    )

@router.post("/auth/logout", summary="Logout and invalidate session tokens")
async def auth_logout(
    request: Request,
    authorization: str | None = Header(None),
    body: LogoutRequest | None = None,
    conn: sqlite3.Connection = Depends(get_db),
):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()

    refresh_raw = body.refresh_token or body.refreshToken if body else None
    if not refresh_raw:
        try:
            b = await request.json()
            if isinstance(b, dict):
                refresh_raw = b.get("refresh_token") or b.get("refreshToken")
        except Exception:
            pass

    secret = auth_service.get_jwt_secret(conn)
    if token and secret:
        try:
            payload = security.decode_token(token, secret, verify_exp=False)
            jti = payload.get("jti")
            sub = payload.get("sub")
            if jti:
                conn.execute("DELETE FROM sessions WHERE id=?", (jti,))
            if sub and sub != "admin":
                uid = int(sub)
                if refresh_raw and isinstance(refresh_raw, str) and len(refresh_raw) > 8:
                    h = security.hash_token(refresh_raw)
                    conn.execute("UPDATE refresh_sessions SET revoked_at=? WHERE refresh_hash=?", (datetime.datetime.now(datetime.timezone.utc).isoformat(), h))
                else:
                    conn.execute("UPDATE refresh_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL", (datetime.datetime.now(datetime.timezone.utc).isoformat(), uid))
            conn.commit()
            return {"ok": True}
        except Exception:
            pass

    if refresh_raw and isinstance(refresh_raw, str) and len(refresh_raw) > 8:
        h = security.hash_token(refresh_raw)
        conn.execute("UPDATE refresh_sessions SET revoked_at=? WHERE refresh_hash=?", (datetime.datetime.now(datetime.timezone.utc).isoformat(), h))
        conn.commit()
        return {"ok": True}

    if not token and not refresh_raw:
        raise HTTPException(status_code=401, detail="توکن نامعتبر")

    return {"ok": True}

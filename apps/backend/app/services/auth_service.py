import sqlite3
import datetime
import shutil
import os
import time
from app.core.config import settings
from app.core import security

def get_setting(conn: sqlite3.Connection, key: str, default: str | None = None) -> str | None:
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default

def set_setting(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)", (key, value))
    conn.commit()

def user_dict(row: sqlite3.Row | dict | None) -> dict | None:
    if not row:
        return None
    d = dict(row)
    dn = d.get("display_name")
    fn = (d.get("first_name") or "").strip()
    ln = (d.get("last_name") or "").strip()
    un = d.get("username") or ""
    if dn and dn.strip():
        display = dn.strip()
    elif fn or ln:
        display = f"{fn} {ln}".strip()
    elif un:
        display = un
    else:
        display = "کاربر"
    return {
        "id": d["id"],
        "telegram_id": d["telegram_id"],
        "username": d.get("username"),
        "first_name": d.get("first_name"),
        "last_name": d.get("last_name"),
        "photo_url": d.get("photo_url"),
        "display_name": d.get("display_name"),
        "displayName": display,
        "created_at": d.get("created_at"),
    }

def get_user_by_id(conn: sqlite3.Connection, uid: int) -> dict | None:
    row = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    return user_dict(row)

def get_jwt_secret(conn: sqlite3.Connection) -> str:
    secret = get_setting(conn, "jwt_secret")
    if not secret:
        secret = settings.JWT_SECRET or "default_secret_key_change_in_prod"
        set_setting(conn, "jwt_secret", secret)
    return secret

def claim_orphans(conn: sqlite3.Connection, new_user_id: int) -> tuple[int, int]:
    cnt_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if cnt_users != 1:
        return (0, 0)
    try:
        ev_orph = conn.execute("SELECT COUNT(*) FROM events WHERE user_id IS NULL").fetchone()[0]
        tk_orph = conn.execute("SELECT COUNT(*) FROM tasks WHERE user_id IS NULL").fetchone()[0]
    except Exception:
        return (0, 0)
    if ev_orph == 0 and tk_orph == 0:
        return (0, 0)
    
    # Backup before claiming
    try:
        db_path = settings.DB_PATH
        now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        bak = f"{db_path}.bak-{now_str}"
        if os.path.exists(db_path):
            shutil.copy2(db_path, bak)
    except Exception:
        pass

    for tbl in ("events", "tasks", "day_work_mode", "monthly_summaries"):
        try:
            conn.execute(f"UPDATE {tbl} SET user_id=? WHERE user_id IS NULL", (new_user_id,))
        except Exception:
            pass
    conn.commit()
    return (ev_orph, tk_orph)

def create_login_token(conn: sqlite3.Connection) -> dict:
    import uuid
    token = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc)
    expires = now + datetime.timedelta(minutes=settings.LOGIN_TOKEN_EXP_MIN)
    conn.execute(
        "INSERT INTO login_tokens(token, status, created_at, expires_at) VALUES(?,?,?,?)",
        (token, "pending", now.isoformat(), expires.isoformat()),
    )
    conn.commit()
    bot_url = f"{settings.BOT_URL_BASE}?start={token}"
    exp_tehran = expires.astimezone(settings.tehran_tz).isoformat()
    return {
        "token": token,
        "botUrl": bot_url,
        "qrData": bot_url,
        "expiresAt": exp_tehran,
    }

def issue_token_pair(conn: sqlite3.Connection, user_id: int, telegram_id: int) -> tuple[str, str]:
    secret = get_jwt_secret(conn)
    access_token, jti, exp = security.create_access_token(user_id, telegram_id, secret)
    raw_refresh, r_jti, hashed_refresh, r_exp = security.create_refresh_token()
    
    # Store access session
    conn.execute(
        "INSERT OR REPLACE INTO sessions(id, user_id, jwt_hash, expires_at) VALUES(?,?,?,?)",
        (jti, user_id, security.hash_token(access_token), exp.isoformat()),
    )
    # Store refresh session
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO refresh_sessions(id, user_id, refresh_hash, expires_at, created_at, revoked_at) VALUES(?,?,?,?,?,NULL)",
        (r_jti, user_id, hashed_refresh, r_exp.isoformat(), now_iso),
    )
    conn.commit()
    return access_token, raw_refresh

def hard_delete_user(conn: sqlite3.Connection, user_id: int) -> None:
    """Cascade hard-delete user and all associated records in a single atomic transaction."""
    tables_by_user_id = [
        "events",
        "tasks",
        "daily_leaves",
        "day_work_mode",
        "monthly_summaries",
        "user_settings",
        "login_tokens",
        "sessions",
        "refresh_sessions",
    ]
    for table in tables_by_user_id:
        conn.execute(f"DELETE FROM {table} WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()


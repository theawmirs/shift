import json
import urllib.request
import re
import datetime
import os
from app.core.config import settings
from app.services import auth_service
from app.db.database import DBAdapter, get_db_connection

def send_telegram_message(chat_id: int | str, text: str) -> bool:
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        print(f"[TELEGRAM MOCK] to {chat_id}: {text}")
        return True
    try:
        data = json.dumps({"chat_id": chat_id, "text": text}).encode("utf-8")
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            resp.read()
        return True
    except Exception as e:
        print(f"[TELEGRAM sendMessage failed] {e}")
        return False

def _process_login_token(target_conn: DBAdapter, token: str, telegram_id: int, username: str | None, first_name: str, last_name: str, photo_url: str | None, chat_id: int | str) -> bool:
    """Attempt to verify token on target connection. Returns True if token was found and processed."""
    row = target_conn.execute("SELECT token, status, expires_at FROM login_tokens WHERE token=?", (token,)).fetchone()
    if not row:
        return False

    if row["status"] != "pending":
        send_telegram_message(chat_id, "❌ این لینک قبلاً استفاده شده. از وب‌اپ لینک جدید بگیر.")
        return True

    try:
        exp = datetime.datetime.fromisoformat(row["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=datetime.timezone.utc)
        if datetime.datetime.now(datetime.timezone.utc) > exp:
            target_conn.execute("UPDATE login_tokens SET status='expired' WHERE token=?", (token,))
            target_conn.commit()
            send_telegram_message(chat_id, "⏰ لینک منقضی شد — از وب‌اپ دوباره تلاش کن.")
            return True
    except Exception:
        pass

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # Upsert user cleanly
    urow = target_conn.execute("SELECT id FROM users WHERE telegram_id=?", (telegram_id,)).fetchone()
    if not urow:
        target_conn.execute(
            "INSERT INTO users(telegram_id, username, first_name, last_name, photo_url, created_at) VALUES(?,?,?,?,?,?)",
            (telegram_id, username, first_name, last_name, photo_url, now_iso),
        )
        target_conn.commit()
        urow = target_conn.execute("SELECT id FROM users WHERE telegram_id=?", (telegram_id,)).fetchone()
    else:
        target_conn.execute(
            "UPDATE users SET username=?, first_name=?, last_name=?, photo_url=? WHERE telegram_id=?",
            (username, first_name, last_name, photo_url, telegram_id),
        )
        target_conn.commit()

    uid = urow["id"]

    target_conn.execute("UPDATE login_tokens SET status='verified', user_id=? WHERE token=?", (uid, token))
    target_conn.commit()

    # Claim orphans if first user
    auth_service.claim_orphans(target_conn, uid)

    uname = f"@{username}" if username else (first_name or "کاربر")
    send_telegram_message(chat_id, f"✅ خوش آمدی {uname}! ورود با موفقیت انجام شد. برگرد به وب‌اپ 👌")
    return True

def handle_telegram_update(conn: DBAdapter, update: dict) -> dict:
    msg = update.get("message") or update.get("edited_message") or {}
    text = (msg.get("text") or "").strip()
    chat_id = (msg.get("chat") or {}).get("id")
    from_user = msg.get("from") or {}

    m = re.match(r"^/start\s+([0-9a-fA-F\-]{8,})$", text)
    if not m or not chat_id or not from_user.get("id"):
        if text.startswith("/start") and chat_id:
            send_telegram_message(chat_id, "برای ورود، از وب‌اپ روی «ورود با تلگرام» بزن و لینک را باز کن.")
        return {"ok": True}

    token = m.group(1).strip()
    telegram_id = int(from_user.get("id"))
    username = from_user.get("username")
    first_name = from_user.get("first_name") or from_user.get("firstName") or ""
    last_name = from_user.get("last_name") or from_user.get("lastName") or ""
    photo_url = None

    # 1. Check primary connection (e.g. Prod DB)
    handled = _process_login_token(conn, token, telegram_id, username, first_name, last_name, photo_url, chat_id)
    if handled:
        return {"ok": True}

    # 2. Check staging DB fallback if token was generated from staging environment
    stage_db_url = os.getenv("STAGING_DATABASE_URL", "postgresql://neondb_owner:npg_E3qg1uSyLHYJ@ep-mute-boat-ax3uzxgx-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require")
    if stage_db_url and conn.is_postgres:
        try:
            stage_conn = get_db_connection(stage_db_url)
            handled_stage = _process_login_token(stage_conn, token, telegram_id, username, first_name, last_name, photo_url, chat_id)
            stage_conn.close()
            if handled_stage:
                return {"ok": True}
        except Exception as e:
            print(f"[STAGING DB Fallback Failed] {e}")

    send_telegram_message(chat_id, "❌ لینک نامعتبر است. از وب‌اپ دوباره «ورود با تلگرام» را بزن.")
    return {"ok": True}

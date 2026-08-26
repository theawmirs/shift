import datetime
import hashlib
import uuid
import jwt as pyjwt
from app.core.config import settings

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

def create_access_token(user_id: int, telegram_id: int, secret_key: str) -> tuple[str, str, datetime.datetime]:
    jti = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc)
    exp = now + datetime.timedelta(minutes=settings.JWT_EXP_MINUTES)
    payload = {
        "sub": str(user_id),
        "telegram_id": telegram_id,
        "jti": jti,
        "iat": now,
        "exp": exp,
    }
    token = pyjwt.encode(payload, secret_key, algorithm=settings.JWT_ALG)
    return token, jti, exp

def create_legacy_admin_token(secret_key: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    exp = now + datetime.timedelta(days=settings.JWT_EXP_DAYS_LEGACY)
    payload = {
        "sub": "admin",
        "iat": now,
        "exp": exp,
    }
    return pyjwt.encode(payload, secret_key, algorithm=settings.JWT_ALG)

def create_refresh_token() -> tuple[str, str, str, datetime.datetime]:
    """Returns (raw_token, jti, hashed_token, expires_at)."""
    jti = str(uuid.uuid4())
    raw_token = f"{uuid.uuid4()}-{uuid.uuid4()}"
    hashed_token = hash_token(raw_token)
    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = now + datetime.timedelta(days=settings.JWT_REFRESH_DAYS)
    return raw_token, jti, hashed_token, expires_at

def decode_token(token: str, secret_key: str, verify_exp: bool = True) -> dict:
    return pyjwt.decode(
        token,
        secret_key,
        algorithms=[settings.JWT_ALG],
        options={"verify_exp": verify_exp, "verify_signature": True} if verify_exp else {"verify_signature": False, "verify_exp": False},
    )

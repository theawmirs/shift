from pydantic import BaseModel, Field

class UserResponse(BaseModel):
    id: int
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    photo_url: str | None = None
    display_name: str | None = None
    displayName: str
    created_at: str | None = None

class LoginInitResponse(BaseModel):
    token: str
    botUrl: str
    qrData: str
    expiresAt: str

class PollResponse(BaseModel):
    status: str
    jwt: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    refreshToken: str | None = None
    expires_in: int | None = None
    user: UserResponse | None = None

class RefreshRequest(BaseModel):
    refresh_token: str | None = None
    refreshToken: str | None = None

class RefreshResponse(BaseModel):
    access_token: str
    jwt: str
    refresh_token: str
    refreshToken: str
    expires_in: int

class LogoutRequest(BaseModel):
    refresh_token: str | None = None
    refreshToken: str | None = None

class LegacyLoginRequest(BaseModel):
    password: str

class LegacyLoginResponse(BaseModel):
    ok: bool
    token: str
    expires_in_days: int
    deprecated: bool = True

class PatchMeRequest(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=30)

class PatchMeResponse(BaseModel):
    ok: bool
    user: UserResponse

class DeleteAccountResponse(BaseModel):
    ok: bool = True
    message: str = "حساب کاربری و کلیه اطلاعات مربوطه با موفقیت حذف شد"

class AuthCheckResponse(BaseModel):
    ok: bool
    deprecated: bool = True

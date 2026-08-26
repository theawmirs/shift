from pydantic import BaseModel

class SettingsResponse(BaseModel):
    items: dict[str, str]

class SettingsUpdateRequest(BaseModel):
    key: str
    value: str

class SettingsUpdateResponse(BaseModel):
    ok: bool
    key: str
    value: str

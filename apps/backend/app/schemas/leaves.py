from pydantic import BaseModel

class DailyLeaveItem(BaseModel):
    id: int
    user_id: int | None = None
    start_date: str
    end_date: str
    type: str
    reason: str | None = None
    hours: float
    created_at: str | None = None
    label: str

class DailyLeaveCreateRequest(BaseModel):
    date: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    type: str | None = None
    leave_type: str | None = None
    reason: str | None = None

class DailyLeaveCreateResponse(BaseModel):
    id: int
    start_date: str
    end_date: str
    type: str
    reason: str | None = None
    hours: float
    work_days_count: int
    label: str

class DailyLeaveListResponse(BaseModel):
    items: list[DailyLeaveItem]
    date: str | None = None
    month: str | None = None

class SimpleOkResponse(BaseModel):
    ok: bool

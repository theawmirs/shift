from pydantic import BaseModel, ConfigDict
from typing import Any

class DailyLeaveSummary(BaseModel):
    id: int
    start_date: str
    end_date: str
    type: str
    reason: str | None = None
    hours: float
    created_at: str | None = None
    label: str

class DayPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    date: str
    year: int
    month: int
    day: int
    weekday: str
    is_holiday: bool
    holiday_name: str | None = None
    has_events: bool
    in_time: str | None = None  # alias handled in serialization if needed
    out_time: str | None = None
    leave_intervals: list[list[str]] = []
    leave_open: bool = False
    gross: float = 0.0
    leave: float = 0.0
    net: float = 0.0
    late: float = 0.0
    deficit: float = 0.0
    overtime: float = 0.0
    ot_declared: bool = False
    work_mode: str = "office"
    work_mode_label: str = "حضوری"
    day_status: str = "idle"
    day_status_label: str = "آماده ورود"
    day_status_reason: str | None = None
    daily_leave: dict[str, Any] | None = None

class StatusResponse(BaseModel):
    date: str
    weekday: str
    is_holiday: bool
    holiday_name: str | None = None
    day_status: str
    day_status_label: str
    day_status_reason: str | None = None
    day: dict[str, Any]
    live_net: float | None = None
    now: str
    settings: dict[str, str]

class RecordRequest(BaseModel):
    event_type: str
    at: str | None = None
    date: str | None = None

class RecordResponse(BaseModel):
    ok: bool
    message: str

class DayEditRequest(BaseModel):
    date: str
    in_time: str | None = None
    out_time: str | None = None
    leave_hours: float = 0.0
    overtime_hours: float = 0.0
    work_mode: str = "office"
    notes: str | None = None

class DayEditResponse(BaseModel):
    ok: bool
    message: str
    day: dict[str, Any]

class OvertimeRequest(BaseModel):
    hours: str
    date: str | None = None

class OvertimeResponse(BaseModel):
    ok: bool
    message: str

class WorkModeRequest(BaseModel):
    date: str | None = None
    mode: str | None = None

class WorkModeResponse(BaseModel):
    ok: bool
    date: str
    mode: str
    label: str

class TaskItem(BaseModel):
    id: int
    title: str
    done: bool
    day_num: int | None = None

class TaskListResponse(BaseModel):
    date: str
    tasks: list[TaskItem]

class TaskAddRequest(BaseModel):
    title: str
    date: str | None = None

class TaskPatchRequest(BaseModel):
    done: bool | None = None
    title: str | None = None

class TaskActionResponse(BaseModel):
    ok: bool
    message: str
    tasks: list[TaskItem]

from pydantic import BaseModel
from typing import Any

class MonthSummaryTotals(BaseModel):
    net: float
    gross: float
    leave: float
    overtime: float
    deficit: float
    late_total: float
    late_days: int
    work_days: int
    holiday_days: int
    holiday_worked: int
    remote_days: int

class LeaveBalanceInfo(BaseModel):
    quota: float
    consumed: float
    remaining: float
    hourly: float
    daily_annual: float

class MonthReportResponse(BaseModel):
    month_key: str
    month_name: str
    year: int
    month: int
    rows: list[dict[str, Any]]
    totals: MonthSummaryTotals
    leave_balance: LeaveBalanceInfo
    daily_leaves_summary: dict[str, int]
    text: str

class WeekTotals(BaseModel):
    net: float
    overtime: float
    deficit: float
    leave: float
    work_days: int
    remote_days: int

class WeekReportResponse(BaseModel):
    days: list[dict[str, Any]]
    totals: WeekTotals
    text: str

class TodayReportResponse(BaseModel):
    text: str
    day: dict[str, Any]

class MonthItem(BaseModel):
    key: str
    label: str

class MonthListResponse(BaseModel):
    months: list[MonthItem]

class HolidayItem(BaseModel):
    date: str
    name: str

class HolidayListResponse(BaseModel):
    holidays: list[HolidayItem]

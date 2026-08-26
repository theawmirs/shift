import sqlite3
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from app.api.deps import get_db, get_current_user_optional
from app.schemas.reports import (
    MonthReportResponse, WeekReportResponse,
    TodayReportResponse, MonthListResponse, MonthItem,
    HolidayListResponse, HolidayItem
)
from app.services import report_service, record_service
from app.core import jalali

router = APIRouter(tags=["Reports & Analytics"])

@router.get("/report/today", response_model=TodayReportResponse, summary="Get today summary and day payload")
def report_today(uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    sdate = record_service.today_str()
    d_payload = record_service.day_payload(conn, sdate, user_id=uid)
    text = f"گزارش امروز {sdate}:\nکارکرد خالص: {d_payload['net']} ساعت\nکسری: {d_payload['deficit']} ساعت\nوضعیت: {d_payload['day_status_label']}"
    return TodayReportResponse(text=text, day=d_payload)

@router.get("/report/week", response_model=WeekReportResponse, summary="Get weekly attendance summary")
def report_week(uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    res = report_service.get_week_report(conn, user_id=uid)
    return WeekReportResponse(**res)

@router.get("/report/month", response_model=MonthReportResponse, summary="Get monthly detailed report")
def report_month(month: str | None = None, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    res = report_service.get_month_report(conn, month_key=month, user_id=uid)
    return MonthReportResponse(**res)

@router.get("/months", response_model=MonthListResponse, summary="List available historical months")
def list_months(uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    if uid is None:
        rows = conn.execute("SELECT DISTINCT substr(shamsi_date,1,7) as m FROM events WHERE user_id IS NULL ORDER BY m DESC").fetchall()
    else:
        rows = conn.execute("SELECT DISTINCT substr(shamsi_date,1,7) as m FROM events WHERE user_id=? ORDER BY m DESC", (uid,)).fetchall()
    
    months = []
    for r in rows:
        mk = r["m"]
        try:
            parts = mk.split("-")
            jy, jm = int(parts[0]), int(parts[1])
            label = f"{jalali.MONTHS_FA[jm-1]} {jy}"
        except Exception:
            label = mk
        months.append(MonthItem(key=mk, label=label))
        
    if not months:
        cur_key = report_service.current_month_key()
        try:
            parts = cur_key.split("-")
            jy, jm = int(parts[0]), int(parts[1])
            label = f"{jalali.MONTHS_FA[jm-1]} {jy}"
        except Exception:
            label = cur_key
        months.append(MonthItem(key=cur_key, label=label))

    return MonthListResponse(months=months)

@router.get("/excel", summary="Export month attendance report as Excel sheet")
def export_excel(month: str | None = None, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    path = report_service.export_excel(conn, month_key=month, user_id=uid)
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=os.path.basename(path),
    )

@router.get("/holidays", response_model=HolidayListResponse, summary="Get list of holidays")
@router.get("/holidays/{year}", response_model=HolidayListResponse, summary="Get list of holidays for a specific year")
def get_holidays(year: int | None = None, conn: sqlite3.Connection = Depends(get_db)):
    if year is not None:
        rows = conn.execute("SELECT date, name FROM holidays WHERE substr(date,1,4)=? ORDER BY date ASC", (f"{year:04d}",)).fetchall()
    else:
        rows = conn.execute("SELECT date, name FROM holidays ORDER BY date ASC").fetchall()
    return HolidayListResponse(holidays=[HolidayItem(date=r["date"], name=r["name"]) for r in rows])


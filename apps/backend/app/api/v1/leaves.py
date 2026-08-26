import sqlite3
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from app.api.deps import get_db, get_current_user
from app.schemas.leaves import (
    DailyLeaveCreateRequest, DailyLeaveCreateResponse,
    DailyLeaveListResponse, DailyLeaveItem, SimpleOkResponse
)
from app.services import leave_service, record_service

router = APIRouter(tags=["Leaves"])

_leaf_hits: dict[str, list[float]] = {}

def _dl_rate_limit(ip: str):
    now = time.time()
    lst = _leaf_hits.get(ip, [])
    lst = [t for t in lst if now - t < 60]
    if len(lst) >= 10:
        raise HTTPException(status_code=429, detail="تعداد درخواست زیاد است — یک دقیقه صبر کن")
    lst.append(now)
    _leaf_hits[ip] = lst

def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def _normalize_dates(body: DailyLeaveCreateRequest) -> tuple[str, str]:
    s = (body.date or body.start_date or "").strip()
    e = (body.end_date or s).strip()
    if not s:
        raise HTTPException(status_code=400, detail="تاریخ شروع لازم است")
    try:
        record_service.parse_date(s)
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex))
    if e:
        try:
            record_service.parse_date(e)
        except ValueError as ex:
            raise HTTPException(status_code=400, detail=str(ex))
    else:
        e = s
    if e < s:
        raise HTTPException(status_code=400, detail="تاریخ پایان باید بعد از شروع باشد")
    return s, e

@router.post("/daily-leaves", response_model=DailyLeaveCreateResponse, status_code=201, summary="Request daily leave")
def create_daily_leave(
    body: DailyLeaveCreateRequest,
    request: Request,
    uid: int = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    _dl_rate_limit(_client_ip(request))
    s, e = _normalize_dates(body)
    typ = (body.type or body.leave_type or "").strip().lower()
    reason = (body.reason or "").strip()
    if len(reason) > 200:
        raise HTTPException(status_code=400, detail="دلیل مرخصی حداکثر 200 کاراکتر")
    
    try:
        res = leave_service.create_daily_leave(conn, uid, s, e, typ, reason if reason else None)
        return DailyLeaveCreateResponse(**res)
    except ValueError as e_val:
        msg = str(e_val)
        status_code = 409 if ("هم‌پوشانی" in msg or "سهمیه" in msg) else 400
        raise HTTPException(status_code=status_code, detail=msg)

@router.get("/daily-leaves", response_model=DailyLeaveListResponse, summary="List daily leaves by date/month")
def list_daily_leaves(
    month: str | None = None,
    date: str | None = None,
    uid: int = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    if date:
        try:
            record_service.parse_date(date)
        except ValueError as ex:
            raise HTTPException(status_code=400, detail=str(ex))
        rows = conn.execute(
            "SELECT id, user_id, start_date, end_date, type, reason, hours, created_at FROM daily_leaves WHERE user_id=? AND start_date <= ? AND end_date >= ? ORDER BY start_date",
            (uid, date, date),
        ).fetchall()
        items = [
            DailyLeaveItem(
                id=r["id"],
                user_id=r["user_id"],
                start_date=r["start_date"],
                end_date=r["end_date"],
                type=r["type"],
                reason=r["reason"],
                hours=r["hours"],
                created_at=r["created_at"],
                label=leave_service.DAILY_LEAVE_LABEL.get(r["type"], r["type"]),
            )
            for r in rows
        ]
        return DailyLeaveListResponse(items=items, date=date)

    if month:
        try:
            parts = month.split("-")
            jy, jm = int(parts[0]), int(parts[1])
            record_service.parse_date(f"{month}-01")
        except Exception:
            raise HTTPException(status_code=400, detail="فرمت ماه باید YYYY-MM باشد")
        
        m_start = f"{jy:04d}-{jm:02d}-01"
        try:
            from app.services import report_service
            mdays = report_service.month_days(jy, jm)
            m_end = mdays[-1] if mdays else m_start
        except Exception:
            m_end = m_start

        rows = conn.execute(
            "SELECT id, user_id, start_date, end_date, type, reason, hours, created_at FROM daily_leaves WHERE user_id=? AND start_date <= ? AND end_date >= ? ORDER BY start_date",
            (uid, m_end, m_start),
        ).fetchall()
        items = [
            DailyLeaveItem(
                id=r["id"],
                user_id=r["user_id"],
                start_date=r["start_date"],
                end_date=r["end_date"],
                type=r["type"],
                reason=r["reason"],
                hours=r["hours"],
                created_at=r["created_at"],
                label=leave_service.DAILY_LEAVE_LABEL.get(r["type"], r["type"]),
            )
            for r in rows
        ]
        return DailyLeaveListResponse(items=items, month=month)

    # All user leaves
    rows = conn.execute(
        "SELECT id, user_id, start_date, end_date, type, reason, hours, created_at FROM daily_leaves WHERE user_id=? ORDER BY start_date DESC",
        (uid,),
    ).fetchall()
    items = [
        DailyLeaveItem(
            id=r["id"],
            user_id=r["user_id"],
            start_date=r["start_date"],
            end_date=r["end_date"],
            type=r["type"],
            reason=r["reason"],
            hours=r["hours"],
            created_at=r["created_at"],
            label=leave_service.DAILY_LEAVE_LABEL.get(r["type"], r["type"]),
        )
        for r in rows
    ]
    return DailyLeaveListResponse(items=items)

@router.delete("/daily-leaves/{lid}", response_model=SimpleOkResponse, summary="Cancel future daily leave")
def delete_daily_leave(
    lid: int,
    uid: int = Depends(get_current_user),
    conn: sqlite3.Connection = Depends(get_db),
):
    try:
        ok = leave_service.delete_daily_leave(conn, uid, lid)
        if not ok:
            raise HTTPException(status_code=404, detail="مرخصی پیدا نشد")
        return SimpleOkResponse(ok=True)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

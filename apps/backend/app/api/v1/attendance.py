import sqlite3
import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_db, get_current_user_optional
from app.schemas.attendance import (
    StatusResponse, RecordRequest, RecordResponse,
    OvertimeResponse, WorkModeRequest, WorkModeResponse,
    TaskListResponse, TaskAddRequest, TaskPatchRequest, TaskActionResponse, TaskItem,
    DayEditRequest, DayEditResponse,
)
from app.services import record_service
from app.core.config import settings

router = APIRouter(tags=["Attendance & Tasks"])

@router.get("/status", response_model=StatusResponse, summary="Get today status and live attendance stats")
def get_status(uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    sdate = record_service.today_str()
    d = record_service.compute_day(conn, sdate, user_id=uid)
    is_hol, hol_name = record_service.holiday_name(conn, sdate)
    now = record_service.now_tehran()
    
    live = None
    if d["in"] and not d["out"]:
        leave_closed = sum((b - a).total_seconds() / 3600.0 for a, b in d["leave_intervals"])
        if d["leave_open"]:
            events = record_service.day_events(conn, sdate, user_id=uid)
            last_ls = None
            for et, dt, _ in events:
                if et == "leave_start":
                    last_ls = dt
                elif et == "leave_end":
                    last_ls = None
            if last_ls is not None:
                leave_open_h = (record_service.company_clock(now) - record_service.company_clock(last_ls)).total_seconds() / 3600.0
                leave_closed += max(0.0, leave_open_h)
        gross_live = (record_service.company_clock(now) - record_service.company_clock(d["in"])).total_seconds() / 3600.0
        live = round(max(0.0, gross_live - leave_closed), 2)

    day_ds, day_dsl, day_dsr = record_service.compute_day_status(is_hol, d["in"], d["out"], d["leave_open"], hol_name)
    from app.db.schema import get_user_settings
    settings_dict = get_user_settings(conn, user_id=uid)

    return StatusResponse(
        date=sdate,
        weekday=d["weekday"],
        is_holiday=is_hol,
        holiday_name=hol_name,
        day_status=day_ds,
        day_status_label=day_dsl,
        day_status_reason=day_dsr,
        day=record_service.day_payload(conn, sdate, user_id=uid),
        live_net=live,
        now=now.isoformat(),
        settings=settings_dict,
    )

@router.post("/record", response_model=RecordResponse, summary="Record attendance event (in, out, leave_start, leave_end)")
def api_record(body: RecordRequest, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    raw = (body.event_type or "").strip().lower().replace("-", "_")
    mapping = {
        "in": "in",
        "out": "out",
        "leave_start": "leave_start",
        "leave": "leave_start",
        "مرخصی": "leave_start",
        "leave_end": "leave_end",
        "back": "leave_end",
        "برگشتم": "leave_end",
    }
    et = mapping.get(raw, raw)
    if et not in ("in", "out", "leave_start", "leave_end"):
        raise HTTPException(status_code=400, detail="event_type must be in|out|leave_start|leave_end")

    try:
        msg = record_service.record_event(conn, et, at=body.at, date_str=body.date, user_id=uid)
        return RecordResponse(ok=True, message=msg)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.post("/day/edit", response_model=DayEditResponse, summary="Edit or insert full workday records for a specific date")
def api_edit_day(body: DayEditRequest, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    try:
        updated_day = record_service.edit_or_create_day_record(
            conn=conn,
            sdate=body.date,
            in_time=body.in_time,
            out_time=body.out_time,
            leave_hours=body.leave_hours,
            overtime_hours=body.overtime_hours,
            work_mode=body.work_mode,
            notes=body.notes,
            user_id=uid,
        )
        return DayEditResponse(ok=True, message=f"ساعت کاری تاریخ {body.date} با موفقیت ویرایش/ثبت شد", day=updated_day)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ot", response_model=OvertimeResponse, summary="Declare overtime hours after clock out")
def api_ot(hours: str, date: str | None = None, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    try:
        msg = record_service.record_overtime(conn, hours, date_str=date, user_id=uid)
        return OvertimeResponse(ok=True, message=msg)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/work-mode", response_model=WorkModeResponse, summary="Get work mode for date")
def get_work_mode(date: str | None = None, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    sdate = date or record_service.today_str()
    mode = record_service.get_work_mode(conn, sdate, user_id=uid)
    return WorkModeResponse(ok=True, date=sdate, mode=mode, label=record_service.WORK_MODE_LABEL.get(mode, mode))

@router.put("/work-mode", response_model=WorkModeResponse, summary="Set work mode (office / remote)")
def put_work_mode(body: WorkModeRequest, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    sdate = body.date or record_service.today_str()
    if body.mode not in record_service.WORK_MODES:
        raise HTTPException(status_code=400, detail="mode must be office|remote")
    record_service.set_work_mode(conn, sdate, body.mode, user_id=uid)
    return WorkModeResponse(ok=True, date=sdate, mode=body.mode, label=record_service.WORK_MODE_LABEL.get(body.mode, body.mode))

@router.post("/work-mode/toggle", response_model=WorkModeResponse, summary="Toggle work mode between office and remote")
def toggle_work_mode(body: WorkModeRequest | None = None, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    sdate = (body.date if body and body.date else None) or record_service.today_str()
    nxt = record_service.toggle_work_mode(conn, sdate, user_id=uid)
    return WorkModeResponse(ok=True, date=sdate, mode=nxt, label=record_service.WORK_MODE_LABEL.get(nxt, nxt))

# --- Tasks ---
@router.get("/tasks", response_model=TaskListResponse, summary="List tasks for date")
def list_tasks(date: str | None = None, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    sdate = date or record_service.today_str()
    if uid is None:
        rows = conn.execute("SELECT id, title, done, day_num FROM tasks WHERE shamsi_date=? AND user_id IS NULL ORDER BY id", (sdate,)).fetchall()
    else:
        rows = conn.execute("SELECT id, title, done, day_num FROM tasks WHERE shamsi_date=? AND user_id=? ORDER BY id", (sdate, uid)).fetchall()
    return TaskListResponse(date=sdate, tasks=[TaskItem(id=r["id"], title=r["title"], done=bool(r["done"]), day_num=r["day_num"]) for r in rows])

@router.post("/tasks", response_model=TaskActionResponse, summary="Add task for date")
def add_task(body: TaskAddRequest, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    sdate = body.date or record_service.today_str()
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="title خالیه")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if uid is None:
        cnt = conn.execute("SELECT COUNT(*) FROM tasks WHERE shamsi_date=? AND user_id IS NULL", (sdate,)).fetchone()[0]
        conn.execute("INSERT INTO tasks(shamsi_date, title, done, day_num, created_at, user_id) VALUES(?,?,0,?,?,NULL)", (sdate, title, cnt + 1, now_iso))
        rows = conn.execute("SELECT id, title, done, day_num FROM tasks WHERE shamsi_date=? AND user_id IS NULL ORDER BY id", (sdate,)).fetchall()
    else:
        cnt = conn.execute("SELECT COUNT(*) FROM tasks WHERE shamsi_date=? AND user_id=?", (sdate, uid)).fetchone()[0]
        conn.execute("INSERT INTO tasks(shamsi_date, title, done, day_num, created_at, user_id) VALUES(?,?,0,?,?,?)", (sdate, title, cnt + 1, now_iso, uid))
        rows = conn.execute("SELECT id, title, done, day_num FROM tasks WHERE shamsi_date=? AND user_id=? ORDER BY id", (sdate, uid)).fetchall()
    conn.commit()

    return TaskActionResponse(
        ok=True,
        message="✅ تسک اضافه شد",
        tasks=[TaskItem(id=r["id"], title=r["title"], done=bool(r["done"]), day_num=r["day_num"]) for r in rows],
    )

@router.patch("/tasks/{tid}", response_model=TaskActionResponse, summary="Update task title or done status")
def patch_task(tid: int, body: TaskPatchRequest, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    if uid is None:
        row = conn.execute("SELECT id, shamsi_date, done FROM tasks WHERE id=? AND user_id IS NULL", (tid,)).fetchone()
    else:
        row = conn.execute("SELECT id, shamsi_date, done FROM tasks WHERE id=? AND user_id=?", (tid, uid)).fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="تسک پیدا نشد")
    
    sdate = row["shamsi_date"]
    if body.done is not None:
        conn.execute("UPDATE tasks SET done=? WHERE id=?", (1 if body.done else 0, tid))
        msg = "✅ انجام شد" if body.done else "↩️ باز شد"
    elif body.title is not None:
        t = body.title.strip()
        if not t:
            raise HTTPException(status_code=400, detail="عنوان خالیه")
        conn.execute("UPDATE tasks SET title=? WHERE id=?", (t, tid))
        msg = "✅ عنوان به‌روز شد"
    else:
        raise HTTPException(status_code=400, detail="هیچ فیلدی برای به‌روزرسانی داده نشده")
    conn.commit()

    if uid is None:
        rows = conn.execute("SELECT id, title, done, day_num FROM tasks WHERE shamsi_date=? AND user_id IS NULL ORDER BY id", (sdate,)).fetchall()
    else:
        rows = conn.execute("SELECT id, title, done, day_num FROM tasks WHERE shamsi_date=? AND user_id=? ORDER BY id", (sdate, uid)).fetchall()

    return TaskActionResponse(
        ok=True,
        message=msg,
        tasks=[TaskItem(id=r["id"], title=r["title"], done=bool(r["done"]), day_num=r["day_num"]) for r in rows],
    )

@router.delete("/tasks/{tid}", response_model=TaskActionResponse, summary="Delete task")
def delete_task(tid: int, uid: int | None = Depends(get_current_user_optional), conn: sqlite3.Connection = Depends(get_db)):
    if uid is None:
        row = conn.execute("SELECT shamsi_date FROM tasks WHERE id=? AND user_id IS NULL", (tid,)).fetchone()
    else:
        row = conn.execute("SELECT shamsi_date FROM tasks WHERE id=? AND user_id=?", (tid, uid)).fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="تسک پیدا نشد")
    
    sdate = row["shamsi_date"]
    conn.execute("DELETE FROM tasks WHERE id=?", (tid,))
    
    # Re-number tasks
    if uid is None:
        remain = conn.execute("SELECT id FROM tasks WHERE shamsi_date=? AND user_id IS NULL ORDER BY id", (sdate,)).fetchall()
    else:
        remain = conn.execute("SELECT id FROM tasks WHERE shamsi_date=? AND user_id=? ORDER BY id", (sdate, uid)).fetchall()
    
    for i, r in enumerate(remain, 1):
        conn.execute("UPDATE tasks SET day_num=? WHERE id=?", (i, r["id"]))
    conn.commit()

    if uid is None:
        rows = conn.execute("SELECT id, title, done, day_num FROM tasks WHERE shamsi_date=? AND user_id IS NULL ORDER BY id", (sdate,)).fetchall()
    else:
        rows = conn.execute("SELECT id, title, done, day_num FROM tasks WHERE shamsi_date=? AND user_id=? ORDER BY id", (sdate, uid)).fetchall()

    return TaskActionResponse(
        ok=True,
        message="🗑 حذف شد",
        tasks=[TaskItem(id=r["id"], title=r["title"], done=bool(r["done"]), day_num=r["day_num"]) for r in rows],
    )

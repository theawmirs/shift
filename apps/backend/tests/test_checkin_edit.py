import os
import sqlite3
import tempfile

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.schema import init_db
from app.main import create_app
from app.services import auth_service, record_service
from app.api.deps import get_db


@pytest.fixture(scope="function")
def test_env():
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test_checkin_edit.db")
    settings.DB_PATH = test_db
    settings.EXPORTS_DIR = os.path.join(temp_dir, "exports")
    settings.JWT_SECRET = "test_secret_key_123"

    conn = sqlite3.connect(test_db, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    init_db(conn)
    conn.close()

    app = create_app()

    def override_get_db():
        c = sqlite3.connect(test_db, check_same_thread=False)
        c.row_factory = sqlite3.Row
        try:
            yield c
        finally:
            c.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield {"client": client, "db_path": test_db}


def _make_user(test_env, telegram_id=777001, username="checkin_edit_user"):
    conn = sqlite3.connect(test_env["db_path"], check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute(
        "INSERT INTO users(telegram_id, username, created_at) VALUES(?, ?, '2026-08-26T00:00:00')",
        (telegram_id, username),
    )
    conn.commit()
    user_id = conn.execute(
        "SELECT id FROM users WHERE telegram_id=?", (telegram_id,)
    ).fetchone()["id"]
    access_token, _ = auth_service.issue_token_pair(conn, user_id, telegram_id)
    conn.close()
    return {"Authorization": f"Bearer {access_token}"}


def test_edit_checkin_happy_path(test_env):
    client = test_env["client"]
    headers = _make_user(test_env)
    workday = "1405-06-03"

    rec = client.post(
        "/api/record",
        json={"event_type": "in", "at": "09:15", "date": workday},
        headers=headers,
    )
    assert rec.status_code == 200

    # Add a closed leave interval and switch work mode to remote
    ls = client.post(
        "/api/record",
        json={"event_type": "leave_start", "at": "10:00", "date": workday},
        headers=headers,
    )
    assert ls.status_code == 200
    le = client.post(
        "/api/record",
        json={"event_type": "leave_end", "at": "10:30", "date": workday},
        headers=headers,
    )
    assert le.status_code == 200
    # Set work mode directly in DB (PUT /api/work-mode hits pre-existing
    # missing WORK_MODES constant — out of scope for this task).
    conn = sqlite3.connect(test_env["db_path"], check_same_thread=False)
    conn.row_factory = sqlite3.Row
    uid = conn.execute("SELECT id FROM users LIMIT 1").fetchone()["id"]
    conn.execute(
        "INSERT OR REPLACE INTO day_work_mode(shamsi_date, user_id, mode) VALUES(?,?,?)",
        (workday, uid, "remote"),
    )
    conn.commit()
    conn.close()

    edit = client.post(
        "/api/in/edit", json={"at": "09:11", "date": workday}, headers=headers
    )
    assert edit.status_code == 200
    body = edit.json()
    assert body["ok"] is True
    assert body["day"]["in"] == "09:11"
    assert body["day"]["leave_intervals"] == [["10:00", "10:30"]]
    assert body["day"]["work_mode"] == "remote"


def test_edit_checkin_no_in_returns_400(test_env):
    client = test_env["client"]
    headers = _make_user(test_env, telegram_id=777002, username="checkin_noin")
    resp = client.post(
        "/api/in/edit", json={"at": "09:11", "date": "1405-06-04"}, headers=headers
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "هنوز ورود ثبت نشده"


def test_edit_checkin_bad_format_returns_400(test_env):
    client = test_env["client"]
    headers = _make_user(test_env, telegram_id=777003, username="checkin_badfmt")
    workday = "1405-06-03"
    rec = client.post(
        "/api/record",
        json={"event_type": "in", "at": "09:15", "date": workday},
        headers=headers,
    )
    assert rec.status_code == 200

    for bad in ("99:99", "abc"):
        resp = client.post(
            "/api/in/edit", json={"at": bad, "date": workday}, headers=headers
        )
        assert resp.status_code == 400
        assert resp.json()["detail"] == "ساعت ورود نامعتبر است"


def test_edit_checkin_future_time_returns_400(test_env):
    client = test_env["client"]
    headers = _make_user(test_env, telegram_id=777004, username="checkin_future")
    today = record_service.today_str()
    rec = client.post(
        "/api/record",
        json={"event_type": "in", "at": "00:01", "date": today, "allow_holiday": True},
        headers=headers,
    )
    assert rec.status_code == 200

    now = record_service.now_tehran()
    future_mins = (now.hour * 60 + now.minute + 60) % (24 * 60)
    future_at = f"{future_mins // 60:02d}:{future_mins % 60:02d}"
    resp = client.post(
        "/api/in/edit", json={"at": future_at, "date": today}, headers=headers
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "ساعت ورود نميتواند در آينده باشد"


def test_edit_checkin_closed_day_returns_400(test_env):
    client = test_env["client"]
    headers = _make_user(test_env, telegram_id=777005, username="checkin_closed")
    workday = "1405-06-03"
    rec_in = client.post(
        "/api/record",
        json={"event_type": "in", "at": "09:15", "date": workday},
        headers=headers,
    )
    assert rec_in.status_code == 200
    rec_out = client.post(
        "/api/record",
        json={"event_type": "out", "at": "17:00", "date": workday},
        headers=headers,
    )
    assert rec_out.status_code == 200

    resp = client.post(
        "/api/in/edit", json={"at": "09:11", "date": workday}, headers=headers
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "امروز قبلا خروج ثبت شده — تا فردا"

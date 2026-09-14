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
    test_db = os.path.join(temp_dir, "test_manual_hourly_leave.db")
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

def _make_user(test_env, telegram_id=99112233, username="hourly_leave_user"):
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
    return user_id, {"Authorization": f"Bearer {access_token}"}

def test_manual_hourly_leave_flow(test_env):
    client = test_env["client"]
    user_id, headers = _make_user(test_env)
    test_date = "1405-06-03"  # Monday workday

    # 1. Attempting to add leave before checkin -> 400
    r_no_in = client.post(
        "/api/leave/hourly",
        json={"start_time": "10:00", "end_time": "11:00", "date": test_date},
        headers=headers,
    )
    assert r_no_in.status_code == 400
    assert "ساعت ورود به شرکت" in r_no_in.json()["detail"]

    # 2. Check in at 09:00
    client.post("/api/record", json={"event_type": "in", "at": "09:00", "date": test_date}, headers=headers)

    # 3. Invalid times: end <= start -> 400
    r_bad_order = client.post(
        "/api/leave/hourly",
        json={"start_time": "12:00", "end_time": "11:00", "date": test_date},
        headers=headers,
    )
    assert r_bad_order.status_code == 400
    assert "بعد از ساعت خروج" in r_bad_order.json()["detail"]

    # 4. Start before in -> 400
    r_before_in = client.post(
        "/api/leave/hourly",
        json={"start_time": "08:30", "end_time": "09:30", "date": test_date},
        headers=headers,
    )
    assert r_before_in.status_code == 400
    assert "قبل از ساعت ورود به شرکت" in r_before_in.json()["detail"]

    # 5. Add valid hourly leave from 11:00 to 12:30 (1.5 hours)
    r_ok = client.post(
        "/api/leave/hourly",
        json={"start_time": "11:00", "end_time": "12:30", "date": test_date, "note": "پزشک"},
        headers=headers,
    )
    assert r_ok.status_code == 200
    day = r_ok.json()["day"]
    assert day["leave"] == 1.5
    assert day["leave_intervals"] == [["11:00", "12:30"]]

    # 6. Overlapping interval -> 400
    r_overlap = client.post(
        "/api/leave/hourly",
        json={"start_time": "12:00", "end_time": "13:00", "date": test_date},
        headers=headers,
    )
    assert r_overlap.status_code == 400
    assert "تداخل دارد" in r_overlap.json()["detail"]

    # 7. Add a second non-overlapping hourly leave (14:00 to 15:00)
    r_ok2 = client.post(
        "/api/leave/hourly",
        json={"start_time": "14:00", "end_time": "15:00", "date": test_date},
        headers=headers,
    )
    assert r_ok2.status_code == 200
    day2 = r_ok2.json()["day"]
    assert day2["leave"] == 2.5
    assert day2["leave_intervals"] == [["11:00", "12:30"], ["14:00", "15:00"]]

    # 8. Record check out at 17:15 (end of standard window)
    client.post("/api/record", json={"event_type": "out", "at": "17:15", "date": test_date}, headers=headers)
    
    # 9. Verify net calculation: Gross 8.25 hours (09:00 to 17:15) - 2.5 leave = 5.75 net
    conn = sqlite3.connect(test_env["db_path"], check_same_thread=False)
    conn.row_factory = sqlite3.Row
    d_after_out = record_service.day_payload(conn, test_date, user_id=user_id)
    assert d_after_out["gross"] == 8.25
    assert d_after_out["leave"] == 2.5
    assert d_after_out["net"] == 5.75
    assert d_after_out["deficit"] == 2.25

    # 10. Delete the first hourly leave (11:00 to 12:30)
    r_del = client.delete(
        f"/api/leave/hourly?start_time=11:00&end_time=12:30&date={test_date}",
        headers=headers,
    )
    assert r_del.status_code == 200
    day_del = r_del.json()["day"]
    assert day_del["leave"] == 1.0
    assert day_del["leave_intervals"] == [["14:00", "15:00"]]
    assert day_del["net"] == 7.25
    assert day_del["deficit"] == 0.75

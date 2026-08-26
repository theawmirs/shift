import pytest
import os
import tempfile
import sqlite3
from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.database import get_db_connection
from app.db.schema import init_db
from app.main import create_app
from app.services import auth_service, record_service
from app.api.deps import get_db

@pytest.fixture(scope="function")
def test_env():
    # Use temporary sqlite database for tests
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test_work_hours.db")
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

def test_health_and_docs(test_env):
    client = test_env["client"]
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

    # Check Swagger & OpenAPI schema
    docs = client.get("/docs")
    assert docs.status_code == 200
    redoc = client.get("/redoc")
    assert redoc.status_code == 200
    openapi = client.get("/openapi.json")
    assert openapi.status_code == 200
    assert "paths" in openapi.json()
    assert "/api/record" in openapi.json()["paths"]

def test_telegram_auth_and_user_flow(test_env):
    client = test_env["client"]

    # 1. Init Telegram login
    init_res = client.post("/api/auth/telegram/init")
    assert init_res.status_code == 200
    token = init_res.json()["token"]
    assert token

    # 2. Poll before verification (should be pending)
    poll_res = client.get(f"/api/auth/poll?token={token}")
    assert poll_res.status_code == 200
    assert poll_res.json()["status"] == "pending"

    # 3. Simulate Telegram bot /start webhook
    webhook_payload = {
        "message": {
            "text": f"/start {token}",
            "chat": {"id": 998877},
            "from": {
                "id": 998877,
                "username": "developer_test",
                "first_name": "Dev",
                "last_name": "User",
            },
        }
    }
    wh_res = client.post("/api/auth/telegram/webhook", json=webhook_payload)
    assert wh_res.status_code == 200

    # 4. Poll again (should be verified)
    poll_res2 = client.get(f"/api/auth/poll?token={token}")
    assert poll_res2.status_code == 200
    data = poll_res2.json()
    assert data["status"] == "verified"
    access_token = data["access_token"]
    refresh_token = data["refresh_token"]
    assert access_token
    assert refresh_token

    # 5. Access /api/auth/me
    headers = {"Authorization": f"Bearer {access_token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me = me_res.json()
    assert me["telegram_id"] == 998877

    # 6. Patch display name
    patch_res = client.patch("/api/auth/me", json={"display_name": "Dev Tester"}, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["user"]["display_name"] == "Dev Tester"

    # 7. Token refresh
    ref_res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    new_access = ref_res.json()["access_token"]
    assert new_access

def test_attendance_and_work_mode(test_env):
    client = test_env["client"]

    # Create test user
    conn = sqlite3.connect(test_env["db_path"], check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("INSERT INTO users(telegram_id, username, created_at) VALUES(112233, 'att_user', '2026-08-26T00:00:00')")
    conn.commit()
    user_id = conn.execute("SELECT id FROM users WHERE telegram_id=112233").fetchone()["id"]
    access_token, _ = auth_service.issue_token_pair(conn, user_id, 112233)
    conn.close()

    headers = {"Authorization": f"Bearer {access_token}"}

    # Test work-mode get, put, toggle
    wm_res = client.get("/api/work-mode", headers=headers)
    assert wm_res.status_code == 200
    assert wm_res.json()["mode"] == "office"

    wm_toggle = client.post("/api/work-mode/toggle", headers=headers)
    assert wm_toggle.status_code == 200
    assert wm_toggle.json()["mode"] == "remote"

    # Test status
    st_res = client.get("/api/status", headers=headers)
    assert st_res.status_code == 200
    assert "day" in st_res.json()

    # Test record in & out on a non-holiday workday date: 1405-06-03 (Monday)
    test_workday = "1405-06-03"
    rec_in = client.post("/api/record", json={"event_type": "in", "at": "08:00", "date": test_workday}, headers=headers)
    assert rec_in.status_code == 200
    assert "ورود" in rec_in.json()["message"]

    rec_out = client.post("/api/record", json={"event_type": "out", "at": "16:30", "date": test_workday}, headers=headers)
    assert rec_out.status_code == 200
    assert "خروج" in rec_out.json()["message"]

    # Check tasks
    t_add = client.post("/api/tasks", json={"title": "Test Task 1", "date": test_workday}, headers=headers)
    assert t_add.status_code == 200
    tasks = t_add.json()["tasks"]
    assert len(tasks) == 1
    t_id = tasks[0]["id"]

    t_patch = client.patch(f"/api/tasks/{t_id}", json={"done": True}, headers=headers)
    assert t_patch.status_code == 200
    assert t_patch.json()["tasks"][0]["done"] is True

    t_del = client.delete(f"/api/tasks/{t_id}", headers=headers)
    assert t_del.status_code == 200
    assert len(t_del.json()["tasks"]) == 0

def test_daily_leaves_and_reports(test_env):
    client = test_env["client"]

    # Setup user
    conn = sqlite3.connect(test_env["db_path"], check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("INSERT INTO users(telegram_id, username, created_at) VALUES(445566, 'leave_user', '2026-08-26T00:00:00')")
    conn.commit()
    user_id = conn.execute("SELECT id FROM users WHERE telegram_id=445566").fetchone()["id"]
    access_token, _ = auth_service.issue_token_pair(conn, user_id, 445566)
    conn.close()

    headers = {"Authorization": f"Bearer {access_token}"}

    # Determine a valid future workday in 1405
    today = record_service.today_str()
    # Create daily leave
    leave_payload = {
        "start_date": today,
        "end_date": today,
        "type": "sick",
        "reason": "Cold fever",
    }
    leave_res = client.post("/api/daily-leaves", json=leave_payload, headers=headers)
    assert leave_res.status_code == 201
    leave_data = leave_res.json()
    assert leave_data["type"] == "sick"
    lid = leave_data["id"]

    # List daily leaves
    list_res = client.get("/api/daily-leaves", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["items"]) >= 1

    # Report today
    rep_today = client.get("/api/report/today", headers=headers)
    assert rep_today.status_code == 200

    # Report month
    rep_month = client.get("/api/report/month?month=1405-06", headers=headers)
    assert rep_month.status_code == 200
    assert "rows" in rep_month.json()
    assert "totals" in rep_month.json()

    # Excel export
    excel_res = client.get("/api/excel?month=1405-06", headers=headers)
    assert excel_res.status_code == 200
    assert excel_res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

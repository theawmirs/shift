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
    test_db = os.path.join(temp_dir, "test_manual_checkout.db")
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

def _make_user(test_env, telegram_id=99887766, username="test_ot_user"):
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

def test_manual_checkout_and_overtime_clamping(test_env):
    client = test_env["client"]
    user_id, headers = _make_user(test_env)
    test_date = "1405-06-03"  # Monday workday

    # 1. Record checkin at 09:00
    r_in = client.post("/api/record", json={"event_type": "in", "at": "09:00", "date": test_date}, headers=headers)
    assert r_in.status_code == 200

    # 2. Cannot record checkout before checkin (08:30 < 09:00)
    r_bad_out = client.post("/api/record", json={"event_type": "out", "at": "08:30", "date": test_date}, headers=headers)
    assert r_bad_out.status_code == 400
    assert "قبل از ساعت ورود" in r_bad_out.json()["detail"]

    # 3. Record checkout at 18:00 (9 hours presence, 8h standard -> 1h overtime)
    r_out = client.post("/api/record", json={"event_type": "out", "at": "18:00", "date": test_date}, headers=headers)
    assert r_out.status_code == 200

    # 4. Attempt to record 4 hours of overtime (which was the bug!)
    # Backend should clamp 4.0 down to the real 1.0 hour!
    r_ot = client.post("/api/overtime", json={"hours": 4.0, "date": test_date}, headers=headers)
    assert r_ot.status_code == 200

    # Verify day payload
    conn = sqlite3.connect(test_env["db_path"], check_same_thread=False)
    conn.row_factory = sqlite3.Row
    d = record_service.day_payload(conn, test_date, user_id=user_id)
    conn.close()

    assert d["in"] == "09:00"
    assert d["out"] == "18:00"
    assert d["gross"] == 9.0
    assert d["net"] == 9.0
    assert d["overtime"] == 1.0  # Clamped to 1.0 instead of 4.0!
    assert d["deficit"] == 0.0

def test_api_ot_alias_and_query_param(test_env):
    client = test_env["client"]
    user_id, headers = _make_user(test_env, telegram_id=88776655, username="ot_query_user")
    test_date = "1405-06-04"

    # Record 08:30 to 17:30 (9 hours -> 1 hour overtime)
    client.post("/api/record", json={"event_type": "in", "at": "08:30", "date": test_date}, headers=headers)
    client.post("/api/record", json={"event_type": "out", "at": "17:30", "date": test_date}, headers=headers)

    # Test calling /api/ot with query parameters
    r_ot = client.post(f"/api/ot?hours=1.0&date={test_date}", headers=headers)
    assert r_ot.status_code == 200

    conn = sqlite3.connect(test_env["db_path"], check_same_thread=False)
    conn.row_factory = sqlite3.Row
    d = record_service.day_payload(conn, test_date, user_id=user_id)
    conn.close()

    assert d["overtime"] == 1.0

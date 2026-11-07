import os
import sqlite3
import tempfile
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.core.config import settings
from app.api.deps import get_db
from app.db.schema import init_db
from app.services import report_service, leave_service, auth_service, record_service

@pytest.fixture(scope="function")
def test_env():
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test_work_hours.db")
    settings.DB_PATH = test_db
    settings.EXPORTS_DIR = os.path.join(temp_dir, "exports")
    settings.JWT_SECRET = "test_secret_key_123_must_be_32_bytes_or_more"

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

def test_net_overtime_and_deficit_unit():
    # 1. Overtime > Deficit
    ot, df, comp = report_service.net_overtime_and_deficit(10.0, 5.0)
    assert ot == 5.0
    assert df == 0.0
    assert comp == 5.0

    # 2. Deficit > Overtime
    ot, df, comp = report_service.net_overtime_and_deficit(5.0, 10.0)
    assert ot == 0.0
    assert df == 5.0
    assert comp == 5.0

    # 3. Overtime == Deficit
    ot, df, comp = report_service.net_overtime_and_deficit(7.5, 7.5)
    assert ot == 0.0
    assert df == 0.0
    assert comp == 7.5

    # 4. Zero values
    ot, df, comp = report_service.net_overtime_and_deficit(0.0, 3.0)
    assert ot == 0.0
    assert df == 3.0
    assert comp == 0.0

    ot, df, comp = report_service.net_overtime_and_deficit(4.0, 0.0)
    assert ot == 4.0
    assert df == 0.0
    assert comp == 0.0

def test_retroactive_daily_leave_create_and_delete(test_env):
    client = test_env["client"]
    conn = sqlite3.connect(test_env["db_path"], check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("INSERT INTO users(telegram_id, username, created_at) VALUES(889977, 'retro_user', '2026-08-26T00:00:00')")
    conn.commit()
    user_id = conn.execute("SELECT id FROM users WHERE telegram_id=889977").fetchone()["id"]
    access_token, _ = auth_service.issue_token_pair(conn, user_id, 889977)
    conn.close()

    headers = {"Authorization": f"Bearer {access_token}"}

    # 1. Create daily leave for a date in the past (e.g. 1405-06-10)
    past_date = "1405-06-10"
    res = client.post(
        "/api/daily-leaves",
        json={
            "start_date": past_date,
            "end_date": past_date,
            "type": "sick",
            "reason": "سرماخوردگی شدید",
        },
        headers=headers,
    )
    assert res.status_code == 201
    dl_data = res.json()
    assert dl_data["start_date"] == past_date
    assert dl_data["type"] == "sick"
    lid = dl_data["id"]

    # 2. Check month report includes this day with is_daily_leave = True
    rep = client.get("/api/report/month?month=1405-06", headers=headers)
    assert rep.status_code == 200
    rows = rep.json()["rows"]
    matching_rows = [r for r in rows if r["date"] == past_date]
    assert len(matching_rows) == 1
    assert matching_rows[0]["is_daily_leave"] is True
    assert matching_rows[0]["daily_leave"]["type"] == "sick"

    # 3. Delete past daily leave (must succeed!)
    del_res = client.delete(f"/api/daily-leaves/{lid}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["ok"] is True

    # 5. Create annual daily leave (ensuring annual quota check works)
    annual_date = "1405-06-11"
    res_ann = client.post(
        "/api/daily-leaves",
        json={
            "start_date": annual_date,
            "end_date": annual_date,
            "type": "annual",
            "reason": "استراحت شخصی",
        },
        headers=headers,
    )
    assert res_ann.status_code == 201
    assert res_ann.json()["type"] == "annual"
    assert res_ann.json()["id"] > 0

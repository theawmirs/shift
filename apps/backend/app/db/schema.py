import sqlite3

DEFAULT_SETTINGS = {
    "standard_hours": "8",
    "start_time": "07:00",
    "start_time_end": "09:15",
    "end_time": "15:00",
    "end_time_end": "17:15",
    "system_offset_min": "0",
    "leave_quota_hours": "208",
    "jwt_secret": "default_worktime_secret_change_me_in_production",
}

HOLIDAYS_1405 = [
    ("1405-01-01", "نوروز و عید فطر"),
    ("1405-01-02", "نوروز و تعطیل عید فطر"),
    ("1405-01-03", "نوروز"),
    ("1405-01-04", "نوروز"),
    ("1405-01-12", "روز جمهوری اسلامی"),
    ("1405-01-13", "سیزده‌بدر"),
    ("1405-01-25", "شهادت امام صادق (ع)"),
    ("1405-03-06", "عید قربان"),
    ("1405-03-14", "رحلت امام خمینی و عید غدیر"),
    ("1405-03-15", "قیام ۱۵ خرداد"),
    ("1405-04-03", "تاسوعا"),
    ("1405-04-04", "عاشورا"),
    ("1405-05-13", "اربعین"),
    ("1405-05-21", "رحلت پیامبر و شهادت امام حسن (ع)"),
    ("1405-05-22", "شهادت امام رضا (ع)"),
    ("1405-05-30", "شهادت امام حسن عسکری (ع)"),
    ("1405-06-08", "میلاد پیامبر و امام صادق (ع)"),
    ("1405-08-22", "شهادت حضرت فاطمه (س)"),
    ("1405-10-02", "ولادت امام علی (ع)"),
    ("1405-10-16", "مبعث"),
    ("1405-11-04", "ولادت امام زمان (عج)"),
    ("1405-11-22", "پیروزی انقلاب اسلامی"),
    ("1405-12-09", "شهادت امام علی (ع)"),
    ("1405-12-19", "عید فطر"),
    ("1405-12-20", "تعطیل عید فطر"),
    ("1405-12-29", "ملی‌شدن صنعت نفت"),
]

def init_db(conn: sqlite3.Connection):
    """Ensure all required tables, columns, indexes, and seed settings exist."""
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      photo_url TEXT,
      display_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_tokens (
      token TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('pending','verified','expired')),
      user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_tokens_status ON login_tokens(status, expires_at);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      jwt_hash TEXT,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS refresh_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      refresh_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_sessions(refresh_hash);
    CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS daily_leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('annual','sick','unpaid','casual')),
      reason TEXT,
      hours REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_daily_leaves_user_start ON daily_leaves(user_id, start_date);
    CREATE INDEX IF NOT EXISTS idx_daily_leaves_user_type ON daily_leaves(user_id, type);

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      event_type TEXT NOT NULL,
      ts_utc TEXT NOT NULL,
      shamsi_date TEXT NOT NULL,
      weekday TEXT,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(shamsi_date);
    CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, shamsi_date);

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      shamsi_date TEXT NOT NULL,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      day_num INTEGER,
      created_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(shamsi_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, shamsi_date);

    CREATE TABLE IF NOT EXISTS day_work_mode (
      shamsi_date TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      mode TEXT NOT NULL CHECK(mode IN ('office','remote')),
      PRIMARY KEY (shamsi_date, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_day_mode_user_date ON day_work_mode(user_id, shamsi_date);

    CREATE TABLE IF NOT EXISTS monthly_summaries (
      month_key TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      year INT, month INT, month_name TEXT,
      net_hours REAL, gross_hours REAL, overtime REAL, deficit REAL,
      leave_hours REAL, work_days INT, holiday_days INT,
      late_days INT, total_lateness REAL, standard_hours REAL,
      generated_at TEXT,
      PRIMARY KEY (month_key, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_summaries_user ON monthly_summaries(user_id);

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER NOT NULL REFERENCES users(id),
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY(user_id, key)
    );
    CREATE INDEX IF NOT EXISTS idx_user_settings ON user_settings(user_id, key);

    CREATE TABLE IF NOT EXISTS holidays (
      date TEXT PRIMARY KEY,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    """)

    # Seed default settings
    for k, v in DEFAULT_SETTINGS.items():
        conn.execute("INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)", (k, v))
    
    # Seed default holidays
    for d, n in HOLIDAYS_1405:
        conn.execute("INSERT OR IGNORE INTO holidays(date, name) VALUES(?, ?)", (d, n))

    conn.commit()

def get_user_settings(conn: sqlite3.Connection, user_id: int | None = None) -> dict[str, str]:
    """Get settings for user with fallback to DEFAULT_SETTINGS."""
    res = dict(DEFAULT_SETTINGS)
    if user_id is not None:
        rows = conn.execute("SELECT key, value FROM user_settings WHERE user_id=?", (user_id,)).fetchall()
        for r in rows:
            res[r["key"]] = r["value"]
    return res

def set_user_setting(conn: sqlite3.Connection, user_id: int, key: str, value: str) -> None:
    """Set or update setting for specific user."""
    conn.execute(
        "INSERT INTO user_settings(user_id, key, value) VALUES(?, ?, ?) "
        "ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value",
        (user_id, key, value),
    )
    conn.commit()


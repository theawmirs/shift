import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor

# Target URLs
PROD_PG_URL = "postgresql://neondb_owner:npg_tvyjUID2SC5z@ep-muddy-credit-axw983kq-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
STAGE_PG_URL = "postgresql://neondb_owner:npg_E3qg1uSyLHYJ@ep-mute-boat-ax3uzxgx-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
SQLITE_DB_PATH = "/root/hermes/projects/work-time/data/work_hours.db"

# Import app schema
sys.path.append("/root/hermes/projects/shift/apps/backend")
from app.db.database import DBAdapter
from app.db.schema import init_db

TABLES_ORDERED = [
    ("users", ["id", "telegram_id", "username", "first_name", "last_name", "photo_url", "display_name", "created_at"]),
    ("login_tokens", ["token", "status", "user_id", "created_at", "expires_at"]),
    ("sessions", ["id", "user_id", "jwt_hash", "expires_at"]),
    ("refresh_sessions", ["id", "user_id", "refresh_hash", "expires_at", "created_at", "revoked_at"]),
    ("daily_leaves", ["id", "user_id", "start_date", "end_date", "hours", "label", "reason", "created_at"]),
    ("events", ["id", "user_id", "event_type", "ts_utc", "shamsi_date", "weekday", "note"]),
    ("tasks", ["id", "user_id", "shamsi_date", "title", "description", "priority", "due_date", "done", "day_num", "created_at"]),
    ("day_work_mode", ["shamsi_date", "user_id", "mode"]),
    ("user_settings", ["user_id", "key", "value"]),
    ("holidays", ["date", "name"]),
    ("settings", ["key", "value"]),
]

def migrate_to_pg(pg_url: str, env_name: str):
    print(f"\n==========================================")
    print(f"Starting Migration to {env_name} PostgreSQL")
    print(f"==========================================")

    # 1. Connect and Init Schema
    pg_raw = psycopg2.connect(pg_url, cursor_factory=RealDictCursor)
    adapter = DBAdapter(pg_raw, is_postgres=True)
    init_db(adapter)
    print(f"✓ Schema initialized successfully on {env_name}")

    # 2. Read from SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row

    cur = pg_raw.cursor()

    for table_name, cols in TABLES_ORDERED:
        # Filter orphaned foreign key rows if table references users
        if table_name in ("sessions", "refresh_sessions", "login_tokens", "daily_leaves", "user_settings"):
            rows = sqlite_conn.execute(f"SELECT * FROM {table_name} WHERE user_id IN (SELECT id FROM users)").fetchall()
        else:
            rows = sqlite_conn.execute(f"SELECT * FROM {table_name}").fetchall()

        print(f"Migrating table '{table_name}': {len(rows)} records...")

        # Clear existing to ensure clean migration
        cur.execute(f"TRUNCATE TABLE {table_name} CASCADE;")
        
        if rows:
            col_list = ", ".join(cols)
            placeholders = ", ".join(["%s"] * len(cols))
            insert_sql = f"INSERT INTO {table_name} ({col_list}) VALUES ({placeholders})"

            data = []
            for r in rows:
                row_vals = []
                for c in cols:
                    val = r[c] if c in r.keys() else None
                    row_vals.append(val)
                data.append(tuple(row_vals))

            cur.executemany(insert_sql, data)

        # Reset serial sequences if ID column exists
        if "id" in cols:
            try:
                cur.execute(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE(MAX(id), 1)) FROM {table_name};")
            except Exception as e:
                pass

        pg_raw.commit()
        print(f"  ✓ '{table_name}' migrated & committed ({len(rows)} rows)")

    pg_raw.close()
    sqlite_conn.close()
    print(f"✓ All tables successfully migrated to {env_name} PostgreSQL!\n")

if __name__ == "__main__":
    # Migrate to Staging
    migrate_to_pg(STAGE_PG_URL, "STAGING")
    # Migrate to Production
    migrate_to_pg(PROD_PG_URL, "PRODUCTION")
    print("ALL MIGRATIONS COMPLETED SUCCESSFULLY!")

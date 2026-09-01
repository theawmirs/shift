import os
import contextlib
import re
from typing import Generator, Any
from app.core.config import settings

class DBAdapter:
    """Unified Database Adapter for SQLite and PostgreSQL with robust query translations."""
    def __init__(self, raw_conn, is_postgres: bool = False):
        self._conn = raw_conn
        self.is_postgres = is_postgres

    def _convert_query(self, sql: str) -> str:
        """Convert SQLite query syntax to PostgreSQL equivalents."""
        if not self.is_postgres:
            return sql

        # 1. Replace '?' with '%s' safely outside quotes
        parts = []
        in_quote = False
        quote_char = None
        for char in sql:
            if char in ("'", '"'):
                if not in_quote:
                    in_quote = True
                    quote_char = char
                elif quote_char == char:
                    in_quote = False
                    quote_char = None
                parts.append(char)
            elif char == "?" and not in_quote:
                parts.append("%s")
            else:
                parts.append(char)
        new_sql = "".join(parts)

        # 2. Convert INSERT OR IGNORE / INSERT OR REPLACE to PostgreSQL ON CONFLICT
        # Handles day_work_mode upsert
        if "INSERT OR REPLACE INTO day_work_mode" in sql or "INSERT OR IGNORE INTO day_work_mode" in sql:
            new_sql = new_sql.replace("INSERT OR REPLACE INTO day_work_mode", "INSERT INTO day_work_mode")
            new_sql = new_sql.replace("INSERT OR IGNORE INTO day_work_mode", "INSERT INTO day_work_mode")
            if "ON CONFLICT" not in new_sql:
                new_sql += " ON CONFLICT (shamsi_date, user_id) DO UPDATE SET mode = EXCLUDED.mode"

        # Handles settings upsert
        elif "INSERT OR REPLACE INTO settings" in sql or "INSERT OR IGNORE INTO settings" in sql:
            new_sql = new_sql.replace("INSERT OR REPLACE INTO settings", "INSERT INTO settings")
            new_sql = new_sql.replace("INSERT OR IGNORE INTO settings", "INSERT INTO settings")
            if "ON CONFLICT" not in new_sql:
                new_sql += " ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"

        # Handles sessions upsert
        elif "INSERT OR REPLACE INTO sessions" in sql:
            new_sql = new_sql.replace("INSERT OR REPLACE INTO sessions", "INSERT INTO sessions")
            if "ON CONFLICT" not in new_sql:
                new_sql += " ON CONFLICT (id) DO UPDATE SET jwt_hash = EXCLUDED.jwt_hash, expires_at = EXCLUDED.expires_at"

        # Handles holidays upsert
        elif "INSERT OR REPLACE INTO holidays" in sql or "INSERT OR IGNORE INTO holidays" in sql:
            new_sql = new_sql.replace("INSERT OR REPLACE INTO holidays", "INSERT INTO holidays")
            new_sql = new_sql.replace("INSERT OR IGNORE INTO holidays", "INSERT INTO holidays")
            if "ON CONFLICT" not in new_sql:
                new_sql += " ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name"

        # Handles generic INSERT OR IGNORE
        elif "INSERT OR IGNORE INTO" in new_sql:
            new_sql = new_sql.replace("INSERT OR IGNORE INTO", "INSERT INTO")
            if "ON CONFLICT" not in new_sql:
                new_sql += " ON CONFLICT DO NOTHING"

        return new_sql

    def execute(self, sql: str, params: tuple | list | None = None) -> Any:
        conv_sql = self._convert_query(sql)
        cur = self._conn.cursor()
        if params is not None:
            cur.execute(conv_sql, params)
        else:
            cur.execute(conv_sql)
        return cur

    def executescript(self, sql_script: str) -> None:
        if self.is_postgres:
            cur = self._conn.cursor()
            cur.execute(sql_script)
            self._conn.commit()
        else:
            self._conn.executescript(sql_script)

    def commit(self) -> None:
        self._conn.commit()

    def rollback(self) -> None:
        self._conn.rollback()

    def close(self) -> None:
        self._conn.close()


def get_db_connection(db_url_or_path: str | None = None) -> DBAdapter:
    url_or_path = db_url_or_path or settings.DATABASE_URL or settings.DB_PATH
    if url_or_path and (url_or_path.startswith("postgresql://") or url_or_path.startswith("postgres://")):
        import psycopg2
        from psycopg2.extras import DictCursor
        raw_conn = psycopg2.connect(url_or_path, cursor_factory=DictCursor)
        return DBAdapter(raw_conn, is_postgres=True)
    else:
        import sqlite3
        os.makedirs(os.path.dirname(os.path.abspath(url_or_path)), exist_ok=True)
        raw_conn = sqlite3.connect(url_or_path, check_same_thread=False)
        raw_conn.row_factory = sqlite3.Row
        raw_conn.execute("PRAGMA foreign_keys = ON")
        return DBAdapter(raw_conn, is_postgres=False)

@contextlib.contextmanager
def db_session(db_url_or_path: str | None = None) -> Generator[DBAdapter, None, None]:
    conn = get_db_connection(db_url_or_path)
    try:
        yield conn
    finally:
        conn.close()

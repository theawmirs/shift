import sqlite3
import os
import contextlib
from typing import Generator
from app.core.config import settings

def get_db_connection(db_path: str | None = None) -> sqlite3.Connection:
    target_path = db_path or settings.DB_PATH
    os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
    conn = sqlite3.connect(target_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

@contextlib.contextmanager
def db_session(db_path: str | None = None) -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection(db_path)
    try:
        yield conn
    finally:
        conn.close()

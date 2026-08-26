# Worktime Modular Backend

FastAPI backend providing attendance tracking, daily/hourly leaves, Shamsi work reports, task management, and Telegram authentication with tenant isolation.

## Features
- Modular Clean Architecture (`app/core`, `app/db`, `app/schemas`, `app/services`, `app/api/v1`)
- Multi-user tenant isolation on all SQLite operations
- Telegram Deep-Link and polling login flow
- Shamsi (Jalali) date calculations and Persian Excel export
- Interactive OpenAPI documentation at `/docs` and `/redoc`

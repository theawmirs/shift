# Architecture Specification — Shift Application

## 1. System High-Level Design

Shift provides worktime tracking, shift calculations, task management, and leave requests for Iranian teams with native Shamsi calendar support.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Clients & Interfaces                           │
│  Telegram WebApp (iOS / Android / Desktop)  │  Desktop Web Browser     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Nginx Reverse Proxy                           │
│   staging.att.pawndancertt.tech        │   att.pawndancertt.tech       │
└───────────────────┬──────────────────────────────────┬─────────────────┘
                    │                                  │
         (Staging Environment)              (Production Environment)
         Port: 34481 (Frontend)             Port: 34471 (Frontend)
         Port: 34482 (API)                  Port: 34472 (API)
                    │                                  │
                    ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Backend Layer (FastAPI / Python)                     │
│  - Authentication & Telegram WebApp Signature Verification             │
│  - Worktime, Overtime & Shift Boundary Calculators (Tehran Timezone)   │
│  - Jalali Date Aggregations & Month Matrix Generation                  │
│  - Telegram Bot Webhook & Interactive Notifications                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Connection Pooling
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 PostgreSQL Database (Neon Serverless)                  │
│  - Users, Attendances, Leaves, Tasks, Daily Summaries                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture (`apps/frontend`)

- **Core Technologies:** React 18, Vite, TypeScript, Tailwind CSS, `@tanstack/react-query`, `lucide-react`.
- **Feature-Sliced Architecture:**
  - `src/features/today`: Hero status counter, punch in/out actions (`ActionGrid`), daily progress badge (`DayDoneCard`).
  - `src/features/week`: Aggregated 7-day work hours overview and day-by-day status breakdown.
  - `src/features/month`: Shamsi monthly matrix, expandable day detail drawers, overtime / deficit analytics.
  - `src/features/tasks`: Task priority queue, inline completion loaders with debounce protection.
  - `src/features/leave`: Daily and hourly leave request forms with interactive Jalali date pickers.
  - `src/features/settings`: Profile configuration, manual data import/export CSV utilities.
- **Adaptive Display Modes:**
  - **Mobile:** Telegram WebApp SDK bindings, bottom navigation, bottom sheet drawers (`Drawer.tsx`).
  - **Desktop (>= 860px):** Permanent side navigation, floating modals with background blur.

---

## 3. Backend Architecture (`apps/backend`)

- **Core Technologies:** FastAPI, Uvicorn, Pydantic v2, `asyncpg` / `aiosqlite` / PostgreSQL.
- **Key Modules:**
  - `app/api/v1/`: Modular REST routers (`attendance.py`, `leaves.py`, `reports.py`, `settings.py`, `auth.py`).
  - `app/core/jalali.py`: Robust Shamsi-to-Gregorian and Gregorian-to-Shamsi conversion pipeline.
  - `app/services/report_service.py`: In-memory high-throughput multi-day aggregations avoiding sequential DB round-trips.
  - `app/services/bot_service.py`: Telegram Bot command handlers (`/start`, `/status`, manual entry confirmations).
  - `app/services/record_service.py`: Atomic check-in, check-out, and break calculations.

---

## 4. Security & Data Integrity

1. **Authentication:**
   - WebApp init data is cryptographically validated using Telegram HMAC-SHA256 tokens.
   - Fallback authentication mechanisms are provided for standalone browser sessions.
2. **Timezone Authority:**
   - Server enforces `Asia/Tehran` across all storage and retrieval boundaries.
   - Prevents daylight savings mismatches and leap year discrepancies in Jalali conversions.

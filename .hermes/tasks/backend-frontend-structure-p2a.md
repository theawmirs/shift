# Backend Tasks — frontend-structure-p2a (NO-OP Scope)

Feature: frontend-structure-p2a (God-Component Decomposition).
Branch: `feature/frontend-structure`.
Contract: `.hermes/contracts/contract-frontend-structure-p2a.md`.

## 1. Scope: NONE — Zero Backend Modifications
Backend FastAPI services and database schemas are strictly read-only baselines:
- `apps/backend/app/api/v1/**` (Read-only)
- `apps/backend/app/schemas/**` (Read-only)
- `apps/backend/app/core/**` (Read-only)
- `apps/backend/app/db/**` (Read-only)

## 2. Reference API Endpoints & Schemas Baseline
The frontend decomposition relies upon existing unchanged REST endpoints and Pydantic schemas:
- Attendance & Tasks endpoints (`apps/backend/app/api/v1/attendance.py`, `apps/backend/app/schemas/attendance.py`):
  - `GET /api/v1/attendance/status` -> User daily status & current session
  - `GET /api/v1/attendance/day-status` -> Day details
  - `POST /api/v1/attendance/record` -> Clock in / clock out actions
  - `POST /api/v1/attendance/day` -> Edit day manual time entries
  - `POST /api/v1/attendance/ot` -> Overtime toggle
  - `POST /api/v1/attendance/work-mode` -> Toggle work mode
  - `GET /api/v1/attendance/tasks` -> List tasks by status/date
  - `POST /api/v1/attendance/tasks` -> Create task
  - `PATCH /api/v1/attendance/tasks/{id}` -> Update task status/fields
  - `DELETE /api/v1/attendance/tasks/{id}` -> Delete task
- Leaves endpoints (`apps/backend/app/api/v1/leaves.py`, `apps/backend/app/schemas/leave.py`):
  - `GET /api/v1/leaves/daily` -> List daily leave requests
  - `POST /api/v1/leaves/daily` -> Submit daily leave request
  - `DELETE /api/v1/leaves/daily/{id}` -> Cancel/delete daily leave
- Reports endpoints (`apps/backend/app/api/v1/reports.py`, `apps/backend/app/schemas/report.py`):
  - `GET /api/v1/reports/week` -> Weekly attendance report
  - `GET /api/v1/reports/month` -> Monthly attendance report
  - `GET /api/v1/reports/months` -> Available Shamsi reporting months
  - `GET /api/v1/reports/export` -> Excel export blob
  - `GET /api/v1/reports/holidays` -> Shamsi calendar holidays list

## 3. Backend Verification & Tasks
1. Maintain strict read-only posture: DO NOT edit or format any files in `apps/backend/`.
2. Optional sanity check: `cd /root/hermes/projects/shift/apps/backend && pytest -q`.
3. If any pre-existing backend failures exist, do NOT fix them within this frontend-only scope.

## 4. Acceptance Criteria
1. Zero modifications under `apps/backend/**`.
2. Zero backend commits or schema alterations.
3. Backend test suite remains unaffected.

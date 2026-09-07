# Backend Task — 22-checkout-confirm-edit-checkin

## Scope
Implement editable check-in backend for the Today attendance flow per contract `/root/hermes/projects/shift/.hermes/contracts/contract-22-checkout-confirm-edit-checkin.md`. No changes to overtime flow, reports flow, work-mode logic, or auth.

## Files to Modify
- `apps/backend/app/schemas/attendance.py` — Add `CheckinEditRequest` with fields `at: str` (HH:MM) and `date: str | None = None` (shamsi YYYY-MM-DD, defaults to today).
- `apps/backend/app/services/record_service.py` — Add `edit_checkin_time(conn, user_id, at, date)`:
  - Resolve sdate via `today_str()`; default date to today when None.
  - Require existing `in` event; reject when missing.
  - Reject if `out` already recorded (closed day).
  - Strict HH:MM parse; reject invalid formats.
  - Reject future time more than 5 minutes ahead of `now_tehran()`.
  - Require new `in` before open `leave_start` when leave is open.
  - UPDATE only the first `in` event row (`ORDER BY ts_utc ASC LIMIT 1`); preserve note, leave intervals, and work-mode.
  - Return `day_payload`.
- `apps/backend/app/api/v1/attendance.py` (router `attendance.py`) — Add `POST /in/edit` (full path `/api/in/edit`):
  - Auth via `get_current_user_optional`.
  - Success wrapper: `{"ok": True, "message": "sajat vorood be {HH:MM} eslah shod", "day": ...}`.
  - Map ValueError to HTTP 400 with Persian message verbatim.
- `apps/backend/tests/test_api.py` (or new `test_checkin_edit.py`) — Add tests:
  - Happy path: record in at 09:15, edit to 09:11, assert 200 and day in == 09:11 with leave and mode untouched.
  - No-in returns 400.
  - Bad format (99:99, abc) returns 400.
  - Future time returns 400.
  - Day with out recorded returns 400.

## Endpoints / Schemas
- Request: `POST /api/in/edit` with body `{"at": "09:11", "date": "1405-06-15"}`; `date` optional, defaults to today (shamsi YYYY-MM-DD, Tehran wall time).
- Success (200): `{"ok": true, "message": "sajat vorood be 09:11 eslah shod", "day": {...}}`.
- Errors (400, Persian message verbatim, no stack traces):
  - No `in` event: `هنوز ورود ثبت نشده`
  - `out` already recorded: `امروز قبلا خروج ثبت شده — تا فردا`
  - Invalid HH:MM: `ساعت ورود نامعتبر است`
  - Future time (>5min ahead): `ساعت ورود نميتواند در آينده باشد`
  - New `in` after open leave start: `ساعت ورود بايد قبل از شروع مرخصي باشد`

## Out of Scope
Auth, leave service, report service, work-mode, bot, CSV, settings.

## Acceptance Criteria
- [ ] `POST /api/in/edit` happy path returns 200, day in time updated, leave intervals / work-mode / other events untouched.
- [ ] No-in returns 400; bad format returns 400; future time returns 400; closed day (out set) returns 400.
- [ ] `pytest -q` green.
- [ ] Branch `feature/22-checkout-confirm-edit-checkin` merges to `develop` only; never touch `main` / `shift-prod` without explicit human sign-off.

# Contract 22: Checkout Confirmation Sheet + Editable Check-in

## 1. Overview

Two complementary safeguards for the Today attendance flow:

1. Checkout confirmation: tapping exit currently closes the day irreversibly
   (day_status=done, only manual DB/report edit can revert). A confirmation
   BottomSheet (mobile) / centered modal (desktop) summarises the checkout
   before anything is recorded.
2. Editable check-in: users who tapped entry late can correct today's check-in
   time without manual DB intervention.

No changes to overtime flow, reports flow, work-mode logic, or auth. Staging-first
delivery; never touch main / shift-prod without explicit human sign-off.

## 2. Backend Scope with Files

| Action | File | Change |
| :--- | :--- | :--- |
| Modify | `apps/backend/app/schemas/attendance.py` | Add `CheckinEditRequest` (`at: str HH:MM`, `date: str \| None = None` shamsi YYYY-MM-DD default today) |
| Modify | `apps/backend/app/services/record_service.py` | Add `edit_checkin_time(conn, user_id, at, date)`: resolve sdate via `today_str()`; require existing `in` event; reject if `out` already recorded; strict HH:MM parse; reject future time (>5min ahead of `now_tehran()`); require new `in` before open `leave_start` if leave open; UPDATE only first `in` event row (`ORDER BY ts_utc ASC LIMIT 1`), preserve note/leave/work-mode; return `day_payload` |
| Modify | `apps/backend/app/api/v1/attendance.py` (router `attendance.py`) | Add `POST /in/edit` (full path `/api/in/edit`); auth via `get_current_user_optional`; wrap result as `{"ok": True, "message": "sajat vorood be {HH:MM} eslah shod", "day": ...}`; ValueError -> HTTP 400 with Persian message verbatim |
| Modify | `apps/backend/tests/test_api.py` (or new `test_checkin_edit.py`) | Happy path (in 09:15 -> edit 09:11, assert 200 and day in == 09:11, leave/mode untouched); no-in -> 400; bad format (99:99, abc) -> 400; future time -> 400; day with out recorded -> 400 |

Backend files out of scope: auth, leave service, report service, work-mode, bot, CSV, settings.

## 3. Frontend Scope with Files

| Action | File | Change |
| :--- | :--- | :--- |
| Modify | `apps/frontend/src/shared/lib/api.ts` | Add `editCheckin(at, date?)` via `jpost("/api/in/edit", { at, date })` |
| Modify | `apps/frontend/src/shared/api/queries.ts` | Add `useEditCheckinMutation()` invalidating `today`, `week`, `["month"]` (same pattern as `useRecordMutation`); respect existing staleTime (do not lower) |
| Create | `apps/frontend/src/features/today/CheckoutConfirmSheet.tsx` (max 220 lines) | Thin wrapper around shared responsive `Drawer` (BottomSheet <860px, centered modal >=860px). Props: open, inTime, liveMinutes, standardHours, dateLabel, loading, onConfirm, onCancel. Persian RTL content: warning plus summary rows (entry time, worked-so-far, shamsi date) + primary confirm / ghost cancel. Escape/backdrop/drag = cancel |
| Create | `apps/frontend/src/features/today/EditCheckinSheet.tsx` (max 220 lines) | `Drawer` with centered `type="time"` input (same brutalist styling as manual override drawer), prefilled with `day.in`, confirm button for the chosen HH:MM |
| Modify | `apps/frontend/src/features/today/ActionGrid.tsx` | Main exit button opens confirm sheet instead of calling `onAction("out")` directly; confirm closes sheet then continues through EXISTING overtime flow unchanged (liveHours > standardHours -> otModal, else onAction out); manual exit follows same path (pick time -> confirm sheet showing chosen time -> OT flow / onAction out with at); grid stays disabled while sheet open (loadingAction semantics or local state, no double-submit) |
| Modify | `apps/frontend/src/app/TodayPage.tsx` (or `Hero.tsx` via optional `inTimeEditable + onEditInClick` props if it keeps Hero under limits) | Render ghost button for editing entry time only when `day_status === "working"` (in set, out not set), next to Hero entry pill; wire submit -> `useEditCheckinMutation` -> success toast entry-time-corrected + today refetch (+ week/month invalidation); error toast with message; no layout shift; skeletons untouched |

UX constraints: Persian strings only in UI; code/comments/commits English. Reuse Drawer, Button, Toast, fmtHoursFa; YekanBakh FaNum numerals; RTL. No new modal infra.

## 4. API / Schema Contracts

Request:

```json
POST /api/in/edit
{ "at": "09:11", "date": "1405-06-15" }
```
`date` optional, defaults to today (shamsi YYYY-MM-DD, Tehran wall time).

Success (200):

```json
{ "ok": true, "message": "sajat vorood be 09:11 eslah shod", "day": { "...": "..." } }
```

Errors (400, Persian message verbatim, concise, no stack traces):

| Condition | Message |
| :--- | :--- |
| No `in` event | هنوز ورود ثبت نشده |
| `out` already recorded | امروز قبلا خروج ثبت شده — تا فردا |
| Invalid HH:MM | ساعت ورود نامعتبر است |
| Future time (>5min ahead) | ساعت ورود نميتواند در آينده باشد |
| New `in` after open leave start | ساعت ورود بايد قبل از شروع مرخصي باشد |

Frontend client contract:

```ts
editCheckin(at: string, date?: string): Promise<any>
useEditCheckinMutation() // invalidates today, week, ["month"]
```

Checkout sheet contract (props): `open, inTime, liveMinutes, standardHours, dateLabel, loading, onConfirm, onCancel`. Confirm path must flow through the existing overtime branch unchanged.

## 5. Acceptance Criteria

Backend:
- [ ] `POST /api/in/edit` happy path returns 200, day in time updated, leave intervals / work-mode / other events untouched.
- [ ] No-in -> 400; bad format -> 400; future time -> 400; closed day (out set) -> 400.
- [ ] `pytest -q` green.

Frontend:
- [ ] Tapping exit opens confirm sheet (no direct record); confirm routes through existing OT flow; cancel/Escape/backdrop/drag records nothing.
- [ ] Manual exit also passes through confirm sheet showing the chosen time.
- [ ] Edit entry button visible only in `working` state; submit updates time, toasts success, refetches today and invalidates week/month; errors toast the message.
- [ ] No layout shift; skeletons untouched; staleTime values unchanged.
- [ ] `npm run build` green; both new components within 220-line gate.

Delivery:
- [ ] Branch `feature/22-checkout-confirm-edit-checkin` -> PR to `develop`.
- [ ] Never touch `main` / `shift-prod`; staging deploy only after human sign-off.

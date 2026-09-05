# Contract: frontend-structure-p2a — God-Component Decomposition

## 1. Overview
This architectural contract defines the exact decomposition plan for Phase 2a of the `frontend-structure` refactor on branch `feature/frontend-structure`.
Building upon the completed Phase 1 and endpoint splitting:
- `apps/frontend/src/shared/lib/api.ts` is deleted.
- `@/*` path alias is active in `tsconfig.paths.json` and `vite.config.js`.
- Route page `TodayPage.tsx` is already decomposed (<120 lines) alongside uncommitted extraction artifacts (`StatusBanner.tsx`, `useTodayStatus.ts`) which will be staged and committed.

Phase 2a strictly isolates **god-component decomposition** into clean, testable subcomponents and custom hooks.
Zero behavior changes, zero API changes, zero backend modifications, zero CSS/styles refactoring (reserved for Phase 2b), and zero type redefinition (Phase 2b). All RTL layout rules, Persian strings, and Jalali date logic remain strictly untouched.

## 2. Backend Scope with Files
**Scope: NONE (Zero backend modifications).**
Backend FastAPI services and database schemas are strictly read-only baselines:
- `apps/backend/app/api/v1/**` (Read-only)
- `apps/backend/app/schemas/**` (Read-only)
- `apps/backend/app/core/**` (Read-only)
- `apps/backend/app/db/**` (Read-only)

## 3. Frontend Scope with Files

Decompose oversized components and pages into focused modular slices where route pages are thin composition shells (<120 lines) and all feature files adhere to the strict line cap (<=400 lines).

### 3.1 `TodayPage.tsx` Baseline Commitment
- `apps/frontend/src/pages/TodayPage.tsx` (Already ~106 lines, verify & commit)
- `apps/frontend/src/features/today/StatusBanner.tsx` (Extracted component, commit)
- `apps/frontend/src/features/today/hooks/useTodayStatus.ts` (Extracted hook, commit)

### 3.2 `CalendarPage.tsx` Decomposition
- Target: `apps/frontend/src/pages/CalendarPage.tsx` (<120 lines composition root)
- Target extracted components / hooks:
  - `apps/frontend/src/features/month/hooks/useCalendarNavigation.ts`: Handles active Shamsi month/year state, query sync, month navigation (prev/next/today), and month dropdown data.
  - `apps/frontend/src/features/month/CalendarHeader.tsx`: Month/year selector dropdowns, prev/next buttons, print/export triggers, and quick action bar.
  - `apps/frontend/src/features/month/CalendarView.tsx`: Month grid/table representation, day cell rendering, Jalali holiday indicators, and day selection events.

### 3.3 `LoginPage.tsx` Decomposition
- Target: `apps/frontend/src/pages/LoginPage.tsx` (<120 lines composition shell)
- Target extracted components / hooks:
  - `apps/frontend/src/features/auth/hooks/useLoginForm.ts`: Handles login form state (username, password, server URL), validation, error banners, submission flow, and auth query mutation.
  - `apps/frontend/src/features/auth/LoginForm.tsx`: Controlled inputs for credentials, remember me, error alerts, and submit button.
  - `apps/frontend/src/features/auth/LoginBranding.tsx`: App logo, title, Persian tagline, and theme/decor layout elements.

### 3.4 `features/tasks/TasksList.tsx` Decomposition (1,118 lines -> <=400 lines each)
- Target: `apps/frontend/src/features/tasks/TasksList.tsx` (or `TaskList.tsx` composition wrapper <=400 lines)
- Target extracted components / hooks:
  - `apps/frontend/src/features/tasks/hooks/useTasks.ts`: React Query data fetch (`tasks` key, `staleTime: 60000`), mutations (add, patch, delete), filtering/sorting logic (uncompleted first, today due, pagination).
  - `apps/frontend/src/features/tasks/TaskItemCard.tsx`: Individual task row/card, checkbox toggle, priority badge, Jalali due date badge, edit/delete actions.
  - `apps/frontend/src/features/tasks/TaskFilterBar.tsx`: Status filters (all, pending, completed), search input, priority filter, sort controls.
  - `apps/frontend/src/features/tasks/TaskFormModal.tsx`: Modal dialog for creating/editing tasks with Shamsi datepicker integration and validation.

### 3.5 `features/month/DayDetailDrawer.tsx` & `MonthReport.tsx` Decomposition
- Target: `apps/frontend/src/features/month/MonthReport.tsx` (<=400 lines)
- Target: `apps/frontend/src/features/month/DayDetailDrawer.tsx` (<=400 lines)
- Target extracted components / hooks:
  - `apps/frontend/src/features/month/MonthSummaryCards.tsx`: Summary statistic cards (total worked hours, overtime, deficit, leave balance).
  - `apps/frontend/src/features/month/DayWorklogDrawerContent.tsx` / `DayEventsTimeline.tsx`: Detailed event timeline (entry/exit intervals, manual edits, OT offsets) within DayDetailDrawer.
  - `apps/frontend/src/features/month/hooks/useDayDetail.ts`: Day status calculation, work log editing mutations, and leave status for selected day.

### 3.6 `features/leave/DailyLeaveCard.tsx` Decomposition (425 lines -> <=400 lines each)
- Target: `apps/frontend/src/features/leave/DailyLeaveCard.tsx` (<=400 lines)
- Target extracted components / hooks:
  - `apps/frontend/src/features/leave/hooks/useLeaves.ts`: Query and mutations (`listDailyLeaves`, `createDailyLeave`, `deleteDailyLeave`), month filtering, leave quota calculation.
  - `apps/frontend/src/features/leave/LeaveHistoryDrawer.tsx` / `LeaveModal.tsx`: Leave request creation dialog and historical record listing.

### 3.7 `features/today/ActionGrid.tsx` Decomposition (342 lines -> <=400 lines each)
- Target: `apps/frontend/src/features/today/ActionGrid.tsx` (<=400 lines)
- Target extracted components / hooks:
  - `apps/frontend/src/features/today/hooks/useTodayActions.ts`: Entry/exit clocking mutation handlers, location/note modal state, OT toggle logic.
  - `apps/frontend/src/features/today/ManualTimeModal.tsx`: Modal for manual time record corrections or adjustments.

## 4. API & Schema Contracts
All client-side API contracts and network payloads remain strictly identical to the existing endpoint implementations:
- `apps/frontend/src/shared/api/endpoints/attendance.ts`:
  - `status()` -> `GET /api/v1/attendance/status`
  - `dayStatus(date)` -> `GET /api/v1/attendance/day-status`
  - `record(payload)` -> `POST /api/v1/attendance/record`
  - `editDay(payload)` -> `POST /api/v1/attendance/day`
  - `ot(payload)` -> `POST /api/v1/attendance/ot`
  - `toggleWorkMode()` -> `POST /api/v1/attendance/work-mode`
- `apps/frontend/src/shared/api/endpoints/tasks.ts`:
  - `tasks(date, status)` -> `GET /api/v1/attendance/tasks`
  - `addTask(payload)` -> `POST /api/v1/attendance/tasks`
  - `patchTask(id, payload)` -> `PATCH /api/v1/attendance/tasks/{id}`
  - `delTask(id)` -> `DELETE /api/v1/attendance/tasks/{id}`
- `apps/frontend/src/shared/api/endpoints/leaves.ts`:
  - `listDailyLeaves(year, month)` -> `GET /api/v1/leaves/daily`
  - `createDailyLeave(payload)` -> `POST /api/v1/leaves/daily`
  - `deleteDailyLeave(id)` -> `DELETE /api/v1/leaves/daily/{id}`
- `apps/frontend/src/shared/api/endpoints/reports.ts`:
  - `reportWeek(date)` -> `GET /api/v1/reports/week`
  - `reportMonth(year, month)` -> `GET /api/v1/reports/month`
  - `months()` -> `GET /api/v1/reports/months`
  - `excelBlob(year, month)` -> `GET /api/v1/reports/export`
  - `getHolidays(year, month)` -> `GET /api/v1/reports/holidays`
- React Query configurations:
  - Query keys: `['status']`, `['dayStatus']`, `['tasks']`, `['leaves']`, `['reportWeek']`, `['reportMonth']`
  - Cache policy: `staleTime: 60 * 1000` (60s) on tasks, week, and month queries.

## 5. Acceptance Criteria
1. `npm run build` passes with zero errors (`tsc` + `vite build`).
2. Route page line counts:
   - `apps/frontend/src/pages/CalendarPage.tsx` < 120 lines
   - `apps/frontend/src/pages/LoginPage.tsx` < 120 lines
   - `apps/frontend/src/pages/TodayPage.tsx` < 120 lines
   - All other route files in `src/pages/*.tsx` remain thin composition shells (< 120 lines).
3. Component file line bounds:
   - No single file in `apps/frontend/src/features/**/*.tsx` or `apps/frontend/src/pages/*.tsx` exceeds 400 lines.
4. Functional fidelity:
   - Zero visual regressions or functional behavior changes.
   - Preserves all Persian RTL layouts, YekanBakh FaNum typography, and Shamsi calendar computations.
5. Version control & clean working directory:
   - Commits follow Conventional Commits format (`refactor(frontend): ...`).
   - Git identity: `user.name "KINETIC-SLDC"`, `user.email "321383955+KINETIC-SLDC@users.noreply.github.com"`.

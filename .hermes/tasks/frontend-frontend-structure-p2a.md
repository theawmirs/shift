# Frontend Tasks — frontend-structure-p2a (God-Component Decomposition)

Feature: frontend-structure-p2a.
Branch: `feature/frontend-structure` (already checked out — DO NOT switch branches).
Contract: `.hermes/contracts/contract-frontend-structure-p2a.md`.
Spec: `.hermes/specs/spec-frontend-structure-p2a.md`.

## 1. Scope & Guidelines
Decompose god components and oversized route pages into modular, testable subcomponents and focused custom hooks.
- Code/comments/commits in English only.
- ZERO behavior, visual, or layout changes (preserve RTL, Persian strings, and Jalali date logic).
- ZERO backend changes, NO new dependencies, NO styles refactoring (reserved for Phase 2b), and NO types redesign (Phase 2b).
- Every route page in `src/pages/*.tsx` must be a thin composition shell (< 120 lines).
- No single file in `apps/frontend/src/features/**/*.tsx` or `apps/frontend/src/pages/*.tsx` may exceed 400 lines.
- Commit each slice cleanly using Conventional Commits format (`refactor(frontend): ...`).

---

## 2. Work Breakdown & Milestones

### Milestone 1 — TodayPage Baseline Commitment
Commit uncommitted baseline changes already present on `feature/frontend-structure`:
- Files:
  - `apps/frontend/src/pages/TodayPage.tsx` (thin composition shell, ~106 lines)
  - `apps/frontend/src/features/today/StatusBanner.tsx`
  - `apps/frontend/src/features/today/hooks/useTodayStatus.ts`
  - `apps/frontend/tsconfig.json` & `apps/frontend/vite.config.js` (alias setup)
- Verification: `npm run build` passes.
- Commit: `refactor(frontend): stage and commit today page extraction baseline`

### Milestone 2 — CalendarPage Decomposition (<120 lines)
Decompose `apps/frontend/src/pages/CalendarPage.tsx` (~518 lines) into thin page + modular feature components & hooks:
- Target files:
  - `apps/frontend/src/pages/CalendarPage.tsx` (< 120 lines composition shell)
  - `apps/frontend/src/features/month/hooks/useCalendarNavigation.ts` (Shamsi month/year state, query params sync, navigation controls)
  - `apps/frontend/src/features/month/CalendarHeader.tsx` (Month/year selectors, nav buttons, action triggers)
  - `apps/frontend/src/features/month/CalendarView.tsx` (Month grid, day cells, Jalali holiday indicators, selection handling)
- Verification: `npm run build` passes; `wc -l apps/frontend/src/pages/CalendarPage.tsx` < 120.
- Commit: `refactor(frontend): decompose calendar page into navigation hook and subcomponents`

### Milestone 3 — LoginPage Decomposition (<120 lines)
Decompose `apps/frontend/src/pages/LoginPage.tsx` (~413 lines) into thin page + auth feature slice:
- Target files:
  - `apps/frontend/src/pages/LoginPage.tsx` (< 120 lines composition shell)
  - `apps/frontend/src/features/auth/hooks/useLoginForm.ts` (Form state, validation, submission, error handling, auth mutations)
  - `apps/frontend/src/features/auth/LoginForm.tsx` (Controlled input fields, submit button, alerts)
  - `apps/frontend/src/features/auth/LoginBranding.tsx` (Branding, logo, title, Persian tagline)
- Verification: `npm run build` passes; `wc -l apps/frontend/src/pages/LoginPage.tsx` < 120.
- Commit: `refactor(frontend): decompose login page into auth components and hook`

### Milestone 4 — TasksList Decomposition (1,118 lines -> <=400 lines each)
Decompose `apps/frontend/src/features/tasks/TasksList.tsx` (~1,118 lines) into modular subcomponents:
- Target files:
  - `apps/frontend/src/features/tasks/TasksList.tsx` (or `TaskList.tsx` composition wrapper <= 400 lines)
  - `apps/frontend/src/features/tasks/hooks/useTasks.ts` (React Query `tasks` query with `staleTime: 60000`, add/patch/del mutations, filtering/pagination logic)
  - `apps/frontend/src/features/tasks/TaskItemCard.tsx` (Task row, priority badge, due date badge, toggle/edit/delete actions)
  - `apps/frontend/src/features/tasks/TaskFilterBar.tsx` (Status tabs, priority filter, search input, sorting controls)
  - `apps/frontend/src/features/tasks/TaskFormModal.tsx` (Task create/edit dialog with Shamsi datepicker)
- Verification: `npm run build` passes; all files in `apps/frontend/src/features/tasks/` <= 400 lines.
- Commit: `refactor(frontend): decompose tasks list into subcomponents and useTasks hook`

### Milestone 5 — Month Features Decomposition (`MonthReport` & `DayDetailDrawer`)
Decompose oversized month drawer and report components to strictly comply with <= 400 line caps:
- Target files:
  - `apps/frontend/src/features/month/MonthReport.tsx` (<= 400 lines)
  - `apps/frontend/src/features/month/DayDetailDrawer.tsx` (<= 400 lines)
  - `apps/frontend/src/features/month/MonthSummaryCards.tsx` (Extracted statistics: total hours, overtime, deficit, leave balance)
  - `apps/frontend/src/features/month/DayEventsTimeline.tsx` / `DayWorklogDrawerContent.tsx` (Worklog event intervals and manual edits)
  - `apps/frontend/src/features/month/hooks/useDayDetail.ts` (Day status query/mutations, leave status)
- Verification: `npm run build` passes; all files in `apps/frontend/src/features/month/` <= 400 lines.
- Commit: `refactor(frontend): decompose month report and day detail drawer into modular slices`

### Milestone 6 — Leave & Today Feature Decompositions (`DailyLeaveCard` & `ActionGrid`)
Decompose `DailyLeaveCard.tsx` (425 lines) and extract action hooks from `ActionGrid.tsx` (342 lines):
- Target files:
  - `apps/frontend/src/features/leave/DailyLeaveCard.tsx` (<= 400 lines)
  - `apps/frontend/src/features/leave/hooks/useLeaves.ts` (Query and mutations for daily leaves, quota balance)
  - `apps/frontend/src/features/leave/LeaveHistoryDrawer.tsx` or `LeaveModal.tsx`
  - `apps/frontend/src/features/today/ActionGrid.tsx` (<= 400 lines)
  - `apps/frontend/src/features/today/hooks/useTodayActions.ts` (Clock in/out handlers, location/note state, OT logic)
  - `apps/frontend/src/features/today/ManualTimeModal.tsx`
- Verification: `npm run build` passes; all files in `apps/frontend/src/features/leave/` and `src/features/today/` <= 400 lines.
- Commit: `refactor(frontend): decompose daily leave card and extract today action hooks`

---

## 3. Acceptance Criteria
1. `npm run build` runs cleanly with zero errors (`tsc` + `vite build`).
2. Route line count limits:
   - `apps/frontend/src/pages/CalendarPage.tsx` < 120 lines
   - `apps/frontend/src/pages/LoginPage.tsx` < 120 lines
   - `apps/frontend/src/pages/TodayPage.tsx` < 120 lines
   - All other route files in `src/pages/*.tsx` remain < 120 lines.
3. Component line count limits:
   - No file in `apps/frontend/src/features/**/*.tsx` or `apps/frontend/src/pages/*.tsx` exceeds 400 lines.
4. Functional & visual parity:
   - Preserves all Persian RTL layouts, YekanBakh FaNum typography, and Shamsi calendar calculations.
   - Preserves React Query cache policies (`staleTime: 60000`).
5. Commits cleanly staged and atomic with Conventional Commits (`refactor(frontend): ...`).

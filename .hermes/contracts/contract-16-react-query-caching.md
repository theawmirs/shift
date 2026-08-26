# Contract 16: React Query Caching & Client State Architecture

## Overview
Integrate `@tanstack/react-query` into `apps/frontend` to eliminate screen flickering, skeleton flashes during navigation/tab switches, and manual state synchronization. Provide centralized query key factories, custom hooks, and mutation cache invalidation workflows.

---

## 1. Package Installation
Target: `apps/frontend`
- Dependency: `@tanstack/react-query` (v5 latest)

```bash
cd apps/frontend && npm install @tanstack/react-query
```

---

## 2. QueryClient Configuration
Target: `apps/frontend/src/app/App.tsx` (or `main.tsx`)

Wrap top-level application inside `<QueryClientProvider client={queryClient}>`.

### Global Defaults
```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh data window
      gcTime: 1000 * 60 * 15,    // 15 minutes garbage collection window (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

## 3. Query Key Factory Mapping
Target: `apps/frontend/src/shared/api/queryKeys.ts`

Standardized key hierarchy for query caching and invalidation:

| Scope | Query Key Expression | Purpose |
|---|---|---|
| **Auth** | `authKeys.me()` -> `['auth', 'me']` | Current authenticated user profile |
| **Attendance / Today** | `attendanceKeys.status()` -> `['attendance', 'status']` | Current live day status, check-in/out, live_net |
| **Attendance / Today** | `attendanceKeys.today()` -> `['attendance', 'today']` | Alias / umbrella for today attendance status |
| **Reports / Month** | `reportKeys.allMonths()` -> `['reports', 'months']` | List of available months metadata |
| **Reports / Month** | `reportKeys.month(monthKey)` -> `['reports', 'month', monthKey]` | Monthly calendar grid, net hours, deficits |
| **Reports / Month** | `reportKeys.all()` -> `['reports']` | Prefix for invalidating all monthly reports |
| **Leaves** | `leaveKeys.list(params?)` -> `['leaves', 'list', params]` | List of daily leaves for user / month |
| **Leaves** | `leaveKeys.summary()` -> `['leaves', 'summary']` | Leave quotas and remaining balance |
| **Leaves** | `leaveKeys.all()` -> `['leaves']` | Prefix for invalidating all leave lists & summaries |
| **Settings** | `settingsKeys.all()` -> `['settings', 'all']` | System / user shift settings |

---

## 4. Custom Hooks & Refactored Components

### 4.1 Custom Query & Mutation Hooks
Target directory: `apps/frontend/src/shared/api/queries/` or `apps/frontend/src/features/*/`

1. **`useTodayStatus()`**
   - Query: `queryKey: attendanceKeys.status()`
   - Fetcher: `API.status()`
   - Refetch interval: 30s background poll (optional, or stale-while-revalidate)

2. **`useMonthReport(monthKey: string)`**
   - Query: `queryKey: reportKeys.month(monthKey)`
   - Fetcher: `API.reportMonth(monthKey)`
   - Enabled: `!!monthKey`

3. **`useMonths()`**
   - Query: `queryKey: reportKeys.allMonths()`
   - Fetcher: `API.months()`

4. **`useDailyLeaves(monthKey?: string)`**
   - Query: `queryKey: leaveKeys.list({ month: monthKey })`
   - Fetcher: `API.listDailyLeaves({ month: monthKey })`

5. **`useSettings()`**
   - Query: `queryKey: settingsKeys.all()`
   - Fetcher: `API.getSettings()`

6. **`useAuthMe()`**
   - Query: `queryKey: authKeys.me()`
   - Fetcher: `API.authMe()`

---

### 4.2 Mutation & Invalidation Strategy

| Mutation Hook | Action / API Call | Cache Invalidation Triggers |
|---|---|---|
| `useRecordAttendanceMutation()` | `API.record(eventType, time)` | `queryClient.invalidateQueries({ queryKey: attendanceKeys.all })`<br>`queryClient.invalidateQueries({ queryKey: reportKeys.all })` |
| `useToggleWorkModeMutation()` | `API.toggleWorkMode()` | `queryClient.invalidateQueries({ queryKey: attendanceKeys.all })` |
| `useCreateDailyLeaveMutation()` | `API.createDailyLeave(data)` | `queryClient.invalidateQueries({ queryKey: leaveKeys.all })`<br>`queryClient.invalidateQueries({ queryKey: attendanceKeys.all })`<br>`queryClient.invalidateQueries({ queryKey: reportKeys.all })` |
| `useDeleteDailyLeaveMutation()` | `API.deleteDailyLeave(id)` | `queryClient.invalidateQueries({ queryKey: leaveKeys.all })`<br>`queryClient.invalidateQueries({ queryKey: attendanceKeys.all })`<br>`queryClient.invalidateQueries({ queryKey: reportKeys.all })` |
| `useUpdateSettingMutation()` | `API.putSetting(key, val)` | `queryClient.invalidateQueries({ queryKey: settingsKeys.all })`<br>`queryClient.invalidateQueries({ queryKey: reportKeys.all })` |
| `useUpdateProfileMutation()` | `API.authUpdateMe(name)` | `queryClient.invalidateQueries({ queryKey: authKeys.me() })` |

---

### 4.3 Refactored Frontend Targets
- **`TodayPage.tsx`**: Replace `useState(status)` + manual `refresh()` with `useTodayStatus()`, `useRecordAttendanceMutation()`, `useToggleWorkModeMutation()`.
- **`features/month/useMonthReport.ts` & `MonthReport.tsx`**: Leverage React Query caching for `months` and `reportMonth(selMonth)` to make month tab switches instantaneous.
- **`DailyLeaveCard.tsx` / `LeavesPage`**: Replace manual state deletion and fetch loops with `useDailyLeaves()` and `useDeleteDailyLeaveMutation()`.
- **`SettingsForm.tsx` & `ProfileCard.tsx`**: Fetch settings and user profile with `useSettings()` and `useAuthMe()`, update via mutation hooks.
- **`App.tsx`**: Wrap with `QueryClientProvider`.

---

## 5. Ordered Implementation Plan for Forge

1. **Step 1: Dependency**
   - Install `@tanstack/react-query` in `apps/frontend/package.json`.
2. **Step 2: Core Infrastructure**
   - Create `apps/frontend/src/shared/api/queryClient.ts` with global client configuration.
   - Create `apps/frontend/src/shared/api/queryKeys.ts` with typed query key factory.
   - Wrap `App.tsx` root with `QueryClientProvider`.
3. **Step 3: Query & Mutation Hooks**
   - Implement typed query and mutation hooks under `apps/frontend/src/shared/api/queries/` or corresponding feature modules.
4. **Step 4: Component Refactoring**
   - Refactor `TodayPage.tsx` to use React Query hooks and mutations.
   - Refactor `MonthReport.tsx` and `useMonthReport.ts`.
   - Refactor `DailyLeaveCard.tsx`.
   - Refactor `SettingsForm.tsx` and `ProfileCard.tsx`.
5. **Step 5: Verification & Build**
   - Run `npm run build` in `apps/frontend` to verify 0 type errors.
   - Verify tab transitions retain cache without flashing skeletons.

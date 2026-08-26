# Contract 17: Reports BottomSheet, Calendar View & User Settings Isolation

## 1. Overview
Decomposes Spec 17 requirements into backend database schemas, REST APIs, frontend components, and React Query integration.

---

## 2. Backend Specifications

### 2.1 Database Schema & Migration

#### New Table: `user_settings`
```sql
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
```

#### Migration & Fallback Logic
- Default fallback values come from `DEFAULT_SETTINGS` in `app/db/schema.py` (e.g., `standard_hours`, `start_time`, etc.).
- When reading settings for `user_id`:
  - Fetch default global/fallback settings.
  - Query `user_settings` where `user_id = ?`.
  - Override default key-values with user-specific rows.
- When `uid` is None (unauthenticated / legacy), fall back to `DEFAULT_SETTINGS` / global table.

---

### 2.2 Endpoints & Contracts

#### `GET /api/settings`
- **Auth:** Optional / Required (uses `get_current_user_optional` or `get_current_user`).
- **Response:** `200 OK`
```json
{
  "standard_hours": "8",
  "start_time": "08:00",
  "start_time_end": "09:00",
  "end_time": "17:00",
  "end_time_end": "18:00"
}
```

#### `POST /api/settings` & `PUT /api/settings`
- **Auth:** Scoped to authenticated user.
- **Request Body:**
```json
{
  "key": "standard_hours",
  "value": "8.5"
}
```
- **Validation:** Same rules as existing (`standard_hours` 1..24, time fields HH:MM).
- **Behavior:** Upserts into `user_settings(user_id, key, value)`.
- **Response:** `200 OK`
```json
{
  "ok": true,
  "key": "standard_hours",
  "value": "8.5"
}
```

#### `GET /api/holidays` & `GET /api/holidays/{year}`
- **Path:** `/api/holidays` (optional query param `year: int | None`) or `/api/holidays/{year}`.
- **Query / Param:** Optional Shamsi year (e.g., `1403`, `1404`, `1405`).
- **Response:** `200 OK` -> `List[HolidayResponse]`
```json
[
  {
    "date": "1403/01/01",
    "name": "جشن نوروز / سال نو"
  },
  {
    "date": "1403/01/02",
    "name": "عید نوروز"
  }
]
```

---

## 3. Frontend Specifications

### 3.1 Routing & Bottom Navigation Update
- Update `BottomNav` in `shared/ui/Chrome.tsx`:
  - `week` (`/week`) -> `reports` (`/reports`), label: "گزارش‌ها" (Icon: `BarChart3`).
  - Add `calendar` (`/calendar`), label: "تقویم" (Icon: `Calendar` from `lucide-react`).
  - Order:
    1. امروز (`/`)
    2. گزارش‌ها (`/reports`)
    3. تقویم (`/calendar`)
    4. تسک‌ها (`/tasks`)
    5. تنظیمات (`/settings`)
- Update `App.tsx` routing:
  - Route `/reports` (and alias `/week` for backward compatibility) -> `ReportsPage` / `WeekPage`.
  - Route `/calendar` -> `CalendarPage`.

### 3.2 DayDetailDrawer (BottomSheet Component)
- **Trigger:** Clicking any day card/row in Weekly/Monthly report view.
- **Props:**
  - `open: boolean`
  - `onClose: () => void`
  - `dayData: AttendanceRecord | DayReport | null`
- **Telemetry Display Fields (Dynamic / Conditional):**
  - Date (Shamsi & day of week)
  - Status badge (حاضر / غایب / تعطیل / مرخصی)
  - Check-in (`in`) & Check-out (`out`) times
  - Hourly leave interval: `leave_start` - `leave_end` (rendered only if present)
  - Total duration / Net work time (minutes converted to `X ساعت و Y دقیقه`)
  - Regular work hours vs Overtime (اضافه کاری) breakdown (rendered only if `overtime > 0`)
  - Day description / note if present

### 3.3 CalendarPage (Shamsi Monthly View)
- **Component:** `src/app/CalendarPage.tsx` & `src/features/calendar/CalendarGrid.tsx`.
- **Functionality:**
  - Shamsi month view with month switcher (previous / next / current).
  - Highlights Fridays (جمعه) and official Iranian holidays.
  - Integration with `useHolidaysQuery`.
  - Clicking any holiday or day cell opens a BottomSheet / Drawer displaying holiday name/occasion and details.

### 3.4 React Query Hooks (`shared/api/queries.ts`)
- **Query Keys:**
  - `queryKeys.settings = ["settings"]`
  - `queryKeys.holidays = (year?: number) => ["holidays", year]`
- **Hooks:**
  - `useUserSettingsQuery()`: fetches `/api/settings`.
  - `useUpdateSettingsMutation()`: sends `POST` or `PUT` to `/api/settings`, invalidates `queryKeys.settings`.
  - `useHolidaysQuery(year?: number)`: fetches `/api/holidays` or `/api/holidays?year=...`.

---

## 4. Implementation Steps for Forge
1. **Backend Step 1:** Add `user_settings` table to schema and migration in `app/db/schema.py`.
2. **Backend Step 2:** Implement user-isolated get/set in `app/services/auth_service.py` / `app/services/settings_service.py` and update `app/api/v1/settings.py`.
3. **Backend Step 3:** Implement `/api/holidays` endpoint in `app/api/v1/holidays.py` and register router in `app/main.py`.
4. **Backend Step 4:** Write unit tests in `apps/backend/tests/` for settings isolation and holidays endpoint.
5. **Frontend Step 1:** Update `api.ts` and `queries.ts` with settings and holidays hooks.
6. **Frontend Step 2:** Update `Chrome.tsx` and `App.tsx` routes (Reports & Calendar).
7. **Frontend Step 3:** Build `DayDetailDrawer` in `features/reports/DayDetailDrawer.tsx` and connect to Reports view.
8. **Frontend Step 4:** Build `CalendarPage` and `CalendarGrid` in `features/calendar/`.
9. **Verification:** Run `pytest` and `npm run build`.

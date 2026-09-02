# Contract 21: User Account Hard Delete (Danger Zone in Settings)

## 1. Executive Summary & Objective
Implement a secure, permanent, and irrecoverable user account hard-delete feature across the Shift monorepo (`apps/backend` and `apps/frontend`). When an authenticated user triggers account deletion from the Danger Zone on the Settings page:
1. All database records associated with the user are completely purged in a single atomic transaction.
2. All active sessions, refresh tokens, and authentication credentials in memory/storage are invalidated and wiped.
3. The user is logged out, the React Query client cache is cleared, and the user is redirected to the login screen with a Persian confirmation notification.

---

## 2. Backend Architecture & API Specifications (`apps/backend`)

### 2.1 Route & Endpoint Contract
- **Method & Path:** `DELETE /api/v1/auth/me` and `DELETE /api/auth/me` (under existing auth router prefixed with `/auth` and `/api/v1/auth`).
- **Tag:** `Authentication`
- **Authentication:** `uid: int = Depends(get_current_user)` (strict, rejects unauthenticated/anonymous access with HTTP 401).
- **Response Model:** `DeleteAccountResponse` with schema `{"ok": True, "message": "حساب کاربری و کلیه اطلاعات مربوطه با موفقیت حذف شد"}`.
- **HTTP Status Code:** `200 OK` on success, `401 Unauthorized` if unauthenticated.

### 2.2 Pydantic Schema (`app/schemas/auth.py`)
```python
class DeleteAccountResponse(BaseModel):
    ok: bool
    message: str = "حساب کاربری و کلیه اطلاعات مربوطه با موفقیت حذف شد"
```

### 2.3 Cascade & Atomic Hard Deletion Logic (`app/services/auth_service.py` & `app/api/v1/auth.py`)
Execute hard deletions sequentially within a single atomic database transaction (`conn.commit()`):
1. `DELETE FROM events WHERE user_id = :uid`
2. `DELETE FROM tasks WHERE user_id = :uid`
3. `DELETE FROM daily_leaves WHERE user_id = :uid`
4. `DELETE FROM day_work_mode WHERE user_id = :uid`
5. `DELETE FROM monthly_summaries WHERE user_id = :uid`
6. `DELETE FROM user_settings WHERE user_id = :uid`
7. `DELETE FROM login_tokens WHERE user_id = :uid`
8. `DELETE FROM sessions WHERE user_id = :uid`
9. `DELETE FROM refresh_sessions WHERE user_id = :uid`
10. `DELETE FROM users WHERE id = :uid` (Delete the user row itself)

*Note on DB Compatibility:* Explicit multi-table deletion guarantees complete cleanup across both local SQLite test environments and Neon PostgreSQL staging/production environments.

---

## 3. Frontend Architecture & UI Specifications (`apps/frontend`)

### 3.1 API Client (`apps/frontend/src/shared/lib/api.ts`)
Add method to the `API` object:
```typescript
async authDeleteMe(): Promise<{ ok: boolean; message?: string }> {
  const res = await this._fetchWithRefresh("/api/auth/me", {
    method: "DELETE",
    headers: this._headers(true),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "خطا در حذف حساب کاربری");
  }
  return res.json();
}
```

### 3.2 Danger Zone Component (`apps/frontend/src/features/settings/DangerZoneCard.tsx`)
Create a dedicated Neo-Brutalist Danger Zone card component:
- **Card Design:**
  - Border: `2px solid var(--border-strong)` with red accenting / danger styling.
  - Header: Kicker `DANGER ZONE`, Title `منطقه خطر` with `AlertTriangle` icon (`lucide-react`).
  - Explanatory copy in Persian:
    > "حذف حساب کاربری غیرقابل بازگشت است و تمام ساعت‌های کاری، مرخصی‌ها، وظایف و تنظیمات شما برای همیشه پاک خواهد شد."
  - Action Button: `<Button variant="danger" icon={<Trash2 size={16} />}>حذف دائمی حساب کاربری</Button>`

- **Confirmation Flow (Modal / Drawer):**
  - Clicking the trigger button opens a confirmation prompt (using `Drawer` or responsive confirmation modal).
  - Explicit Persian warning message and secondary confirmation button: `"بله، حساب من را برای همیشه حذف کن"`.
  - Cancel button: `"انصراف"`.

- **Execution & Teardown Flow:**
  1. Set loading state on confirmation button.
  2. Await `API.authDeleteMe()`.
  3. Clear tokens via `API.clearTokens()`.
  4. Reset auth context via `setUser(null)` and `logout()`.
  5. Clear React Query cache via `queryClient.clear()`.
  6. Display toast: `"حساب کاربری شما با موفقیت و برای همیشه حذف شد"`.
  7. Redirect to root (`/`).

### 3.3 Settings Page Integration (`apps/frontend/src/app/SettingsPage.tsx`)
Mount `<DangerZoneCard />` at the bottom of `SettingsPage.tsx`:
```tsx
<div className="page-fade" style={{ display: "grid", gap: 12 }}>
  <ProfileCard />
  <SettingsForm />
  <DataTransferCard onImportSuccess={handleRefreshData} />
  <DangerZoneCard />
</div>
```

---

## 4. File Mapping

| Action | Target File Path | Purpose |
| :--- | :--- | :--- |
| **Modify** | `apps/backend/app/schemas/auth.py` | Add `DeleteAccountResponse` schema |
| **Modify** | `apps/backend/app/services/auth_service.py` | Implement `hard_delete_user(conn, uid)` cascade transaction |
| **Modify** | `apps/backend/app/api/v1/auth.py` | Expose `DELETE /auth/me` route with auth dependency |
| **Modify** | `apps/backend/tests/test_api.py` | Add unit/integration tests for account deletion & post-delete 401 verification |
| **Modify** | `apps/frontend/src/shared/lib/api.ts` | Add `authDeleteMe()` API method |
| **Create** | `apps/frontend/src/features/settings/DangerZoneCard.tsx` | Create Neo-Brutalist Danger Zone card with confirmation dialog |
| **Modify** | `apps/frontend/src/app/SettingsPage.tsx` | Render `DangerZoneCard` in settings layout |

---

## 5. Automated Verification Plan

1. **Backend Test Suite:**
   - Execute: `pytest apps/backend/tests/test_api.py`
   - Test Cases:
     1. Create test user with associated records (events, tasks, daily leaves, user settings, day work mode, summaries, refresh tokens).
     2. Call `DELETE /api/auth/me` with valid bearer token -> assert `200 OK`.
     3. Verify database queries across all tables return 0 rows for the deleted `user_id`.
     4. Subsequent requests using the old token to `/api/auth/me` or `/api/status` return `401 Unauthorized`.
     5. Anonymous/unauthenticated `DELETE /api/auth/me` returns `401 Unauthorized`.

2. **Frontend Typecheck & Production Build:**
   - Execute: `cd apps/frontend && npm run build`
   - Assert clean TypeScript compilation with zero errors.

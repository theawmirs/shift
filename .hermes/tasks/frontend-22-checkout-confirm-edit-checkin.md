# Frontend Task — 22-checkout-confirm-edit-checkin

## Scope
Implement checkout confirmation sheet plus editable check-in UI for the Today attendance flow per contract `/root/hermes/projects/shift/.hermes/contracts/contract-22-checkout-confirm-edit-checkin.md`. Reuse existing overtime flow unchanged; no new modal infrastructure.

## Files to Modify / Create
- Modify `apps/frontend/src/shared/lib/api.ts` — Add `editCheckin(at, date?)` via `jpost("/api/in/edit", { at, date })`.
- Modify `apps/frontend/src/shared/api/queries.ts` — Add `useEditCheckinMutation()` invalidating `today`, `week`, `["month"]` (same pattern as `useRecordMutation`); keep existing staleTime values unchanged (do not lower).
- Create `apps/frontend/src/features/today/CheckoutConfirmSheet.tsx` (max 220 lines) — Thin wrapper around shared responsive `Drawer` (BottomSheet below 860px, centered modal at or above 860px). Props: `open, inTime, liveMinutes, standardHours, dateLabel, loading, onConfirm, onCancel`. Persian RTL content: warning plus summary rows (entry time, worked-so-far, shamsi date) with primary confirm and ghost cancel buttons. Escape, backdrop, and drag dismiss as cancel.
- Create `apps/frontend/src/features/today/EditCheckinSheet.tsx` (max 220 lines) — `Drawer` with centered `type="time"` input using the same brutalist styling as the manual override drawer, prefilled with `day.in`, plus confirm button for the chosen HH:MM.
- Modify `apps/frontend/src/features/today/ActionGrid.tsx` — Main exit button opens the confirm sheet instead of calling `onAction("out")` directly; confirm closes the sheet then continues through the existing overtime flow unchanged (liveHours greater than standardHours opens otModal, otherwise `onAction("out")`); manual exit follows the same path (pick time, then confirm sheet showing chosen time, then OT flow or `onAction("out")` with `at`); grid stays disabled while the sheet is open (loadingAction semantics or local state, no double-submit).
- Modify `apps/frontend/src/app/TodayPage.tsx` (or `Hero.tsx` via optional `inTimeEditable + onEditInClick` props if it keeps Hero under limits) — Render ghost button for editing entry time only when `day_status === "working"` (in set, out not set), placed next to the Hero entry pill; wire submit through `useEditCheckinMutation` to success toast for entry-time correction plus today refetch and week/month invalidation; error toast shows the server message; no layout shift; skeletons untouched.

## Components / Hooks
- `editCheckin(at: string, date?: string): Promise<any>`.
- `useEditCheckinMutation()` invalidating `today`, `week`, `["month"]`.
- `CheckoutConfirmSheet` props: `open, inTime, liveMinutes, standardHours, dateLabel, loading, onConfirm, onCancel`; confirm path must flow through the existing overtime branch unchanged.
- `EditCheckinSheet` with prefilled `day.in` time input.

## UX Constraints
- Persian strings only in UI; code, comments, and commits in English.
- Reuse `Drawer`, `Button`, `Toast`, `fmtHoursFa`; YekanBakh FaNum numerals; RTL.
- Confirm sheet shows entry time, worked-so-far, and shamsi date before anything is recorded.

## Acceptance Criteria
- [ ] Tapping exit opens the confirm sheet (no direct record); confirm routes through the existing OT flow; cancel, Escape, backdrop, or drag records nothing.
- [ ] Manual exit also passes through the confirm sheet showing the chosen time.
- [ ] Edit entry button visible only in `working` state; submit updates time, shows success toast, refetches today and invalidates week/month; errors toast the message.
- [ ] No layout shift; skeletons untouched; staleTime values unchanged.
- [ ] `npm run build` green; both new components within the 220-line gate.
- [ ] Branch `feature/22-checkout-confirm-edit-checkin` merges to `develop` only; never touch `main` / `shift-prod`; staging deploy only after human sign-off.

import { Hero } from "../features/today/Hero";
import { ActionGrid } from "../features/today/ActionGrid";
import { DayDoneCard } from "../features/today/DayDoneCard";
import { DailyLeaveCard } from "../features/leave/DailyLeaveCard";
import { WeekSummary } from "../features/week/WeekSummary";
import { HeroSkeleton, CardSkeleton } from "../shared/ui/Skeleton";
import { Button } from "../shared/ui/Button";
import { useTodayQuery } from "../shared/api/queries";
import { useTodayStatus } from "../features/today/hooks/useTodayStatus";
import { StatusBanner } from "../features/today/StatusBanner";

export function TodayPage() {
  const { data: status, error, refetch } = useTodayQuery();
  const {
    day_status,
    day_status_label,
    day_status_reason,
    holidayOptIn,
    setHolidayOptIn,
    loadingAction,
    onAction,
    onRemoteToggle,
  } = useTodayStatus(status, refetch);

  if (error) {
    return (
      <div className="card">
        <p style={{ color: "var(--red)", fontWeight: 800 }}>❌ {String((error as any)?.message || error)}</p>
        <Button variant="ghost" onClick={() => refetch()}>
          تلاش دوباره
        </Button>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <HeroSkeleton />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={3} />
      </div>
    );
  }

  const liveMinutes =
    status.live_net != null ? Math.round(status.live_net * 60) : Math.round((status.day?.net || 0) * 60);
  const shamsi = `${status.day?.day} ${
    ["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"][
      status.day?.month
    ]
  } ${status.day?.year}`;

  const bannerReason = day_status_reason || day_status_label || null;
  const holidayName = status.holiday_name || status.day?.holiday_name || day_status_reason || "تعطیل";
  const showHolidayGate = day_status === "holiday" && !holidayOptIn && !status.day?.in && !status.day?.out;

  return (
    <div className="page-fade" style={{ display: "grid", gap: 12 }}>
      {day_status === "done" ? (
        <DayDoneCard day={status.day} weekday={status.weekday} shamsi={shamsi} />
      ) : showHolidayGate ? (
        <>
          <Hero liveMinutes={liveMinutes} shamsi={shamsi} weekday={status.weekday} inTime={status.day?.in || "—"} status={day_status} />
          <StatusBanner
            day_status={day_status}
            day_status_label={day_status_label}
            day_status_reason={day_status_reason}
            holidayName={holidayName}
            showHolidayGate={showHolidayGate}
            holidayOptIn={holidayOptIn}
            onOptInChange={setHolidayOptIn}
          />
        </>
      ) : (
        <>
          <Hero liveMinutes={liveMinutes} shamsi={shamsi} weekday={status.weekday} inTime={status.day?.in || "—"} status={day_status} />
          <StatusBanner
            day_status={day_status}
            day_status_label={day_status_label}
            day_status_reason={day_status_reason}
            holidayName={holidayName}
            showHolidayGate={showHolidayGate}
            holidayOptIn={holidayOptIn}
            onOptInChange={setHolidayOptIn}
          />
          <ActionGrid
            onAction={onAction}
            onRemoteToggle={onRemoteToggle}
            workMode={status.day?.work_mode}
            day_status={day_status}
            holidayOptIn={holidayOptIn}
            day_status_reason={day_status_reason}
            disabledReason={bannerReason}
            leave_open={!!status.day?.leave_open}
            liveMinutes={liveMinutes}
            standardHours={Number(status.settings?.standard_hours || 8)}
            loadingAction={loadingAction}
          />
        </>
      )}
      <DailyLeaveCard onChanged={() => refetch()} />
      <WeekSummary />
    </div>
  );
}

import { useState } from "react";
import { useToast } from "../shared/ui/Toast";
import { Hero } from "../features/today/Hero";
import { ActionGrid } from "../features/today/ActionGrid";
import { DayDoneCard } from "../features/today/DayDoneCard";
import { DailyLeaveCard } from "../features/leave/DailyLeaveCard";
import { WeekSummary } from "../features/week/WeekSummary";
import { useNavigate } from "react-router-dom";
import { API } from "../shared/lib/api";
import { HeroSkeleton, CardSkeleton } from "../shared/ui/Skeleton";
import { useTodayQuery, useRecordMutation } from "../shared/api/queries";

function computeFallbackDayStatus(day: any) {
  if (!day) return { status: null, label: null, reason: null };
  const isHoliday = !!day.is_holiday;
  const holName = day.holiday_name || null;
  if (isHoliday) {
    const reason = holName
      ? `🏖 امروز تعطیله (${holName}) — ثبت ورود/خروج بسته‌ست`
      : "🏖 امروز تعطیله — ثبت ورود/خروج بسته‌ست";
    return { status: "holiday", label: "تعطیل", reason };
  }
  if (day.out != null) {
    return { status: "done", label: "تمام‌شده", reason: "✅ امروز خروج زدی — روز کاری تمومه، تا فردا" };
  }
  if (!!day.leave_open) {
    return { status: "on_leave", label: "مرخصی", reason: "در مرخصی هستی — «برگشتم» بزن تا ادامه بدی" };
  }
  if (day.in != null) {
    return { status: "working", label: "مشغول", reason: "مشغول به کار — خروج یا مرخصی ثبت کن" };
  }
  return { status: "idle", label: "آماده", reason: "آماده — ورود بزن تا روز کاری شروع شه" };
}

export function TodayPage() {
  const { push } = useToast();
  const navigate = useNavigate();
  const { data: status, error, refetch } = useTodayQuery();
  const recordMutation = useRecordMutation();
  const [holidayOptIn, setHolidayOptIn] = useState(false);

  const onAction = async (k: string, at?: string, otHours?: number) => {
    const map: Record<string, string> = { in: "in", out: "out", leave: "leave_start", back: "leave_end" };
    const et = map[k] || k;
    const allowHoliday = day_status === "holiday" && holidayOptIn;
    try {
      const r = await recordMutation.mutateAsync({ event_type: et, at, allow_holiday: allowHoliday });
      if (k === "out" && otHours && otHours > 0) {
        try {
          await API.ot(otHours);
        } catch {}
      }
      push(
        r.message ||
          (k === "in" ? `✅ ورود ثبت شد${at ? ` (${at})` : ""}` : k === "out" ? `✅ خروج ثبت شد${at ? ` (${at})` : ""}` : k === "leave" ? "🟡 مرخصی شروع شد" : "🔵 برگشتم")
      );
      await refetch();
      if (k === "out") navigate("/reports");
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    }
  };

  const onRemoteToggle = async () => {
    try {
      const j = await API.toggleWorkMode();
      push(j.mode === "remote" ? "🏠 دورکار شد" : "🏢 حضوری شد");
      await refetch();
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    }
  };

  if (error)
    return (
      <div className="card">
        <p style={{ color: "var(--red)", fontWeight: 800 }}>❌ {String((error as any)?.message || error)}</p>
        <button className="btn btn-ghost" onClick={() => refetch()}>
          تلاش دوباره
        </button>
      </div>
    );

  if (!status)
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <HeroSkeleton />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={3} />
      </div>
    );

  const liveMinutes =
    status.live_net != null ? Math.round(status.live_net * 60) : Math.round((status.day?.net || 0) * 60);
  const shamsi = `${status.day?.day} ${
    ["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"][
      status.day?.month
    ]
  } ${status.day?.year}`;
  // spec-02: day_status banner (only holiday/done) — read top-level or nested day, fallback compute client-side
  let day_status = status.day_status ?? status.day?.day_status ?? null;
  let day_status_label = status.day_status_label ?? status.day?.day_status_label ?? null;
  let day_status_reason = status.day_status_reason ?? status.day?.day_status_reason ?? null;
  if (!day_status) {
    const fb = computeFallbackDayStatus(status.day);
    day_status = fb.status;
    if (!day_status_label) day_status_label = fb.label;
    if (!day_status_reason) day_status_reason = fb.reason;
  }
  const bannerReason = day_status_reason || day_status_label || null;
  const holidayName = status.holiday_name || status.day?.holiday_name || day_status_reason || "تعطیل";
  const showHolidayGate = day_status === "holiday" && !holidayOptIn && !status.day?.in && !status.day?.out;
  let banner = null;
  if (day_status === "holiday" && !showHolidayGate) {
    const label =
      day_status_reason ||
      (status.holiday_name
        ? `🏖 امروز تعطیله (${status.holiday_name}) — ثبت ورود/خروج بسته‌ست`
        : day_status_label
        ? `🏖 ${day_status_label} — ثبت ورود/خروج بسته‌ست`
        : "🏖 امروز تعطیله — ثبت ورود/خروج بسته‌ست");
    banner = (
      <div
        className="card"
        style={{
          marginTop: 10,
          borderColor: "var(--amber, #f59e0b)",
          background: "rgba(245,158,11,.12)",
          color: "var(--amber, #92400e)",
        }}
      >
        <b>{label}</b>
        {bannerReason && bannerReason !== label ? (
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{bannerReason}</div>
        ) : null}
      </div>
    );
  } else if (day_status === "done") {
    const label = day_status_reason || "✅ امروز خروج زدی — روز کاری تمومه، تا فردا";
    banner = (
      <div
        className="card"
        style={{
          marginTop: 10,
          borderColor: "var(--green, #22c55e)",
          background: "rgba(34,197,94,.10)",
          color: "var(--green, #166534)",
        }}
      >
        <b>{label}</b>
        {bannerReason && bannerReason !== label ? (
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{bannerReason}</div>
        ) : null}
      </div>
    );
  } else if (day_status === "on_leave") {
    const label = day_status_reason || "🟦 امروز مرخصی روزانه";
    banner = (
      <div
        className="card"
        style={{
          marginTop: 10,
          borderColor: "#60a5fa",
          background: "rgba(96,165,250,.12)",
          color: "#1e40af",
        }}
      >
        <b>{label}</b>
        {bannerReason && bannerReason !== label ? (
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{bannerReason}</div>
        ) : null}
      </div>
    );
  }
  return (
    <div className="page-fade">
      {day_status === "done" ? (
        <DayDoneCard day={status.day} weekday={status.weekday} shamsi={shamsi} />
      ) : showHolidayGate ? (
        <>
          <Hero liveMinutes={liveMinutes} shamsi={shamsi} weekday={status.weekday} inTime={status.day?.in || "—"} />
          <div style={{ height: 12 }} />
          <div className="card" style={{ display: "grid", gap: 12, textAlign: "center", padding: "18px 14px", borderColor: "var(--amber)" }}>
            <div style={{ fontSize: 28 }}>🏖️</div>
            <div>
              <b style={{ fontSize: 15 }}>امروز {holidayName} — تعطیله</b>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                می‌خوای امروز هم مشغول به کار باشی؟ اگر «بله» بزنی، دکمه‌های ورود/خروج برات فعال می‌شه — در غیر این‌صورت روز تعطیل می‌مونه.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setHolidayOptIn(true)}>
                بله، امروز کار می‌کنم
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setHolidayOptIn(false)}>
                نه، تعطیلم
              </button>
            </div>
            <small style={{ color: "var(--muted)", fontSize: 11 }}>تا وقتی ورود نزنی، هیچ محدودیتی ایجاد نمی‌شه — هر lúc می‌تونی با «بله» برگردی.</small>
          </div>
        </>
      ) : (
        <>
          <Hero liveMinutes={liveMinutes} shamsi={shamsi} weekday={status.weekday} inTime={status.day?.in || "—"} />
          {banner}
          {day_status === "holiday" && holidayOptIn && (
            <div className="card" style={{ marginTop: 10, background: "rgba(16,185,129,.08)", borderColor: "#10b981", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <small style={{ fontWeight: 800, color: "#047857" }}>✅ حالت کار در تعطیلی فعال — ورودت به‌صورت اضافه‌کاری محاسبه می‌شه.</small>
              <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 10px", fontSize: 11 }} onClick={() => setHolidayOptIn(false)}>برگشت</button>
            </div>
          )}
          <div style={{ height: 12 }} />
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
          />
        </>
      )}
      <div style={{ height: 12 }} />
      <DailyLeaveCard onChanged={() => refetch()} />
      <div style={{ height: 12 }} />
      <WeekSummary />
    </div>
  );
}

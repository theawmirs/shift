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
import { AlertCircle, CheckCircle, Info, Sparkles } from "lucide-react";

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
        ? `امروز تعطیل رسمی است (${status.holiday_name})`
        : day_status_label
        ? `${day_status_label}`
        : "امروز تعطیل است");
    banner = (
      <div
        className="card"
        style={{
          borderColor: "var(--amber, #f59e0b)",
          background: "rgba(245,158,11,.10)",
          color: "var(--amber, #92400e)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
        }}
      >
        <AlertCircle size={20} style={{ flexShrink: 0, color: "var(--amber)" }} />
        <div>
          <b style={{ fontSize: 13 }}>{label}</b>
          {bannerReason && bannerReason !== label ? (
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{bannerReason}</div>
          ) : null}
        </div>
      </div>
    );
  } else if (day_status === "done") {
    const label = day_status_reason || "امروز قبلاً خروج ثبت شده است";
    banner = (
      <div
        className="card"
        style={{
          borderColor: "var(--green, #22c55e)",
          background: "rgba(34,197,94,.10)",
          color: "var(--green, #166534)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
        }}
      >
        <CheckCircle size={20} style={{ flexShrink: 0, color: "var(--green)" }} />
        <div>
          <b style={{ fontSize: 13 }}>{label}</b>
          {bannerReason && bannerReason !== label ? (
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{bannerReason}</div>
          ) : null}
        </div>
      </div>
    );
  } else if (day_status === "on_leave") {
    const label = day_status_reason || "شما در مرخصی ساعتی هستید";
    banner = (
      <div
        className="card"
        style={{
          borderColor: "#60a5fa",
          background: "rgba(96,165,250,.10)",
          color: "#1e40af",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
        }}
      >
        <Info size={20} style={{ flexShrink: 0, color: "#2563eb" }} />
        <div>
          <b style={{ fontSize: 13 }}>{label}</b>
          {bannerReason && bannerReason !== label ? (
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{bannerReason}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade" style={{ display: "grid", gap: 12 }}>
      {day_status === "done" ? (
        <DayDoneCard day={status.day} weekday={status.weekday} shamsi={shamsi} />
      ) : showHolidayGate ? (
        <>
          <Hero liveMinutes={liveMinutes} shamsi={shamsi} weekday={status.weekday} inTime={status.day?.in || "—"} status={day_status} />
          
          {/* Holiday Decision Gate */}
          <div
            className="card"
            style={{
              display: "grid",
              gap: 14,
              textAlign: "center",
              padding: "20px 16px",
              borderColor: "var(--amber)",
              background: "linear-gradient(180deg, var(--card) 0%, var(--card2) 100%)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                border: "2px solid #000",
                background: "linear-gradient(135deg, var(--amber), var(--amber-2))",
                display: "grid",
                placeItems: "center",
                margin: "0 auto",
                boxShadow: "3px 3px 0 #000",
                fontSize: 24,
              }}
            >
              🏖️
            </div>

            <div>
              <b style={{ fontSize: 16, color: "var(--text)" }}>امروز {holidayName} — تعطیل رسمی</b>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
                آیا مایلید امروز هم مشغول به کار باشید؟ با انتخاب «بله»، دکمه‌های ثبت تردد فعال شده و کارکرد به عنوان اضافه‌کاری منظور می‌گردد.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
              <button
                className="btn btn-primary"
                style={{ padding: "10px", fontWeight: 800, fontSize: 12 }}
                onClick={() => setHolidayOptIn(true)}
              >
                بله، کار می‌کنم
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: "10px", fontSize: 12 }}
                onClick={() => setHolidayOptIn(false)}
              >
                نه، روز تعطیله
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <Hero liveMinutes={liveMinutes} shamsi={shamsi} weekday={status.weekday} inTime={status.day?.in || "—"} status={day_status} />
          {banner}

          {day_status === "holiday" && holidayOptIn && (
            <div
              className="card"
              style={{
                background: "rgba(16,185,129,.08)",
                borderColor: "#10b981",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} style={{ color: "#10b981", flexShrink: 0 }} />
                <small style={{ fontWeight: 800, color: "#047857", fontSize: 12 }}>
                  حالت کار در تعطیلی فعال شد — کارکرد شما محاسبه می‌شود.
                </small>
              </div>
              <button
                className="btn btn-ghost mono"
                style={{ width: "auto", padding: "4px 10px", fontSize: 11, borderRadius: 8, boxShadow: "1.5px 1.5px 0 #000" }}
                onClick={() => setHolidayOptIn(false)}
              >
                انصراف
              </button>
            </div>
          )}

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

      {/* Daily Leaves Module */}
      <DailyLeaveCard onChanged={() => refetch()} />

      {/* Weekly Summary Module */}
      <WeekSummary />
    </div>
  );
}

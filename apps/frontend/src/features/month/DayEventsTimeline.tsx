import { fmtHoursFa } from "@/shared/lib/format";
import { Edit3 } from "lucide-react";

interface DayEventsTimelineProps {
  currentDay: any;
  onEditClick: () => void;
}

export function DayEventsTimeline({ currentDay, onEditClick }: DayEventsTimelineProps) {
  const fmtH = (val: any) => {
    if (val == null || Number(val) === 0) return null;
    return fmtHoursFa(val);
  };

  const hasIn = Boolean(currentDay?.in);
  const hasOut = Boolean(currentDay?.out);
  const hasLeaveIntervals = Array.isArray(currentDay?.leave_intervals) && currentDay.leave_intervals.length > 0;
  const hasGross = currentDay?.gross != null && Number(currentDay.gross) > 0;
  const hasNet = currentDay?.net != null && Number(currentDay.net) > 0;
  const hasOvertime = currentDay?.overtime != null && Number(currentDay.overtime) > 0;
  const hasDeficit = currentDay?.deficit != null && Number(currentDay.deficit) > 0;
  const hasLate = currentDay?.late != null && Number(currentDay.late) > 0;
  const hasWork = hasIn || hasOut || hasNet || hasGross || Boolean(currentDay?.has_events);
  const standardHours = 8;

  return (
    <>
      {/* Status and Action Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="badge badge-muted mono" style={{ fontSize: 12 }}>
            {currentDay.day_status_label || (currentDay.is_holiday ? "تعطیل (کاری)" : "کاری")}
          </span>
          {currentDay.work_mode === "remote" && (
            <span className="badge" style={{ background: "#DDD6FE", color: "#4C1D95", borderColor: "#000" }}>
              🏠 دورکار
            </span>
          )}
          {currentDay.is_holiday && hasWork && (
            <span className="badge badge-warn">
              ⚡ کار در تعطیلی
            </span>
          )}
        </div>

        {/* Edit Button with Auto Width */}
        <button
          className="btn btn-ghost mono"
          style={{
            width: "auto",
            padding: "5px 10px",
            fontSize: 11,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            borderRadius: 10,
            boxShadow: "2px 2px 0 #000",
          }}
          onClick={onEditClick}
        >
          <Edit3 size={12} />
          <span>{hasWork ? "ویرایش" : "ثبت کارکرد"}</span>
        </button>
      </div>

      {/* Holiday Banner if holiday */}
      {currentDay.is_holiday && (
        <div className="row" style={{ borderColor: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
          <b>مناسبت تعطیلی</b>
          <span className="mono" style={{ fontWeight: 800, color: "#dc2626" }}>
            {currentDay.holiday_name || "تعطیلی رسمی / جمعه"}
          </span>
        </div>
      )}

      {/* No work recorded message */}
      {!hasWork && !currentDay.daily_leave && (
        <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "14px 0" }}>
          {currentDay.is_holiday ? "در این روز تعطیل کارکردی ثبت نشده است." : "ثبت کاری برای این روز وجود ندارد."}
        </div>
      )}

      {/* Check-in (ورود) */}
      {hasIn && (
        <div className="row">
          <b>ورود</b>
          <span className="mono" style={{ fontWeight: 800 }}>
            {currentDay.in}
          </span>
        </div>
      )}

      {/* Check-out (خروج) */}
      {hasOut && (
        <div className="row">
          <b>خروج</b>
          <span className="mono" style={{ fontWeight: 800 }}>
            {currentDay.out}
          </span>
        </div>
      )}

      {/* Hourly Leave Start/Return (مرخصی ساعتی) */}
      {hasLeaveIntervals && (
        <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>مرخصی ساعتی</b>
            <span className="mono">{fmtH(currentDay.leave) || "—"}</span>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {currentDay.leave_intervals.map((inv: [string, string], idx: number) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
                <span>بازه {idx + 1}:</span>
                <span className="mono">{inv[0]} تا {inv[1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total Duration (کارکرد کل / ناخالص) */}
      {hasGross && (
        <div className="row">
          <b>کارکرد کل (ناخالص)</b>
          <span className="mono">{fmtH(currentDay.gross)}</span>
        </div>
      )}

      {/* Net Duration (کارکرد خالص) */}
      {hasNet && (
        <div className="row">
          <b>کارکرد خالص</b>
          <span className="mono" style={{ fontWeight: 800 }}>
            {fmtH(currentDay.net)}
          </span>
        </div>
      )}

      {/* Regular Hours (ساعت موظفی) */}
      {!currentDay.is_holiday && hasWork && (
        <div className="row">
          <b>ساعت موظفی</b>
          <span className="mono">{standardHours} ساعت</span>
        </div>
      )}

      {/* Overtime Hours (اضافه‌کاری) */}
      {hasOvertime && (
        <div className="row" style={{ borderColor: "var(--green)", background: "rgba(16,185,129,0.06)" }}>
          <b>اضافه‌کاری</b>
          <span className="mono" style={{ fontWeight: 800, color: "var(--green)" }}>
            {fmtH(currentDay.overtime)}
          </span>
        </div>
      )}

      {/* Deficit Hours (کسری کار) */}
      {hasDeficit && (
        <div className="row" style={{ borderColor: "var(--red)", background: "rgba(239,68,68,0.06)" }}>
          <b>کسری کار</b>
          <span className="mono" style={{ fontWeight: 800, color: "var(--red)" }}>
            {fmtH(currentDay.deficit)}
          </span>
        </div>
      )}

      {/* Late (تأخیر) */}
      {hasLate && (
        <div className="row" style={{ borderColor: "var(--red)" }}>
          <b>تأخیر</b>
          <span className="mono" style={{ fontWeight: 800, color: "var(--red)" }}>
            {fmtH(currentDay.late)}
          </span>
        </div>
      )}

      {/* Daily Leave details if any */}
      {currentDay.daily_leave && (
        <div className="row" style={{ background: "rgba(96,165,250,.08)", borderColor: "#60a5fa" }}>
          <b>مرخصی روزانه</b>
          <span className="mono" style={{ fontSize: 12 }}>
            {currentDay.daily_leave.label || currentDay.daily_leave.type} ({currentDay.daily_leave.hours || 8} ساعت)
            {currentDay.daily_leave.reason ? ` · ${currentDay.daily_leave.reason}` : ""}
          </span>
        </div>
      )}
    </>
  );
}

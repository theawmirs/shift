import { Drawer } from "../../shared/ui/Drawer";
import { fmtHoursFa } from "../../shared/lib/format";

export interface DayDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  day: any | null;
}

export function DayDetailDrawer({ open, onClose, day }: DayDetailDrawerProps) {
  if (!day) return null;

  const title = day.label || (day.date ? `جزئیات روز ${day.date}` : "جزئیات روز");

  // Format helpers
  const fmtH = (val: any) => {
    if (val == null || Number(val) === 0) return null;
    return fmtHoursFa(val);
  };

  const hasIn = Boolean(day.in);
  const hasOut = Boolean(day.out);
  const hasLeaveIntervals = Array.isArray(day.leave_intervals) && day.leave_intervals.length > 0;
  const hasGross = day.gross != null && Number(day.gross) > 0;
  const hasNet = day.net != null && Number(day.net) > 0;
  const hasOvertime = day.overtime != null && Number(day.overtime) > 0;
  const hasDeficit = day.deficit != null && Number(day.deficit) > 0;
  const hasLate = day.late != null && Number(day.late) > 0;
  const hasWork = hasIn || hasOut || hasNet || hasGross || Boolean(day.has_events);
  const standardHours = 8; // standard workday regular hours

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      <div style={{ display: "grid", gap: 10 }}>
        {/* Holiday Banner if holiday */}
        {day.is_holiday && (
          <div className="row" style={{ borderColor: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
            <b>مناسبت تعطیلی</b>
            <span className="mono" style={{ fontWeight: 800, color: "#dc2626" }}>
              {day.holiday_name || "تعطیلی رسمی / جمعه"}
            </span>
          </div>
        )}

        {/* Status and Work Mode Header */}
        {(hasWork || day.daily_leave) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span className="badge badge-muted mono" style={{ fontSize: 12 }}>
              {day.day_status_label || (day.is_holiday ? "تعطیل (کاری)" : "کاری")}
            </span>
            {day.work_mode === "remote" && (
              <span className="badge" style={{ background: "#DDD6FE", color: "#4C1D95", borderColor: "#000" }}>
                🏠 دورکار
              </span>
            )}
            {day.is_holiday && hasWork && (
              <span className="badge badge-warn">
                ⚡ کار در تعطیلی
              </span>
            )}
          </div>
        )}

        {/* No work recorded message */}
        {!hasWork && !day.daily_leave && (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "10px 0" }}>
            {day.is_holiday ? "در این روز تعطیل کارکردی ثبت نشده است." : "ثبت کاری برای این روز وجود ندارد."}
          </div>
        )}

        {/* Check-in (ورود) */}
        {hasIn && (
          <div className="row">
            <b>ورود</b>
            <span className="mono" style={{ fontWeight: 800 }}>
              {day.in}
            </span>
          </div>
        )}

        {/* Check-out (خروج) */}
        {hasOut && (
          <div className="row">
            <b>خروج</b>
            <span className="mono" style={{ fontWeight: 800 }}>
              {day.out}
            </span>
          </div>
        )}

        {/* Hourly Leave Start/Return (مرخصی ساعتی) */}
        {hasLeaveIntervals && (
          <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <b>مرخصی ساعتی</b>
              <span className="mono">{fmtH(day.leave) || "—"}</span>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              {day.leave_intervals.map((inv: [string, string], idx: number) => (
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
            <span className="mono">{fmtH(day.gross)}</span>
          </div>
        )}

        {/* Net Duration (کارکرد خالص) */}
        {hasNet && (
          <div className="row">
            <b>کارکرد خالص</b>
            <span className="mono" style={{ fontWeight: 800 }}>
              {fmtH(day.net)}
            </span>
          </div>
        )}

        {/* Regular Hours (ساعت موظفی) */}
        {!day.is_holiday && hasWork && (
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
              {fmtH(day.overtime)}
            </span>
          </div>
        )}

        {/* Deficit Hours (کسری کار) */}
        {hasDeficit && (
          <div className="row" style={{ borderColor: "var(--red)", background: "rgba(239,68,68,0.06)" }}>
            <b>کسری کار</b>
            <span className="mono" style={{ fontWeight: 800, color: "var(--red)" }}>
              {fmtH(day.deficit)}
            </span>
          </div>
        )}

        {/* Late (تأخیر) */}
        {hasLate && (
          <div className="row" style={{ borderColor: "var(--red)" }}>
            <b>تأخیر</b>
            <span className="mono" style={{ fontWeight: 800, color: "var(--red)" }}>
              {fmtH(day.late)}
            </span>
          </div>
        )}

        {/* Daily Leave details if any */}
        {day.daily_leave && (
          <div className="row" style={{ background: "rgba(96,165,250,.08)", borderColor: "#60a5fa" }}>
            <b>مرخصی روزانه</b>
            <span className="mono" style={{ fontSize: 12 }}>
              {day.daily_leave.label || day.daily_leave.type} ({day.daily_leave.hours || 8} ساعت)
              {day.daily_leave.reason ? ` · ${day.daily_leave.reason}` : ""}
            </span>
          </div>
        )}
      </div>
    </Drawer>
  );
}

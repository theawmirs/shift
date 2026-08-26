import { Drawer } from "../../shared/ui/Drawer";

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
    return `${Number(val).toFixed(2)} ساعت`;
  };

  const hasIn = Boolean(day.in);
  const hasOut = Boolean(day.out);
  const hasLeaveIntervals = Array.isArray(day.leave_intervals) && day.leave_intervals.length > 0;
  const hasGross = day.gross != null && Number(day.gross) > 0;
  const hasNet = day.net != null && Number(day.net) > 0;
  const hasOvertime = day.overtime != null && Number(day.overtime) > 0;
  const hasLate = day.late != null && Number(day.late) > 0;
  const standardHours = 8; // standard workday regular hours

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      <div style={{ display: "grid", gap: 10 }}>
        {/* Status and Work Mode Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span className="badge badge-muted mono" style={{ fontSize: 12 }}>
            {day.day_status_label || (day.is_holiday ? "تعطیل" : "کاری")}
          </span>
          {day.work_mode === "remote" && (
            <span className="badge" style={{ background: "#DDD6FE", color: "#4C1D95", borderColor: "#000" }}>
              🏠 دورکار
            </span>
          )}
          {day.is_holiday && day.holiday_name && (
            <span className="badge badge-warn">
              {day.holiday_name}
            </span>
          )}
        </div>

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
        {!day.is_holiday && (
          <div className="row">
            <b>ساعت موظفی</b>
            <span className="mono">{standardHours} ساعت</span>
          </div>
        )}

        {/* Overtime Hours (اضافه‌کاری) */}
        {hasOvertime && (
          <div className="row" style={{ borderColor: "var(--green)" }}>
            <b>اضافه‌کاری</b>
            <span className="mono" style={{ fontWeight: 800, color: "var(--green)" }}>
              {fmtH(day.overtime)}
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
            </span>
          </div>
        )}
      </div>
    </Drawer>
  );
}

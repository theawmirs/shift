import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmtHoursCompactFa } from "@/shared/lib/format";

interface CalendarHeaderProps {
  jy: number;
  jm: number;
  monthNames: string[];
  onNav: (delta: number) => void;
  monthNetHours: number;
  monthWorkDays: number;
  monthRemoteDays: number;
}

export function CalendarHeader({
  jy,
  jm,
  monthNames,
  onNav,
  monthNetHours,
  monthWorkDays,
  monthRemoteDays,
}: CalendarHeaderProps) {
  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      {/* Navigation Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 34, height: 34 }}
          onClick={() => onNav(1)}
          aria-label="ماه بعد"
        >
          <ChevronRight size={16} />
        </button>

        <div style={{ textAlign: "center" }}>
          <span className="kicker" style={{ fontSize: 10 }}>JALALI CALENDAR</span>
          <h2 className="display" style={{ margin: "2px 0 0", fontSize: 20 }}>
            {monthNames[jm - 1]} {jy}
          </h2>
        </div>

        <button
          type="button"
          className="icon-btn"
          style={{ width: 34, height: 34 }}
          onClick={() => onNav(-1)}
          aria-label="ماه قبل"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Quick Month Metrics (No-wrap single line format + explicit semantic borders) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <div
          className="row"
          style={{
            padding: "8px 6px",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            background: "rgba(245, 158, 11, 0.08)",
            borderColor: "var(--amber)",
            borderWidth: 2,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>کارکرد کل</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <b className="mono" style={{ fontSize: 13, color: "var(--amber-2)" }}>
              {fmtHoursCompactFa(monthNetHours)}
            </b>
          </div>
        </div>

        <div
          className="row"
          style={{
            padding: "8px 6px",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            background: "var(--surface-2)",
            borderColor: "var(--border-strong)",
            borderWidth: 2,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>روزهای کاری</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2, whiteSpace: "nowrap" }}>
            <b className="mono" style={{ fontSize: 14 }}>
              {monthWorkDays}
            </b>
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>روز</span>
          </div>
        </div>

        <div
          className="row"
          style={{
            padding: "8px 6px",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            background: "var(--surface-2)",
            borderColor: "var(--border-strong)",
            borderWidth: 2,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>دورکاری</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2, whiteSpace: "nowrap" }}>
            <b className="mono" style={{ fontSize: 14, color: "#818CF8" }}>
              {monthRemoteDays}
            </b>
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>روز</span>
          </div>
        </div>
      </div>
    </div>
  );
}

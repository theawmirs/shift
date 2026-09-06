import { Clock, TrendingUp, TrendingDown, Calendar, Coffee } from "lucide-react";
import { fmtHoursCompactFa } from "@/shared/lib/format";

interface MonthSummaryCardsProps {
  netHours: number;
  overtimeHours: number;
  deficitHours: number;
  workDays: number;
  holidayDays: number;
  leaveRemaining: number;
  leaveQuota: number;
  leaveUsedPct: number;
  year?: number | string;
}

export function MonthSummaryCards({
  netHours,
  overtimeHours,
  deficitHours,
  workDays,
  holidayDays,
  leaveRemaining,
  leaveQuota,
  leaveUsedPct,
  year,
}: MonthSummaryCardsProps) {
  return (
    <>
      {/* ── Bento KPI Metric Grid (2x2) with Dynamic Semantic Tokens ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {/* KPI 1: Net Work */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: "rgba(245, 158, 11, 0.08)",
            borderColor: "var(--amber)",
            borderWidth: 2,
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--amber-2)", fontSize: 11, fontWeight: 800 }}>
            <Clock size={13} />
            <span>خالص کارکرد</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <b className="mono" style={{ fontSize: 16, color: "var(--text)" }}>
              {fmtHoursCompactFa(netHours)}
            </b>
          </div>
        </div>

        {/* KPI 2: Overtime */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: overtimeHours > 0 ? "rgba(34, 197, 94, 0.08)" : "var(--surface-2)",
            borderColor: overtimeHours > 0 ? "var(--green)" : "var(--border-strong)",
            borderWidth: 2,
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: overtimeHours > 0 ? "var(--green)" : "var(--muted)", fontSize: 11, fontWeight: 800 }}>
            <TrendingUp size={13} />
            <span>اضافه‌کاری</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <b className="mono" style={{ fontSize: 16, color: overtimeHours > 0 ? "var(--green)" : "var(--muted)" }}>
              {overtimeHours > 0 ? fmtHoursCompactFa(overtimeHours) : "۰ دقیقه"}
            </b>
          </div>
        </div>

        {/* KPI 3: Deficit */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: deficitHours > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)",
            borderColor: deficitHours > 0 ? "var(--red)" : "var(--green)",
            borderWidth: 2,
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: deficitHours > 0 ? "var(--red)" : "var(--green)", fontSize: 11, fontWeight: 800 }}>
            <TrendingDown size={13} />
            <span>کسری موظفی</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <b className="mono" style={{ fontSize: 16, color: deficitHours > 0 ? "var(--red)" : "var(--green)" }}>
              {deficitHours > 0 ? `${fmtHoursCompactFa(deficitHours)} -` : "بدون کسری 🎉"}
            </b>
          </div>
        </div>

        {/* KPI 4: Workdays count */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: "var(--surface-2)",
            borderColor: "var(--border-strong)",
            borderWidth: 2,
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>
            <Calendar size={13} />
            <span>روزهای حضور</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
            <b className="mono" style={{ fontSize: 18, color: "var(--text)" }}>
              {workDays}
            </b>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>از {workDays + holidayDays} روز</span>
          </div>
        </div>
      </div>

      {/* ── Annual Leave Balance Progress Track ── */}
      <div
        style={{
          background: "var(--surface-2)",
          border: "2px solid var(--border-strong)",
          borderRadius: 14,
          padding: "10px 12px",
          display: "grid",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
            <Coffee size={14} style={{ color: "var(--amber)" }} />
            <span>مانده مرخصی سال {year}:</span>
          </span>
          <b className="mono" style={{ fontSize: 12 }}>
            {leaveRemaining} از {leaveQuota} ساعت
          </b>
        </div>

        <div className="progress" style={{ height: 8 }}>
          <i
            style={{
              width: `${100 - leaveUsedPct}%`,
              background: "linear-gradient(90deg, var(--amber), #60A5FA)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </>
  );
}

import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  Calendar,
  Clock,
  TrendingDown,
  TrendingUp,
  Coffee,
  PieChart,
} from "lucide-react";
import { CardSkeleton } from "../../shared/ui/Skeleton";
import { useMonthReport } from "./useMonthReport";
import { DayDetailDrawer } from "./DayDetailDrawer";
import { fmtHoursFa, formatShamsiDateText } from "../../shared/lib/format";

function fmtFa(v: any) {
  return fmtHoursFa(v);
}

export function MonthReport({ onExcel }: { onExcel?: (msg: string, variant?: "success" | "error") => void }) {
  const [selectedDay, setSelectedDay] = useState<any | null>(null);
  const {
    months,
    selMonth,
    setSelMonth,
    report: m,
    err,
    loading,
    leaves,
    cancelLeave,
    downloadExcel,
  } = useMonthReport({ onExcel });

  if (loading && !months.length && !err) {
    return <CardSkeleton rows={5} />;
  }

  if (err) {
    return (
      <div className="card">
        <p style={{ color: "var(--red)", fontWeight: 800 }}>❌ {err}</p>
      </div>
    );
  }

  if (!loading && months.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "24px 14px" }}>
        <p style={{ color: "var(--muted)", margin: 0, fontWeight: 700 }}>
          هنوز اطلاعاتی برای ماه‌های کاری ثبت نشده است.
        </p>
      </div>
    );
  }

  if (loading || !m) {
    return <CardSkeleton rows={5} />;
  }

  const currentMonthIdx = months.findIndex((mo: any) => mo.key === selMonth);
  const handlePrevMonth = () => {
    if (currentMonthIdx < months.length - 1) {
      setSelMonth(months[currentMonthIdx + 1].key);
    }
  };
  const handleNextMonth = () => {
    if (currentMonthIdx > 0) {
      setSelMonth(months[currentMonthIdx - 1].key);
    }
  };

  const netHours = m.totals?.net || 0;
  const overtimeHours = m.totals?.overtime || 0;
  const deficitHours = m.totals?.deficit || 0;
  const remoteDays = m.totals?.remote_days || 0;
  const workDays = m.totals?.work_days || 0;
  const holidayDays = m.totals?.holiday_days || 0;

  const leaveRemaining = m.leave_balance?.remaining ?? 0;
  const leaveQuota = m.leave_balance?.quota ?? 208;
  const leaveUsedPct = Math.min(100, Math.round(((leaveQuota - leaveRemaining) / leaveQuota) * 100));

  return (
    <div className="card" style={{ display: "grid", gap: 14 }}>
      {/* ── Month Selector Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          background: "rgba(0,0,0,0.15)",
          padding: "6px 8px",
          borderRadius: 14,
          border: "1.5px solid var(--border-strong)",
        }}
      >
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={currentMonthIdx <= 0}
          className="icon-btn"
          style={{
            width: 32,
            height: 32,
            opacity: currentMonthIdx <= 0 ? 0.35 : 1,
            cursor: currentMonthIdx <= 0 ? "default" : "pointer",
          }}
          title="ماه بعد"
        >
          <ChevronRight size={16} />
        </button>

        <div style={{ position: "relative", flex: 1, maxWidth: 220 }}>
          <select
            value={selMonth}
            onChange={(e) => setSelMonth(e.target.value)}
            className="mono"
            style={{
              width: "100%",
              padding: "8px 28px 8px 12px",
              borderRadius: 10,
              border: "2px solid #000",
              background: "#fff",
              color: "#0F172A",
              fontWeight: 800,
              fontSize: 13,
              fontFamily: "YekanBakh, sans-serif",
              boxShadow: "2px 2px 0 #000",
              appearance: "none",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            {months.map((mo: any) => (
              <option key={mo.key} value={mo.key}>
                {mo.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#0F172A",
            }}
          />
        </div>

        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={currentMonthIdx >= months.length - 1}
          className="icon-btn"
          style={{
            width: 32,
            height: 32,
            opacity: currentMonthIdx >= months.length - 1 ? 0.35 : 1,
            cursor: currentMonthIdx >= months.length - 1 ? "default" : "pointer",
          }}
          title="ماه قبل"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* ── Title & Remote Badge ── */}
      <div className="section-head" style={{ margin: 0 }}>
        <div>
          <div className="kicker">MONTHLY PERFORMANCE</div>
          <h2 className="display" style={{ fontSize: 18, marginTop: 2 }}>
            گزارش {m.month_name} {m.year}
          </h2>
        </div>
        {remoteDays > 0 && (
          <span className="badge" style={{ background: "#DDD6FE", color: "#4C1D95", border: "1.5px solid #000", fontSize: 10 }}>
            🏠 {remoteDays} روز دورکار
          </span>
        )}
      </div>

      {/* ── Bento KPI Metric Grid (2x2) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {/* KPI 1: Net Work */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: "rgba(245, 158, 11, 0.08)",
            borderColor: "var(--amber)",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--amber-2)", fontSize: 11, fontWeight: 800 }}>
            <Clock size={13} />
            <span>خالص کارکرد</span>
          </div>
          <b className="mono" style={{ fontSize: 16, color: "var(--text)" }}>
            {fmtFa(netHours)}
          </b>
        </div>

        {/* KPI 2: Overtime */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: overtimeHours > 0 ? "rgba(34, 197, 94, 0.08)" : "rgba(255,255,255,0.04)",
            borderColor: overtimeHours > 0 ? "var(--green)" : "rgba(255,255,255,0.08)",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: overtimeHours > 0 ? "var(--green)" : "var(--muted)", fontSize: 11, fontWeight: 800 }}>
            <TrendingUp size={13} />
            <span>اضافه‌کاری</span>
          </div>
          <b className="mono" style={{ fontSize: 16, color: overtimeHours > 0 ? "var(--green)" : "var(--muted)" }}>
            {overtimeHours > 0 ? fmtFa(overtimeHours) : "۰ ساعت"}
          </b>
        </div>

        {/* KPI 3: Deficit */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: deficitHours > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)",
            borderColor: deficitHours > 0 ? "var(--red)" : "var(--green)",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: deficitHours > 0 ? "var(--red)" : "var(--green)", fontSize: 11, fontWeight: 800 }}>
            <TrendingDown size={13} />
            <span>کسری موظفی</span>
          </div>
          <b className="mono" style={{ fontSize: 16, color: deficitHours > 0 ? "var(--red)" : "var(--green)" }}>
            {deficitHours > 0 ? fmtFa(deficitHours) : "بدون کسری 🎉"}
          </b>
        </div>

        {/* KPI 4: Workdays count */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.08)",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>
            <Calendar size={13} />
            <span>روزهای حضور</span>
          </div>
          <b className="mono" style={{ fontSize: 16, color: "var(--text)" }}>
            {workDays} <small style={{ fontSize: 11, color: "var(--muted)" }}>از {workDays + holidayDays} روز</small>
          </b>
        </div>
      </div>

      {/* ── Annual Leave Balance Progress Track ── */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "2px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "10px 12px",
          display: "grid",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
            <Coffee size={14} style={{ color: "var(--amber)" }} />
            <span>مانده مرخصی سال {m.year}:</span>
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

      {/* ── Daily Leaves in this month ── */}
      {leaves.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>مرخصی‌های روزانه این ماه:</span>
          {leaves.map((it: any) => (
            <div
              key={it.id}
              className="row"
              style={{
                padding: "8px 10px",
                fontSize: 12,
                background: "rgba(96,165,250,.08)",
                borderColor: "#60a5fa",
              }}
            >
              <span className="mono" style={{ fontSize: 12 }}>
                {it.start_date} {it.end_date !== it.start_date ? `تا ${it.end_date}` : ""} · {it.label} ({it.hours} ساعت)
                {it.reason ? ` · ${it.reason}` : ""}
              </span>
              <button
                className="btn btn-ghost mono"
                style={{ fontSize: 11, padding: "4px 8px", width: "auto", color: "var(--red)", borderColor: "var(--red)" }}
                onClick={() => cancelLeave(it.id)}
              >
                <Trash2 size={12} /> لغو
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Daily Breakdown List (Interactive Cards) ── */}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <PieChart size={13} />
          <span>ریز کارکرد روزهای ماه:</span>
        </div>

        <div style={{ display: "grid", gap: 6, maxHeight: 300, overflowY: "auto", paddingRight: 2 }}>
          {m.rows
            ?.filter((r: any) => r.has_events || r.is_holiday)
            .map((r: any) => {
              const isRemote = r.work_mode === "remote";
              return (
                <div
                  key={r.date}
                  className="row"
                  onClick={() =>
                    setSelectedDay({
                      ...r,
                      label: `${r.weekday || ""}، ${formatShamsiDateText(r.date)}`,
                    })
                  }
                  style={{
                    padding: "8px 10px",
                    cursor: "pointer",
                    background: isRemote ? "rgba(124,58,237,.06)" : "rgba(255,255,255,.04)",
                    borderColor: isRemote ? "var(--violet)" : undefined,
                    borderStyle: isRemote ? "dashed" : "solid",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <small className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                      {r.date.slice(5)} · {r.weekday}
                    </small>
                    {r.is_holiday && (
                      <span className="badge badge-warn" style={{ fontSize: 9, padding: "2px 6px" }}>
                        {r.holiday_name || "تعطیل"}
                      </span>
                    )}
                    {isRemote && (
                      <span className="badge" style={{ background: "#DDD6FE", color: "#4C1D95", fontSize: 9, padding: "2px 6px" }}>
                        دورکار
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono" style={{ fontSize: 12, color: r.net > 0 ? "var(--text)" : "var(--muted)" }}>
                      {r.in || "—"} تا {r.out || "—"} {r.net > 0 ? `(${fmtFa(r.net)})` : ""}
                    </span>
                    <ChevronLeft size={13} style={{ color: "var(--muted)" }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Export Excel Action ── */}
      <button
        className="btn btn-primary"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "10px",
          fontSize: 13,
          fontWeight: 800,
        }}
        onClick={downloadExcel}
      >
        <Download size={15} /> دریافت فایل خروجی اکسل ({m.month_name})
      </button>

      {/* ── Day Detail Drawer ── */}
      <DayDetailDrawer open={Boolean(selectedDay)} onClose={() => setSelectedDay(null)} day={selectedDay} />
    </div>
  );
}

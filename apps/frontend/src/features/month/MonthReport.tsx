import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  PieChart,
} from "lucide-react";
import { CardSkeleton } from "@/shared/ui/Skeleton";
import { Button } from "@/shared/ui/Button";
import { useMonthReport } from "./useMonthReport";
import { DayDetailDrawer } from "./DayDetailDrawer";
import { MonthSummaryCards } from "./MonthSummaryCards";
import { fmtHoursFa, formatShamsiDateText } from "@/shared/lib/format";

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

      {/* ── Extracted Bento KPI Metric Cards & Leave Track ── */}
      <MonthSummaryCards
        netHours={netHours}
        overtimeHours={overtimeHours}
        deficitHours={deficitHours}
        workDays={workDays}
        holidayDays={holidayDays}
        leaveRemaining={leaveRemaining}
        leaveQuota={leaveQuota}
        leaveUsedPct={leaveUsedPct}
        year={m.year}
      />

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

        <div className="custom-scroll" style={{ display: "grid", gap: 6, maxHeight: 300, overflowY: "auto", paddingLeft: 4, paddingRight: 2 }}>
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
                    background: isRemote ? "rgba(124,58,237,.06)" : "var(--surface-2)",
                    borderColor: isRemote ? "var(--violet)" : "var(--border-strong)",
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
                      {r.in || "—"} تا {r.out || "—"} {r.net > 0 ? `(${fmtHoursFa(r.net)})` : ""}
                    </span>
                    <ChevronLeft size={13} style={{ color: "var(--muted)" }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Export Excel Action ── */}
      <Button
        variant="primary"
        style={{
          padding: "10px",
          fontSize: 13,
          fontWeight: 800,
        }}
        onClick={downloadExcel}
        icon={<Download size={15} />}
      >
        دریافت فایل خروجی اکسل ({m.month_name})
      </Button>

      {/* ── Day Detail Drawer ── */}
      <DayDetailDrawer open={Boolean(selectedDay)} onClose={() => setSelectedDay(null)} day={selectedDay} />
    </div>
  );
}

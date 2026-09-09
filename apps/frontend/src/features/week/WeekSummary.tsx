import { useState } from "react";
import { useWeekReportQuery } from "../../shared/api/queries";
import { CardSkeleton } from "../../shared/ui/Skeleton";
import { DayDetailDrawer } from "../month/DayDetailDrawer";
import { formatShamsiDateText, fmtHoursCompactFa } from "../../shared/lib/format";
import { CalendarRange, Clock, Sparkles, ChevronLeft, Building2, Home } from "lucide-react";

export function WeekSummary() {
  const { data, error, isLoading } = useWeekReportQuery();
  const [selectedDay, setSelectedDay] = useState<any | null>(null);

  if (error)
    return (
      <div className="card">
        <p style={{ color: "var(--red)", fontWeight: 800 }}>❌ {String((error as any)?.message || error)}</p>
      </div>
    );
  if (isLoading || !data) return <CardSkeleton rows={3} />;

  const fmtHM = (h: any) => (h == null || Number(h) === 0 ? "—" : `${Number(h).toFixed(2)} ساعت`);

  if (!data.days || !data.days.length)
    return (
      <div className="card" style={{ textAlign: "center", padding: "24px 14px" }}>
        <p style={{ color: "var(--muted)", margin: 0, fontWeight: 700 }}>
          هفتهٔ جاری هنوز ثبت کاری ندارد — با اولین «ورود»، کارکرد هفتگی شما نمایش داده می‌شود.
        </p>
      </div>
    );

  const netTotal = data.totals?.net || 0;
  const deficitTotal = data.totals?.deficit || 0;
  const overtimeTotal = data.totals?.overtime || 0;
  const remoteDays = data.totals?.remote_days || 0;

  return (
    <div className="card" style={{ display: "grid", gap: 14 }}>
      {/* ── Header ── */}
      <div className="section-head" style={{ margin: 0 }}>
        <div>
          <div className="kicker">WEEKLY OVERVIEW</div>
          <h2 className="display" style={{ fontSize: 18, marginTop: 2 }}>
            عملکرد این هفته
          </h2>
        </div>
        <span className="badge badge-muted mono" style={{ fontSize: 11 }}>
          {data.days.length} روز کاری {remoteDays ? `· 🏠 ${remoteDays} دورکار` : ""}
        </span>
      </div>

      {/* ── Bento KPI Metric Grid (with dynamic tokens) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {/* Net Hours KPI */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={15} style={{ color: "var(--amber)" }} />
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>کارکرد مفید</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <b className="mono" style={{ fontSize: 16, color: "var(--amber-2)" }}>
              {fmtHoursCompactFa(netTotal)}
            </b>
          </div>
        </div>

        {/* Overtime KPI */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: "rgba(34, 197, 94, 0.08)",
            borderColor: "var(--green)",
            borderWidth: 2,
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={15} style={{ color: "var(--green)" }} />
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>اضافه‌کاری</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <b className="mono" style={{ fontSize: 16, color: "var(--green)" }}>
              {fmtHoursCompactFa(overtimeTotal)}
            </b>
          </div>
        </div>
      </div>

      {deficitTotal > 0 && (
        <div
          className="row"
          style={{
            padding: "8px 12px",
            background: "rgba(239, 68, 68, 0.08)",
            borderColor: "var(--red)",
            borderWidth: 2,
            gap: 6,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700 }}>⚠️ کسری کار هفته:</span>
          <b className="mono" style={{ fontSize: 12, color: "var(--red)" }}>
            {fmtHoursCompactFa(deficitTotal)}
          </b>
        </div>
      )}

      {/* ── Days Breakdown List ── */}
      <div style={{ display: "grid", gap: 6 }}>
        {data.days.map((d: any) => {
          const isRemote = d.work_mode === "remote";
          const isHoliday = !!d.is_holiday;
          const hasEvents = !!(d.has_events || (d.net != null && Number(d.net) > 0) || d.in);

          return (
            <div
              key={d.date}
              className="row"
              style={{
                padding: "10px 12px",
                background: isRemote
                  ? "rgba(124, 58, 237, 0.04)"
                  : isHoliday
                  ? "rgba(239, 68, 68, 0.04)"
                  : "var(--surface-2)",
                borderColor: isRemote
                  ? "rgba(124, 58, 237, 0.3)"
                  : isHoliday
                  ? "rgba(239, 68, 68, 0.3)"
                  : "var(--border-strong)",
                borderWidth: 2,
                cursor: "pointer",
                transition: "transform 0.12s ease, border-color 0.12s ease",
              }}
              onClick={() => {
                setSelectedDay({
                  ...d,
                  label: `${d.weekday || ""}، ${formatShamsiDateText(d.date)}`,
                });
              }}
            >
              {/* Day & Mode */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "1.5px solid var(--border-strong)",
                    background: isRemote
                      ? "rgba(124, 58, 237, 0.12)"
                      : isHoliday
                      ? "rgba(239, 68, 68, 0.12)"
                      : "var(--card)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {isRemote ? (
                    <Home size={15} style={{ color: "var(--violet)" }} />
                  ) : isHoliday ? (
                    <CalendarRange size={15} style={{ color: "var(--red)" }} />
                  ) : (
                    <Building2 size={15} style={{ color: "var(--amber)" }} />
                  )}
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text)" }}>
                    {d.weekday} <small style={{ fontWeight: 600, color: "var(--muted)", fontSize: 11 }}>{formatShamsiDateText(d.date)}</small>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                    {isHoliday ? (
                      <span style={{ color: "var(--red)", fontWeight: 700 }}>
                        {d.holiday_name || "تعطیل"} {hasEvents ? "(کارکرد در تعطیلی)" : ""}
                      </span>
                    ) : (
                      <span>{d.work_mode_label || (isRemote ? "دورکاری" : "حضور در شرکت")}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics & Chevron */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: "left" }}>
                  <div className="mono" style={{ fontWeight: 800, fontSize: 13, color: "var(--text)" }}>
                    {fmtHM(d.net)}
                  </div>
                  {d.in && d.out && (
                    <small className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                      {d.in} تا {d.out}
                    </small>
                  )}
                </div>
                <ChevronLeft size={16} style={{ color: "var(--muted)" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Details Dialog */}
      <DayDetailDrawer open={Boolean(selectedDay)} onClose={() => setSelectedDay(null)} day={selectedDay} />
    </div>
  );
}

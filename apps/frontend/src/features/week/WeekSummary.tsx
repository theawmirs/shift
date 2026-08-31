import { useEffect, useState } from "react";
import { API } from "../../shared/lib/api";
import { CardSkeleton } from "../../shared/ui/Skeleton";
import { DayDetailDrawer } from "../month/DayDetailDrawer";
import { formatShamsiDateText } from "../../shared/lib/format";
import { CalendarRange, Clock, Sparkles, ChevronLeft, Building2, Home } from "lucide-react";

export function WeekSummary() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<any | null>(null);

  useEffect(() => {
    API.reportWeek()
      .then(setData)
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  if (err)
    return (
      <div className="card">
        <p style={{ color: "var(--red)", fontWeight: 800 }}>❌ {err}</p>
      </div>
    );
  if (!data) return <CardSkeleton rows={3} />;

  const fmtHMS = (h: any) => {
    if (h == null || Number(h) === 0) return "۰:۰۰";
    const n = Number(h);
    const hi = Math.floor(n),
      mi = Math.round((n - hi) * 60);
    return `${hi}:${String(mi).padStart(2, "0")}`;
  };

  const fmtHM = (h: any) => (h == null || Number(h) === 0 ? "—" : `${Number(h).toFixed(2)} ساعت`);

  if (!data.days.length)
    return (
      <div className="card" style={{ textAlign: "center", padding: "24px 14px" }}>
        <p style={{ color: "var(--muted)", margin: 0, fontWeight: 700 }}>
          هفتهٔ جاری هنوز ثبت کاری ندارد — با اولین «ورود»، کارکرد هفتگی شما نمایش داده می‌شود.
        </p>
      </div>
    );

  const netTotal = data.totals.net || 0;
  const deficitTotal = data.totals.deficit || 0;
  const overtimeTotal = data.totals.overtime || 0;
  const remoteDays = data.totals.remote_days || 0;

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

      {/* ── Bento KPI Metric Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {/* Net Hours KPI */}
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
            <span>مجموع کارکرد خالص</span>
          </div>
          <b className="mono" style={{ fontSize: 16, color: "var(--text)" }}>
            {fmtHMS(netTotal)} <small style={{ fontSize: 11, fontWeight: 600 }}>ساعت</small>
          </b>
        </div>

        {/* Balance Status KPI */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: deficitTotal > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)",
            borderColor: deficitTotal > 0 ? "var(--red)" : "var(--green)",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: deficitTotal > 0 ? "var(--red)" : "var(--green)",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            <Sparkles size={13} />
            <span>{deficitTotal > 0 ? "کسری هفته" : overtimeTotal > 0 ? "اضافه‌کاری هفته" : "وضعیت موظفی"}</span>
          </div>
          <b className="mono" style={{ fontSize: 16, color: deficitTotal > 0 ? "var(--red)" : "var(--green)" }}>
            {deficitTotal > 0
              ? `${fmtHMS(deficitTotal)} -`
              : overtimeTotal > 0
              ? `+ ${fmtHMS(overtimeTotal)}`
              : "تکمیل ✔"}
          </b>
        </div>
      </div>

      {/* ── Days Breakdown List ── */}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <CalendarRange size={13} />
          <span>ریز روزهای هفته:</span>
        </div>

        {data.days.map((r: any) => {
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
                cursor: "pointer",
                padding: "10px 12px",
                background: isRemote ? "rgba(124,58,237,.06)" : "rgba(255,255,255,.04)",
                borderColor: isRemote ? "var(--violet)" : "rgba(255,255,255,.08)",
                borderStyle: isRemote ? "dashed" : "solid",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "1.5px solid #000",
                    background: isRemote ? "#DDD6FE" : "#FDE68A",
                    color: "#0F172A",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "1.5px 1.5px 0 #000",
                    flexShrink: 0,
                  }}
                >
                  {isRemote ? <Home size={15} /> : <Building2 size={15} />}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <b style={{ fontSize: 13 }}>{r.label}</b>
                    {r.is_holiday && (
                      <span className="badge badge-warn" style={{ fontSize: 9, padding: "2px 6px" }}>
                        {r.holiday_name || "تعطیل"}
                      </span>
                    )}
                  </div>
                  <small className="mono" style={{ color: "var(--muted)", fontSize: 11, marginTop: 2, display: "block" }}>
                    {r.in || "—"} تا {r.out || "—"}
                    {r.leave_intervals?.length ? ` · مرخصی ${fmtHM(r.leave)}` : ""}
                  </small>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="badge badge-muted mono" style={{ fontSize: 11, fontWeight: 800 }}>
                  {r.net > 0 ? fmtHMS(r.net) : "—"}
                </span>
                <ChevronLeft size={14} style={{ color: "var(--muted)", opacity: 0.7 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Day Detail Modal ── */}
      <DayDetailDrawer open={Boolean(selectedDay)} onClose={() => setSelectedDay(null)} day={selectedDay} />
    </div>
  );
}

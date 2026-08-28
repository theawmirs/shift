import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { API } from "../../shared/lib/api";
import { CardSkeleton } from "../../shared/ui/Skeleton";
import { DayDetailDrawer } from "../month/DayDetailDrawer";
import { formatShamsiDateText } from "../../shared/lib/format";

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
  if (!data.days.length)
    return (
      <div className="card">
        <p style={{ color: "var(--muted)" }}>
          هفتهٔ جاری هنوز ثبت کاری ندارد — ورود رو بزن تا هفته‌ات ساخته بشه.
        </p>
      </div>
    );
  const fmtHMS = (h: any) => {
    if (h == null || Number(h) === 0) return "—";
    const n = Number(h);
    const hi = Math.floor(n),
      mi = Math.round((n - hi) * 60);
    return `${hi}:${String(mi).padStart(2, "0")}`;
  };
  const fmtHM = (h: any) => (h == null || Number(h) === 0 ? "—" : `${Number(h).toFixed(2)} ساعت`);
  return (
    <div className="card">
      <div className="section-head">
        <h2 className="display">این هفته</h2>
        <span className="badge badge-muted mono">
          {data.days.length} روز {data.totals.remote_days ? `· 🏠 ${data.totals.remote_days} دورکار` : ""}
        </span>
      </div>
      <div className="list">
        {data.days.map((r: any, i: number) => (
          <motion.div
            key={r.date}
            className="row"
            onClick={() =>
              setSelectedDay({
                ...r,
                label: `${r.weekday || ""}، ${formatShamsiDateText(r.date)}`,
              })
            }
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "tween", duration: 0.18, delay: Math.min(0.15, 0.02 * i), ease: [0.32, 0.72, 0, 1] }}
            style={{
              cursor: "pointer",
              willChange: "transform, opacity",
              transform: "translateZ(0)",
              ...(r.work_mode === "remote"
                ? { borderStyle: "dashed", borderColor: "var(--violet)", background: "rgba(124,58,237,.08)" }
                : {})
            }}
          >
            <div>
              <b>{r.label}</b>
              {r.is_holiday && (
                <span className="badge badge-warn" style={{ marginInlineStart: 8 }}>
                  {r.holiday_name || "تعطیل"}
                </span>
              )}
              {r.work_mode === "remote" && (
                <span
                  className="badge"
                  style={{ marginInlineStart: 6, background: "#DDD6FE", color: "#4C1D95", borderColor: "#000" }}
                >
                  🏠 دورکار
                </span>
              )}
              <br />
              <small className="mono">
                {r.in || "—"} → {r.out || "—"}{" "}
                {r.leave_intervals?.length ? `· مرخصی ${fmtHM(r.leave)}` : ""}
              </small>
            </div>
            <span className="badge badge-muted mono">{r.net > 0 ? fmtHMS(r.net) : "—"}</span>
          </motion.div>
        ))}
      </div>
      <div style={{ height: 10 }} />
      <div className="row" style={{ background: "var(--card2)", borderStyle: "dashed" }}>
        <b>جمع هفته</b>
        <span className="mono" style={{ fontWeight: 800, fontSize: 11 }}>
          {data.totals.net > 0 ? `${fmtHMS(data.totals.net)} خالص` : "بدون کار ثبت‌شده"}
          {data.totals.deficit > 0
            ? ` · کسری ${fmtHMS(data.totals.deficit)}`
            : data.totals.net > 0
            ? " · بدون کسری 🎉"
            : ""}
          {data.totals.overtime > 0 ? ` · اضافه‌کاری ${fmtHMS(data.totals.overtime)}` : ""}
          {data.totals.remote_days ? ` · 🏠 ${data.totals.remote_days} دورکار` : ""}
        </span>
      </div>
      {data.text && (
        <details style={{ marginTop: 10 }}>
          <summary className="mono" style={{ cursor: "pointer", color: "var(--muted)", fontSize: 12 }}>
            متن گزارش
          </summary>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "YekanBakh",
              fontSize: 12,
              color: "var(--muted2)",
              marginTop: 8,
            }}
          >
            {data.text}
          </pre>
        </details>
      )}

      <DayDetailDrawer
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        day={selectedDay}
      />
    </div>
  );
}

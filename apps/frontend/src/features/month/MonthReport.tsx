import { ChevronDown, Trash2 } from "lucide-react";
import { CardSkeleton } from "../../shared/ui/Skeleton";
import { useMonthReport } from "./useMonthReport";

function fmtFa(v: any) {
  return v == null ? "—" : Number(v) === 0 ? "۰ ساعت" : `${Number(v).toFixed(2)} ساعت`;
}

export function MonthReport({ onExcel }: { onExcel?: (msg: string, variant?: "success" | "error") => void }) {
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
      <div className="card">
        <p style={{ color: "var(--muted)", fontWeight: 700 }}>
          هنوز اطلاعاتی برای ماه‌های کاری ثبت نشده است.
        </p>
      </div>
    );
  }

  if (loading || !m) {
    return <CardSkeleton rows={5} />;
  }

  const noWork = m.totals?.work_days === 0 && (m.totals?.net || 0) === 0;

  return (
    <div className="card">
      {/* ── Month Selector ── */}
      <div style={{ marginBottom: 14 }}>
        <label className="field" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 12 }}>انتخاب ماه گزارش</span>
          <div style={{ position: "relative" }}>
            <select
              value={selMonth}
              onChange={(e) => setSelMonth(e.target.value)}
              className="mono"
              style={{
                width: "100%",
                padding: "10px 36px 10px 12px",
                borderRadius: 12,
                border: "2px solid #000",
                background: "#fff",
                color: "#0F172A",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "YekanBakh, sans-serif",
                boxShadow: "3px 3px 0 #000",
                appearance: "none",
                cursor: "pointer",
              }}
            >
              {months.map((mo) => (
                <option key={mo.key} value={mo.key}>
                  {mo.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "#0F172A",
              }}
            />
          </div>
        </label>
      </div>

      <div className="section-head">
        <h2 className="display">
          گزارش ماه — {m.month_name} {m.year}
        </h2>
        <span className="pill" style={{ background: "#fff", color: "#0F172A" }}>
          {m.month_key} {m.totals?.remote_days ? `· 🏠 ${m.totals.remote_days}` : ""}
        </span>
      </div>

      {noWork && (
        <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px" }}>
          هنوز برای این ماه ثبت کاری نداری — بعد از اولین ورود، خلاصه‌ات اینجا میاد.
        </p>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        <div className="row">
          <b>خالص کار</b>
          <span className="mono" style={{ fontWeight: 800 }}>
            {fmtFa(m.totals?.net)}
          </span>
        </div>
        <div className="row">
          <b>ناخالص</b>
          <span className="mono">{fmtFa(m.totals?.gross)}</span>
        </div>
        <div className="row">
          <b>مرخصی</b>
          <span className="mono">{m.totals?.leave > 0 ? fmtFa(m.totals.leave) : "بدون مرخصی"}</span>
        </div>
        <div className="row">
          <b>کسری</b>
          <span
            className="mono"
            style={{ fontWeight: 800, color: m.totals?.deficit > 0 ? "var(--red)" : "var(--green)" }}
          >
            {m.totals?.deficit > 0 ? fmtFa(m.totals.deficit) : "بدون کسری 🎉"}
          </span>
        </div>
        <div className="row">
          <b>اضافه‌کاری (اعلام‌شده)</b>
          <span className="mono">{m.totals?.overtime > 0 ? fmtFa(m.totals.overtime) : "نداری"}</span>
        </div>
        <div className="row">
          <b>تأخیر</b>
          <span className="mono">
            {m.totals?.late_days > 0
              ? `${m.totals.late_days} روز · ${fmtFa(m.totals.late_total)}`
              : "بدون تأخیر ✔"}
          </span>
        </div>
        <div className="row">
          <b>روزهای کاری</b>
          <span className="mono">
            {m.totals?.work_days} از {(m.totals?.work_days || 0) + (m.totals?.holiday_days || 0)} · تعطیل{" "}
            {m.totals?.holiday_days} ({m.totals?.holiday_worked} کاری)
          </span>
        </div>
        {m.totals?.remote_days > 0 && (
          <div className="row" style={{ borderStyle: "dashed", borderColor: "var(--violet)" }}>
            <b>🏠 دورکار</b>
            <span className="mono" style={{ fontWeight: 800 }}>
              {m.totals.remote_days} روز
            </span>
          </div>
        )}
        <div className="row" style={{ background: "var(--card2)", borderStyle: "dashed" }}>
          <b>مانده مرخصی سال {m.year}</b>
          <span className="mono" style={{ fontWeight: 800 }}>
            {m.leave_balance?.remaining === 0
              ? "۰ ساعت"
              : `${m.leave_balance?.remaining} از ${m.leave_balance?.quota} ساعت`}
          </span>
        </div>
        {m.daily_leaves_summary && Object.keys(m.daily_leaves_summary).length > 0 && (
          <div
            className="row"
            style={{ background: "rgba(96,165,250,.08)", borderColor: "#60a5fa" }}
          >
            <b>🗓 مرخصی روزانه</b>
            <span className="mono" style={{ fontSize: 12 }}>
              {Object.entries(m.daily_leaves_summary)
                .map(([k, v]) => `${v} ${k}`)
                .join(" + ")}{" "}
              · {m.totals?.leave > 0 ? `${m.totals.leave} ساعت` : ""}
            </span>
          </div>
        )}
      </div>

      {leaves.length > 0 && (
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <small className="mono" style={{ fontWeight: 800, fontSize: 12 }}>
            مرخصی روزانه این ماه
          </small>
          {leaves.map((it) => (
            <div key={it.id} className="row" style={{ padding: "8px 10px", fontSize: 12 }}>
              <span className="mono">
                {it.start_date}
                {it.end_date !== it.start_date ? ` → ${it.end_date}` : ""} · {it.label} · {it.hours}{" "}
                ساعت{it.reason ? ` · ${it.reason}` : ""}
              </span>
              <button
                className="btn btn-ghost mono"
                style={{ fontSize: 11, padding: "4px 8px" }}
                onClick={() => cancelLeave(it.id)}
              >
                <Trash2 size={12} /> لغو
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={downloadExcel}>
          ⬇ دانلود اکسل (با ستون محل کار)
        </button>
      </div>

      <details style={{ marginTop: 10 }}>
        <summary className="mono" style={{ cursor: "pointer", color: "var(--muted)", fontSize: 12 }}>
          ریز روزها
        </summary>
        <div style={{ display: "grid", gap: 6, marginTop: 8, maxHeight: 260, overflowY: "auto" }}>
          {m.rows
            ?.filter((r: any) => r.has_events)
            .map((r: any) => (
              <div
                key={r.date}
                className="row"
                style={{
                  padding: "8px 10px",
                  borderStyle: r.work_mode === "remote" ? "dashed" : undefined,
                  borderColor: r.work_mode === "remote" ? "var(--violet)" : undefined,
                }}
              >
                <small className="mono">
                  {r.date} · {r.weekday}
                  {r.is_holiday ? ` · ${r.holiday_name}` : ""} — {r.in || "—"}→{r.out || "—"} ·{" "}
                  {r.net > 0 ? `${r.net} ساعت` : "—"}{" "}
                  {r.work_mode === "remote" ? " 🏠 دورکار" : ""}
                </small>
                <span className="badge badge-muted mono" style={{ fontSize: 10 }}>
                  {r.work_mode === "remote"
                    ? "دورکار"
                    : r.is_holiday
                    ? "تعطیل"
                    : "کاری"}
                </span>
              </div>
            ))}
          {!m.rows?.some((r: any) => r.has_events) && (
            <p style={{ color: "var(--muted)", fontSize: 12 }}>ثبت کاری برای این ماه نیست.</p>
          )}
        </div>
      </details>
    </div>
  );
}

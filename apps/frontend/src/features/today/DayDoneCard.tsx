import {
  CheckCircle2,
  LogIn,
  LogOut,
  Coffee,
  BarChart3,
  ListChecks,
  FileEdit,
  Clock,
  Sparkles,
  Building2,
  Home,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtHoursFa, fmtHoursCompactFa } from "../../shared/lib/format";
import { Button } from "../../shared/ui/Button";

export interface DayDoneCardProps {
  day: any;
  weekday?: string;
  shamsi?: string;
}

export function DayDoneCard({ day, weekday, shamsi }: DayDoneCardProps) {
  const navigate = useNavigate();

  const inTime = day?.in || "—";
  const outTime = day?.out || "—";
  const netHours = day?.net ?? 0;
  const leaveHours = day?.leave ?? 0;
  const overtime = day?.overtime ?? 0;
  const deficit = day?.deficit ?? 0;
  const isRemote = day?.work_mode === "remote";
  const standardHours = 8;
  const pct = Math.min(100, Math.round((netHours / standardHours) * 100));

  return (
    <div
      className="card brutal"
      style={{
        background: "linear-gradient(180deg, var(--card) 0%, var(--card2) 100%)",
        borderColor: "var(--border-strong)",
        display: "grid",
        gap: 14,
      }}
    >
      {/* ── Top Header Bar with Live Badge & Attendance Mode Chip ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          className="pill pill-live"
          style={{
            background: "#22C55E",
            color: "#052e0b",
            fontSize: 11,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
          }}
        >
          <CheckCircle2 size={14} /> روز کاری پایان یافت
        </span>

        {/* Location mode badge (Remote vs Office) */}
        <span
          className="badge"
          style={{
            background: isRemote ? "#DDD6FE" : "#FEF3C7",
            color: isRemote ? "#4C1D95" : "#92400E",
            border: "1.5px solid #000",
            fontSize: 11,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 8px",
          }}
        >
          {isRemote ? <Home size={13} /> : <Building2 size={13} />}
          <span>{isRemote ? "دورکاری" : "حضور در دفتر"}</span>
        </span>
      </div>

      {/* ── Title & Day Meta ── */}
      <div>
        <div className="kicker mono" style={{ fontSize: 11 }}>
          {weekday && shamsi ? `${weekday} — ${shamsi}` : "امروز"}
        </div>
        <h2 className="display" style={{ fontSize: 24, margin: "4px 0 2px", color: "var(--text)" }}>
          خسته نباشی! 🎉
        </h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
          تایم‌شیت امروز با موفقیت بسته شد و ساعات کارکرد در سوابق ذخیره گردید.
        </p>
      </div>

      {/* ── Bento Metric Grid: In/Out Times + Net / Status ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {/* Clock In */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: "var(--surface-2)",
            borderColor: "var(--border-strong)",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--amber-2)", fontSize: 11, fontWeight: 800 }}>
            <LogIn size={13} />
            <span>زمان ورود</span>
          </div>
          <b className="mono" style={{ fontSize: 17, color: "var(--text)" }}>
            {inTime}
          </b>
        </div>

        {/* Clock Out */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: "var(--surface-2)",
            borderColor: "var(--border-strong)",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>
            <LogOut size={13} />
            <span>زمان خروج</span>
          </div>
          <b className="mono" style={{ fontSize: 17, color: "var(--text)" }}>
            {outTime}
          </b>
        </div>

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
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--amber-2)", fontSize: 11, fontWeight: 800 }}>
            <Clock size={13} />
            <span>کارکرد خالص</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, whiteSpace: "nowrap" }}>
            <b className="mono" style={{ fontSize: 18, color: "var(--text)" }}>
              {fmtHoursCompactFa(netHours)}
            </b>
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>ساعت</span>
          </div>
        </div>

        {/* Status / Deficit / Overtime KPI */}
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: deficit > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)",
            borderColor: deficit > 0 ? "var(--red)" : "var(--green)",
            borderWidth: 2,
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
              color: deficit > 0 ? "var(--red)" : "var(--green)",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            <Sparkles size={13} />
            <span>{deficit > 0 ? "کسری موظفی" : overtime > 0 ? "اضافه‌کاری" : "وضعیت شیفت"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, whiteSpace: "nowrap" }}>
            <b className="mono" style={{ fontSize: 16, color: deficit > 0 ? "var(--red)" : "var(--green)" }}>
              {deficit > 0
                ? `${fmtHoursCompactFa(deficit)} -`
                : overtime > 0
                ? `+ ${fmtHoursCompactFa(overtime)}`
                : "تکمیل ۱۰۰٪ ✔"}
            </b>
            {(deficit > 0 || overtime > 0) && (
              <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>ساعت</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Optional Hourly Leave Indicator ── */}
      {leaveHours > 0 && (
        <div
          className="row"
          style={{
            padding: "8px 12px",
            background: "rgba(96, 165, 250, 0.08)",
            borderColor: "#60A5FA",
            fontSize: 12,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Coffee size={14} style={{ color: "#60A5FA" }} />
            <b>مرخصی ساعتی استفاده‌شده:</b>
          </span>
          <b className="mono">{fmtHoursFa(leaveHours)}</b>
        </div>
      )}

      {/* ── Overtime Reminder Banner (if confirmed) ── */}
      {overtime > 0 && (
        <div
          className="row"
          style={{
            borderColor: "var(--amber)",
            background: "rgba(245,158,11,0.12)",
            color: "var(--text)",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 6,
            padding: "10px 12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, color: "var(--amber-2)" }}>
              <FileEdit size={16} /> یادآوری ثبت برگه اضافه‌کاری
            </span>
            <span className="badge" style={{ background: "var(--amber)", color: "#0F172A", fontWeight: 800, fontSize: 10 }}>
              {fmtHoursFa(overtime)}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
            تسک یادآور برای پر کردن فرم اضافه‌کاری در روز کاری بعدی فعال شد.
          </p>
        </div>
      )}

      {/* ── Completion Progress Bar ── */}
      <div
        style={{
          background: "var(--surface-2)",
          border: "2px solid var(--border-strong)",
          borderRadius: 14,
          padding: "8px 12px",
          display: "grid",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
          <span style={{ color: "var(--muted)", fontWeight: 700 }}>میزان پوشش موظفی ۸ ساعته:</span>
          <b className="mono" style={{ color: pct >= 100 ? "var(--green)" : "var(--amber)" }}>
            {pct}٪
          </b>
        </div>
        <div className="progress" style={{ height: 8 }}>
          <i
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? "var(--green)" : "linear-gradient(90deg, var(--amber), var(--violet))",
            }}
          />
        </div>
      </div>

      {/* ── Quick Action Navigation Buttons ── */}
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          variant="ghost"
          className="mono"
          style={{ flex: 1, padding: "10px 12px", fontSize: 12 }}
          onClick={() => navigate("/reports")}
          icon={<BarChart3 size={15} />}
        >
          مشاهده گزارش‌ها
        </Button>
        <Button
          variant="primary"
          className="mono"
          style={{ flex: 1, padding: "10px 12px", fontSize: 12 }}
          onClick={() => navigate("/tasks")}
          icon={<ListChecks size={15} />}
        >
          تسک‌های من
        </Button>
      </div>
    </div>
  );
}

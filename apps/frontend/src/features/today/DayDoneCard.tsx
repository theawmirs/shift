import { motion } from "framer-motion";
import { CheckCircle2, LogIn, LogOut, Coffee, BarChart3, ListChecks, FileEdit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtHoursFa } from "../../shared/lib/format";

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

  return (
    <motion.div
      className="card brutal"
      initial={{ opacity: 0, scale: 0.98, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      style={{
        background: "linear-gradient(180deg, var(--card) 0%, var(--card2) 100%)",
        borderColor: "var(--border-strong)",
        willChange: "transform, opacity",
        transform: "translateZ(0)",
      }}
    >
      {/* Header Badge & Title */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span
          className="pill pill-live"
          style={{
            background: "#22C55E",
            color: "#052e0b",
            fontSize: 12,
            gap: 6,
          }}
        >
          <CheckCircle2 size={15} /> روز کاری به پایان رسید
        </span>
        {isRemote && (
          <span
            className="badge"
            style={{
              background: "#DDD6FE",
              color: "#4C1D95",
              borderColor: "#000",
              fontWeight: 800,
            }}
          >
            🏠 دورکار
          </span>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <span className="kicker mono" style={{ fontSize: 11 }}>
          {weekday && shamsi ? `${weekday} — ${shamsi}` : "امروز"}
        </span>
        <h2 className="display" style={{ fontSize: 22, margin: "4px 0 2px", color: "var(--text)" }}>
          خسته نباشی! 🎉
        </h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
          خروج امروزت ثبت شده و عملکردت برای گزارش محاسبه شد.
        </p>
      </div>

      {/* Overtime Form Submission Reminder Banner if overtime exists */}
      {overtime > 0 && (
        <div
          className="row"
          style={{
            marginBottom: 12,
            borderColor: "var(--amber)",
            background: "rgba(245,158,11,0.12)",
            color: "var(--text)",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, color: "var(--amber-2)" }}>
              <FileEdit size={16} /> یادآوری برگه اضافه‌کاری
            </span>
            <span className="badge" style={{ background: "var(--amber)", color: "#0F172A", fontWeight: 800, fontSize: 10 }}>
              {fmtHoursFa(overtime)}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
            تسک یادآور برای پر کردن فرم اضافه‌کاری در بخش «تسک‌ها» ثبت شد. لطفاً فرم را تحویل دهید.
          </p>
        </div>
      )}

      {/* Clock In / Out Summary Chips */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: "rgba(255,255,255,0.06)",
            justifyContent: "flex-start",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              background: "#FDE68A",
              color: "#0F172A",
              border: "1.5px solid #000",
            }}
          >
            <LogIn size={14} />
          </span>
          <div>
            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>ساعت ورود</div>
            <b className="mono" style={{ fontSize: 14 }}>
              {inTime}
            </b>
          </div>
        </div>

        <div
          className="row"
          style={{
            padding: "10px 12px",
            background: "rgba(255,255,255,0.06)",
            justifyContent: "flex-start",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              background: "#fff",
              color: "#0F172A",
              border: "1.5px solid #000",
            }}
          >
            <LogOut size={14} />
          </span>
          <div>
            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>ساعت خروج</div>
            <b className="mono" style={{ fontSize: 14 }}>
              {outTime}
            </b>
          </div>
        </div>
      </div>

      {/* Performance Summary Rows */}
      <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
        <div className="row" style={{ padding: "8px 12px" }}>
          <b>کارکرد خالص امروز</b>
          <span className="mono" style={{ fontWeight: 800, color: "var(--amber-2)" }}>
            {fmtHoursFa(netHours)}
          </span>
        </div>

        {leaveHours > 0 && (
          <div className="row" style={{ padding: "8px 12px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Coffee size={13} style={{ color: "var(--muted)" }} />
              <b>مرخصی ساعتی</b>
            </span>
            <span className="mono">{fmtHoursFa(leaveHours)}</span>
          </div>
        )}

        <div className="row" style={{ padding: "8px 12px" }}>
          <b>وضعیت کارکرد</b>
          <span
            className="mono"
            style={{
              fontWeight: 800,
              color: deficit > 0 ? "var(--red)" : "var(--green)",
            }}
          >
            {deficit > 0
              ? `کسری: ${fmtHoursFa(deficit)}`
              : overtime > 0
              ? `+ ${fmtHoursFa(overtime)} اضافه‌کاری 🎉`
              : "تکمیل موظفی بدون کسری ✨"}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, padding: "10px 12px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={() => navigate("/reports")}
        >
          <BarChart3 size={14} /> مشاهده گزارش‌ها
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1, padding: "10px 12px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={() => navigate("/tasks")}
        >
          <ListChecks size={14} /> تسک‌های من
        </button>
      </div>
    </motion.div>
  );
}

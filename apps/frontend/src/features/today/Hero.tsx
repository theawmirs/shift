import { Clock3, BadgeCheck, BarChart3, Radio, Hourglass } from "lucide-react";

export function Hero({
  liveMinutes,
  shamsi = "۲۹ مرداد ۱۴۰۵",
  weekday = "پنجشنبه",
  inTime = "09:42",
}: {
  liveMinutes: number;
  shamsi?: string;
  weekday?: string;
  inTime?: string;
  status?: string | null;
}) {
  const liveHours = liveMinutes / 60;
  const standardHours = 8;
  const pct = Math.min(100, Math.round((liveHours / standardHours) * 100));
  const isWorking = inTime !== "—" && inTime !== "" && inTime !== null;

  // Remaining or overtime duration
  const diffMinutes = Math.round(standardHours * 60 - liveMinutes);
  const isCompleted = diffMinutes <= 0;
  const remAbs = Math.abs(diffMinutes);
  const remH = Math.floor(remAbs / 60);
  const remM = remAbs % 60;
  const remFormatted = `${remH}:${String(remM).padStart(2, "0")}`;

  return (
    <div
      className="card brutal"
      style={{
        background: "linear-gradient(180deg, var(--card) 0%, var(--card2) 100%)",
        borderColor: "var(--border-strong)",
      }}
    >
      <div className="hero">
        {/* Top bar: Date & Live Status Pill */}
        <div className="hero-top">
          <span className="kicker mono" style={{ fontSize: 11 }}>
            {weekday} — {shamsi}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isWorking ? (
              <span
                className="pill pill-live"
                style={{
                  background: "#22C55E",
                  color: "#052e0b",
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Radio size={13} className="pulse-icon" />
                <span>{inTime} ورود</span>
              </span>
            ) : (
              <span
                className="pill pill-idle"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--muted)",
                  border: "1.5px solid var(--border-strong)",
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Clock3 size={13} />
                <span>آماده ورود</span>
              </span>
            )}
          </div>
        </div>

        {/* Main Live Hours Counter */}
        <div>
          <h2 className="hero-title display" style={{ fontSize: 26 }}>
            {isWorking ? (
              <>
                تا الان{" "}
                <span style={{ color: "var(--amber)", letterSpacing: "-0.02em" }}>
                  {Math.floor(liveHours)}:{String(Math.round((liveHours % 1) * 60)).padStart(2, "0")}
                </span>{" "}
                کار کردی
              </>
            ) : (
              <span>روز کاری هنوز شروع نشده</span>
            )}
          </h2>
          <p className="hero-sub" style={{ marginTop: 4 }}>
            {isWorking
              ? "محاسبه زنده از زمان ورود با کسر مرخصی‌ها — خروج هنوز ثبت نشده."
              : "با زدن دکمه «ورود»، زمان کاری شما محاسبه و ذخیره خواهد شد."}
          </p>
        </div>

        {/* Telemetry Chips in Single Responsive Row — No redundancy */}
        <div className="time-row">
          <div className="time-chip">
            <BadgeCheck size={15} /> موظفی ۸:۰۰
          </div>

          <div
            className="time-chip"
            style={{
              background: isCompleted ? "rgba(34, 197, 94, 0.15)" : "var(--card2)",
              color: isCompleted ? "var(--green)" : "var(--text)",
              borderColor: isCompleted ? "var(--green)" : "#000",
            }}
          >
            <Hourglass size={14} />
            <span>
              {isCompleted ? `+${remFormatted} اضافه‌کار` : `${remFormatted} تا تکمیل`}
            </span>
          </div>

          <div className="time-chip time-chip--violet">
            <BarChart3 size={15} /> پیشرفت {pct}%
          </div>
        </div>

        {/* Brutalist Progress Bar */}
        <div className="progress" aria-hidden style={{ height: 10 }}>
          <i
            style={{
              width: `${pct}%`,
              transition: "width 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
              background: pct >= 100 ? "var(--green)" : "linear-gradient(90deg, var(--amber), var(--violet))",
            }}
          />
        </div>
      </div>
    </div>
  );
}

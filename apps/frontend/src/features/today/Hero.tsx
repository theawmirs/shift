import { Clock3, BadgeCheck, BarChart3, Radio, Hourglass, Pencil } from "lucide-react";
import { fmtHoursFa, fmtHoursCompactFa, toFaDigits } from "../../shared/lib/format";

export function Hero({
  liveMinutes,
  shamsi = "۲۹ مرداد ۱۴۰۵",
  weekday = "پنجشنبه",
  inTime = "09:42",
  inTimeEditable = false,
  onEditInClick,
}: {
  liveMinutes: number;
  shamsi?: string;
  weekday?: string;
  inTime?: string;
  status?: string | null;
  inTimeEditable?: boolean;
  onEditInClick?: () => void;
}) {
  const liveHours = liveMinutes / 60;
  const standardHours = 8;
  const pct = Math.min(100, Math.round((liveHours / standardHours) * 100));
  const isWorking = inTime !== "—" && inTime !== "" && inTime !== null;

  // Remaining or overtime duration
  const diffMinutes = Math.round(standardHours * 60 - liveMinutes);
  const isCompleted = diffMinutes <= 0;
  const remAbs = Math.abs(diffMinutes);
  const remFormatted = fmtHoursCompactFa(remAbs / 60);

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
              <>
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
                {inTimeEditable && (
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ width: 28, height: 28, borderRadius: 9, boxShadow: "2px 2px 0 #000" }}
                    onClick={onEditInClick}
                    title="ویرایش ساعت ورود"
                    aria-label="ویرایش ساعت ورود"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </>
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
                  {fmtHoursFa(liveHours)}
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

        {/* Telemetry Chips — 3 equal tiles, wrap-safe (no horizontal overflow) */}
        <div className="time-row">
          <div className="time-chip">
            <BadgeCheck size={15} />
            <span className="tc-body">
              <span className="tc-label">موظفی</span>
              <span className="tc-value">۸ ساعت</span>
            </span>
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
            <span className="tc-body">
              <span className="tc-label">{isCompleted ? "اضافه‌کار" : "تا تکمیل"}</span>
              <span className="tc-value">{isCompleted ? `+${remFormatted}` : remFormatted}</span>
            </span>
          </div>

          <div className="time-chip time-chip--violet">
            <BarChart3 size={15} />
            <span className="tc-body">
              <span className="tc-label">پیشرفت</span>
              <span className="tc-value">{toFaDigits(pct)}٪</span>
            </span>
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

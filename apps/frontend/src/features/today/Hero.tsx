import { useEffect, useState } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";
import { Clock3, Timer, BadgeCheck, BarChart3, Radio } from "lucide-react";

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 90, damping: 20 });
  const rounded = useTransform(spring, (v) => v.toFixed(2));
  const [display, setDisplay] = useState(value.toFixed(2));
  useEffect(() => mv.set(value), [value, mv]);
  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => unsub();
  }, [rounded]);
  return (
    <span className="mono" style={{ fontWeight: 800 }}>
      {display}
    </span>
  );
}

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
                  background: "rgba(255,255,255,0.08)",
                  color: "var(--muted)",
                  border: "1.5px solid #000",
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
          <h2 className="hero-title display" style={{ fontSize: 24 }}>
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

        {/* Telemetry Chips in Single Responsive Row */}
        <div className="time-row">
          <div className="time-chip">
            <Timer size={15} />
            <b>
              <AnimatedNumber value={liveHours} />
            </b>{" "}
            ساعت
          </div>
          <div className="time-chip time-chip--light">
            <BadgeCheck size={15} /> موظفی ۸:۰۰
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

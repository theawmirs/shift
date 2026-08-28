import { useEffect, useState } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";
import { Clock3, Timer, BadgeCheck, BarChart3 } from "lucide-react";

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
}) {
  const liveHours = liveMinutes / 60;
  const pct = Math.min(100, Math.round((liveHours / 8) * 100));
  return (
    <div className="card brutal rotate-1" style={{ willChange: "auto" }}>
    
      <div className="hero">
        <div className="hero-top">
          <span className="kicker mono">
            امروز • {weekday} — {shamsi}
          </span>
          <span className="pill" style={{ background: "#FDE68A", color: "#0F172A" }}>
            <Clock3 size={14} /> {inTime} ورود
          </span>
        </div>
        <h2 className="hero-title display">
          تا الان{" "}
          <span style={{ color: "var(--amber)" }}>
            {Math.floor(liveHours)}:{String(Math.round((liveHours % 1) * 60)).padStart(2, "0")}
          </span>{" "}
          کار کردی
        </h2>
        <p className="hero-sub">محاسبه زنده از لحظه ورود — مرخصی‌ها کم می‌شود. هنوز خروج ثبت نشده.</p>
        <div className="time-row">
          <div className="time-chip">
            <Timer size={16} />{" "}
            <b>
              <AnimatedNumber value={liveHours} />
            </b>{" "}
            ساعت
          </div>
          <div className="time-chip time-chip--light">
            <BadgeCheck size={16} /> استاندارد ۸:۰۰
          </div>
          <div className="time-chip time-chip--violet">
            <BarChart3 size={16} /> پیشرفت {pct}%
          </div>
        </div>
        <div className="progress" aria-hidden>
          <i style={{ width: `${pct}%`, transition: "width 0.5s ease-out" }} />
        </div>
      </div>
    </div>
  );
}

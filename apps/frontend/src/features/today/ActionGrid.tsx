import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, LogOut, Coffee, Undo2, Home, Building2, Clock, Sparkles } from "lucide-react";
import { Drawer } from "../../shared/ui/Drawer";
import { fmtHoursFa } from "../../shared/lib/format";

export interface ActionGridProps {
  onAction: (k: string, at?: string, otHours?: number) => void;
  onRemoteToggle: () => void;
  workMode?: string | null;
  day_status?: string | null;
  day_status_reason?: string | null;
  disabledReason?: string | null;
  leave_open?: boolean;
  liveMinutes?: number;
  standardHours?: number;
}

export function ActionGrid({
  onAction,
  onRemoteToggle,
  workMode,
  day_status,
  day_status_reason,
  disabledReason,
  leave_open,
  liveMinutes = 0,
  standardHours = 8,
}: ActionGridProps) {
  const isRemote = workMode === "remote";
  const effectiveReason = day_status_reason ?? disabledReason ?? null;

  const [overrideModal, setOverrideModal] = useState<"in" | "out" | null>(null);
  const [otModal, setOtModal] = useState<{ open: boolean; extraHours: number; at?: string } | null>(null);
  const [customTime, setCustomTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  function isDisabled(k: string) {
    if (day_status === "holiday" || day_status === "done") return true;
    if (day_status === "idle") return k !== "in";
    if (day_status === "working") {
      if (k === "in") return true;
      if (k === "back") return !leave_open;
      return false; // out, leave enabled
    }
    if (day_status === "on_leave") return k !== "back";
    return false;
  }

  function titleFor(k: string) {
    const reason = effectiveReason || "";
    if (day_status === "holiday" || day_status === "done") {
      return (
        reason ||
        (day_status === "holiday"
          ? "امروز تعطیله — ثبت بسته‌ست تا فردا"
          : "امروز قبلاً خروج ثبت شده — تا فردا")
      );
    }
    if (day_status === "idle") {
      if (k === "out") return "هنوز ورود نزده‌ای";
      if (k === "leave") return "اول ورود بزن";
      if (k === "back") return "مرخصی فعالی نداری";
      return "";
    }
    if (day_status === "working") {
      if (k === "in") return "قبلاً ورود زدی";
      if (k === "back" && !leave_open) return "مرخصی فعالی نداری";
      return "";
    }
    if (day_status === "on_leave") {
      if (k === "in") return "در مرخصی هستی — اول برگشتم بزن";
      if (k === "out") return "در مرخصی هستی — اول برگشتم بزن";
      if (k === "leave") return "در مرخصی هستی";
      return "";
    }
    return "";
  }

  const items = [
    { k: "in", title: "ورود", desc: "ثبت ورود امروز", Icon: LogIn, cls: "action--in" },
    { k: "out", title: "خروج", desc: "ثبت خروج + گزارش", Icon: LogOut, cls: "action--out" },
    { k: "leave", title: "مرخصی", desc: "شروع مرخصی ساعتی", Icon: Coffee, cls: "action--leave" },
    { k: "back", title: "برگشتم", desc: "پایان مرخصی", Icon: Undo2, cls: "action--back" },
  ];

  const handleActionClick = (k: string) => {
    if (k === "out") {
      const liveHours = liveMinutes / 60;
      if (liveHours > standardHours) {
        const extra = Math.round((liveHours - standardHours) * 100) / 100;
        setOtModal({ open: true, extraHours: extra });
        return;
      }
    }
    onAction(k);
  };

  const handleManualSubmit = () => {
    if (!overrideModal || !customTime) return;
    const at = customTime.trim();
    if (overrideModal === "out") {
      const liveHours = liveMinutes / 60;
      if (liveHours > standardHours) {
        const extra = Math.round((liveHours - standardHours) * 100) / 100;
        setOverrideModal(null);
        setOtModal({ open: true, extraHours: extra, at });
        return;
      }
    }
    onAction(overrideModal, at);
    setOverrideModal(null);
  };

  return (
    <div>
      <motion.div
        className="actions"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {items.map((it) => {
          const dis = isDisabled(it.k);
          const t = titleFor(it.k);
          return (
            <motion.button
              key={it.k}
              className={`action ${it.cls}`}
              disabled={dis}
              title={t || undefined}
              aria-disabled={dis}
              style={dis ? { opacity: 0.45, pointerEvents: "none", cursor: "not-allowed" } : undefined}
              variants={{
                hidden: { y: 10, opacity: 0, rotate: it.k === "in" || it.k === "leave" ? -1 : 1 },
                show: { y: 0, opacity: 1, rotate: it.k === "in" || it.k === "leave" ? -1 : 1 },
              }}
              whileHover={dis ? undefined : { y: -2 }}
              whileTap={dis ? undefined : { scale: 0.98 }}
              onClick={() => {
                if (dis) return;
                handleActionClick(it.k);
              }}
            >
              <span className="ico">
                <it.Icon size={18} />
              </span>
              <h3>{it.title}</h3>
              <p>{it.desc}</p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Manual Time Override Trigger */}
      {(day_status === "idle" || day_status === "working") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <button
            className="btn btn-ghost mono"
            style={{
              padding: "8px 10px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: day_status !== "idle" ? 0.4 : 1,
              pointerEvents: day_status !== "idle" ? "none" : "auto",
            }}
            onClick={() => setOverrideModal("in")}
          >
            <Clock size={13} /> ورود دستی (ساعت دلخواه)
          </button>
          <button
            className="btn btn-ghost mono"
            style={{
              padding: "8px 10px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: day_status !== "working" ? 0.4 : 1,
              pointerEvents: day_status !== "working" ? "none" : "auto",
            }}
            onClick={() => setOverrideModal("out")}
          >
            <Clock size={13} /> خروج دستی (ساعت دلخواه)
          </button>
        </div>
      )}

      {/* Overtime Decision Modal */}
      <Drawer
        open={Boolean(otModal?.open)}
        onClose={() => {
          if (otModal) {
            onAction("out", otModal.at);
            setOtModal(null);
          }
        }}
        title="ثبت اضافه‌کاری امروز"
        height="auto"
      >
        {otModal && (
          <div style={{ display: "grid", gap: 14, padding: "8px 0" }}>
            <div
              className="row"
              style={{
                borderColor: "var(--amber)",
                background: "rgba(245,158,11,0.08)",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={18} style={{ color: "var(--amber)" }} />
                <b style={{ fontSize: 14 }}>
                  شما {fmtHoursFa(otModal.extraHours)} بیشتر از موظفی حضور داشتید!
                </b>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                آیا مایلید این زمان به عنوان اضافه‌کاری در سامانه ثبت شده و یادآور پر کردن فرم برایتان فعال گردد؟
              </p>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ padding: "12px", fontWeight: 800, fontSize: 13 }}
                onClick={() => {
                  onAction("out", otModal.at, otModal.extraHours);
                  setOtModal(null);
                }}
              >
                ✅ بله، {fmtHoursFa(otModal.extraHours)} اضافه‌کاری ثبت شود
              </button>

              <button
                className="btn btn-ghost"
                style={{ padding: "10px", fontSize: 12 }}
                onClick={() => {
                  onAction("out", otModal.at);
                  setOtModal(null);
                }}
              >
                خیر، فقط خروج ثبت شود (بدون اضافه‌کار)
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Override Time Drawer */}
      <Drawer
        open={overrideModal !== null}
        onClose={() => setOverrideModal(null)}
        title={overrideModal === "in" ? "ثبت ورود با ساعت دلخواه" : "ثبت خروج با ساعت دلخواه"}
        height="auto"
      >
        <div style={{ display: "grid", gap: 14, padding: "8px 0" }}>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
            {overrideModal === "in"
              ? "اگه یادت رفته بود موقع ورود دکمه بزنی، ساعت واقعی ورودت رو وارد کن:"
              : "اگه یادت رفته بود موقع خروج دکمه بزنی، ساعت واقعی خروجت رو وارد کن:"}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="mono"
              style={{
                fontSize: 22,
                fontWeight: 800,
                padding: "10px 16px",
                borderRadius: 14,
                border: "2px solid #000",
                boxShadow: "3px 3px 0 #000",
                background: "#fff",
                color: "#0F172A",
                textAlign: "center",
                width: "160px",
              }}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ fontWeight: 800 }}
            onClick={handleManualSubmit}
          >
            ثبت {overrideModal === "in" ? "ورود" : "خروج"} در ساعت {customTime}
          </button>
        </div>
      </Drawer>

      <motion.button
        className={`action ${isRemote ? "action--remote" : "action--office"}`}
        style={{
          width: "100%",
          marginTop: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
        }}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.99 }}
        onClick={onRemoteToggle}
        aria-label="toggle remote"
      >
        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="ico">{isRemote ? <Home size={18} /> : <Building2 size={18} />}</span>
          <span style={{ textAlign: "right" }}>
            <h3 style={{ margin: 0, fontSize: 13 }}>{isRemote ? "🏠 دورکار" : "🏢 حضوری"}</h3>
            <p style={{ margin: 0, fontSize: 11 }}>
              {isRemote ? "امروز دورکاری — بزن حضوری شه" : "امروز حضوری — بزن دورکار شه"}
            </p>
          </span>
        </span>
        <span className={`badge ${isRemote ? "badge-ok" : "badge-muted"}`} style={{ fontSize: 11 }}>
          {isRemote ? "دورکار" : "حضوری"}
        </span>
      </motion.button>
    </div>
  );
}

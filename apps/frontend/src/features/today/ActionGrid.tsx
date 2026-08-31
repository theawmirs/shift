import { useState } from "react";
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
  holidayOptIn?: boolean;
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
  holidayOptIn = false,
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
    if (day_status === "done") return true;
    if (day_status === "holiday" && !holidayOptIn) return true;
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
    if (day_status === "done") {
      return reason || "امروز قبلاً خروج ثبت شده — تا فردا";
    }
    if (day_status === "holiday" && !holidayOptIn) {
      return reason || "امروز تعطیله — با «بله، امروز کار می‌کنم» فعالش کن";
    }
    if (day_status === "holiday" && holidayOptIn) {
      if (k === "out" || k === "leave" || k === "back") return "اول ورود بزن";
      return "";
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
    {
      k: "in",
      title: "ثبت ورود",
      desc: "شروع تایم‌شیت کاری",
      Icon: LogIn,
      bg: "linear-gradient(135deg, #FDE68A, #F59E0B)",
      activeRing: day_status === "idle" || (day_status === "holiday" && holidayOptIn),
    },
    {
      k: "out",
      title: "ثبت خروج",
      desc: "اتمام کار و گزارش",
      Icon: LogOut,
      bg: "#FFFFFF",
      activeRing: day_status === "working" && !leave_open,
    },
    {
      k: "leave",
      title: "مرخصی ساعتی",
      desc: "توقف موقت محاسبه کارکرد",
      Icon: Coffee,
      bg: "linear-gradient(135deg, #C7D2FE, #818CF8)",
      activeRing: day_status === "working" && !leave_open,
    },
    {
      k: "back",
      title: "بازگشت از مرخصی",
      desc: "ادامه روز کاری",
      Icon: Undo2,
      bg: "linear-gradient(135deg, #A7F3D0, #34D399)",
      activeRing: day_status === "on_leave" || leave_open,
    },
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
    <div style={{ display: "grid", gap: 10 }}>
      {/* ── Top Bar: Work Mode Toggle (Office vs Remote) ── */}
      <div
        className="card"
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: isRemote ? "rgba(124, 58, 237, 0.08)" : "rgba(245, 158, 11, 0.08)",
          borderColor: isRemote ? "var(--violet)" : "var(--amber)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: "2px solid #000",
              background: isRemote ? "var(--violet)" : "var(--amber)",
              color: isRemote ? "#fff" : "#0F172A",
              display: "grid",
              placeItems: "center",
              boxShadow: "2px 2px 0 #000",
            }}
          >
            {isRemote ? <Home size={18} /> : <Building2 size={18} />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
              محل حضور: {isRemote ? "دورکاری 🏠" : "حضوری در دفتر 🏢"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {isRemote ? "امروز دورکار ثبت شده‌اید" : "امروز در محل شرکت حاضر هستید"}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost mono"
          style={{
            width: "auto",
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 800,
            borderRadius: 10,
            boxShadow: "2px 2px 0 #000",
          }}
          onClick={onRemoteToggle}
        >
          تغییر به {isRemote ? "حضوری" : "دورکار"}
        </button>
      </div>

      {/* ── 2x2 Main Actions Grid ── */}
      <div className="actions" style={{ gap: 10 }}>
        {items.map((it) => {
          const dis = isDisabled(it.k);
          const t = titleFor(it.k);
          const Icon = it.Icon;

          return (
            <button
              key={it.k}
              className="action"
              disabled={dis}
              title={t || undefined}
              aria-disabled={dis}
              style={{
                background: it.bg,
                opacity: dis ? 0.42 : 1,
                pointerEvents: dis ? "none" : "auto",
                cursor: dis ? "not-allowed" : "pointer",
                boxShadow: it.activeRing ? "5px 5px 0 #000" : "3px 3px 0 #000",
                transform: it.activeRing ? "translate(-1px, -1px)" : "none",
                position: "relative",
                overflow: "hidden",
              }}
              onClick={() => {
                if (dis) return;
                handleActionClick(it.k);
              }}
            >
              {it.activeRing && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "#22C55E",
                    boxShadow: "0 0 0 2px #000",
                  }}
                />
              )}

              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  border: "2px solid #000",
                  background: "#fff",
                  color: "#0F172A",
                  boxShadow: "2px 2px 0 #000",
                }}
              >
                <Icon size={18} strokeWidth={2.5} />
              </div>

              <div style={{ textAlign: "right", marginTop: 2 }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{it.title}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(15,23,42,0.72)", lineHeight: 1.4 }}>
                  {it.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Manual Time Overrides ── */}
      {(day_status === "idle" || day_status === "working" || (day_status === "holiday" && holidayOptIn)) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 2 }}>
          <button
            className="btn btn-ghost mono"
            style={{
              padding: "8px 10px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: day_status !== "idle" && !(day_status === "holiday" && holidayOptIn) ? 0.45 : 1,
              pointerEvents: day_status !== "idle" && !(day_status === "holiday" && holidayOptIn) ? "none" : "auto",
              borderRadius: 12,
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
              opacity: day_status !== "working" ? 0.45 : 1,
              pointerEvents: day_status !== "working" ? "none" : "auto",
              borderRadius: 12,
            }}
            onClick={() => setOverrideModal("out")}
          >
            <Clock size={13} /> خروج دستی (ساعت دلخواه)
          </button>
        </div>
      )}

      {/* ── Overtime Decision Modal ── */}
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

      {/* ── Override Time Drawer ── */}
      <Drawer
        open={overrideModal !== null}
        onClose={() => setOverrideModal(null)}
        title={overrideModal === "in" ? "ثبت ورود با ساعت دلخواه" : "ثبت خروج با ساعت دلخواه"}
        height="auto"
      >
        <div style={{ display: "grid", gap: 14, padding: "8px 0" }}>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
            {overrideModal === "in"
              ? "اگر فراموش کردید موقع ورود دکمه را بزنید، ساعت دقیق ورود خود را ثبت کنید:"
              : "اگر فراموش کردید موقع خروج دکمه را بزنید، ساعت دقیق خروج خود را ثبت کنید:"}
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
            style={{ fontWeight: 800, padding: "12px" }}
            onClick={handleManualSubmit}
          >
            ثبت {overrideModal === "in" ? "ورود" : "خروج"} در ساعت {customTime}
          </button>
        </div>
      </Drawer>
    </div>
  );
}

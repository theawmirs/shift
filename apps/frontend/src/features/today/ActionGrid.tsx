import { useState } from "react";
import { Drawer } from "../../shared/ui/Drawer";
import { useToast } from "../../shared/ui/Toast";
import { Clock, LogIn, LogOut, Coffee, ArrowLeft, Building2, Home, Sparkles } from "lucide-react";

export function ActionGrid({
  onAction,
  onRemoteToggle,
  workMode,
  day_status,
  holidayOptIn,
  disabledReason,
  leave_open,
  liveMinutes,
  standardHours = 8,
}: {
  onAction: (k: string, at?: string, otHours?: number) => void;
  onRemoteToggle: () => void;
  workMode?: string;
  day_status?: string;
  holidayOptIn?: boolean;
  day_status_reason?: string | null;
  disabledReason?: string | null;
  leave_open?: boolean;
  liveMinutes?: number;
  standardHours?: number;
}) {
  const { push } = useToast();
  const [overrideModal, setOverrideModal] = useState<"in" | "out" | null>(null);
  const [customTime, setCustomTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  const [otPromptModal, setOtPromptModal] = useState(false);
  const [pendingOutAt, setPendingOutAt] = useState<string | undefined>(undefined);
  const [otHoursInput, setOtHoursInput] = useState("");

  const isRemote = workMode === "remote";
  const isHoliday = day_status === "holiday";
  const isBlockedHoliday = isHoliday && !holidayOptIn;
  const isDone = day_status === "done";
  const isWorking = day_status === "working";
  const isOnLeave = day_status === "on_leave" || !!leave_open;

  const handleInClick = () => {
    if (isBlockedHoliday) {
      push(disabledReason || "امروز تعطیل رسمی است.", "error");
      return;
    }
    if (isDone) {
      push("امروز قبلاً خروج ثبت شده است.", "error");
      return;
    }
    if (isWorking || isOnLeave) {
      push("ورود شما قبلاً ثبت شده است.", "error");
      return;
    }
    onAction("in");
  };

  const handleOutClick = (overrideAt?: string) => {
    if (isBlockedHoliday) {
      push(disabledReason || "امروز تعطیل رسمی است.", "error");
      return;
    }
    if (isDone) {
      push("امروز روز کاری شما پایان یافته است.", "error");
      return;
    }
    if (!isWorking && !isOnLeave) {
      push("ابتدا باید ورود ثبت کنید.", "error");
      return;
    }

    // Check potential overtime
    const currentWorkedHours = (liveMinutes || 0) / 60.0;
    if (currentWorkedHours > standardHours) {
      const extra = Math.max(0, currentWorkedHours - standardHours);
      setOtHoursInput(extra.toFixed(2));
      setPendingOutAt(overrideAt);
      setOtPromptModal(true);
    } else {
      onAction("out", overrideAt, 0);
    }
  };

  const confirmOvertime = () => {
    const ot = parseFloat(otHoursInput) || 0;
    setOtPromptModal(false);
    onAction("out", pendingOutAt, ot);
  };

  const rejectOvertime = () => {
    setOtPromptModal(false);
    onAction("out", pendingOutAt, 0);
  };

  const handleLeaveClick = () => {
    if (isBlockedHoliday) {
      push(disabledReason || "امروز تعطیل رسمی است.", "error");
      return;
    }
    if (isDone) {
      push("امروز کار شما پایان یافته است.", "error");
      return;
    }
    if (!isWorking) {
      push("ابتدا باید ورود ثبت کنید تا بتوانید مرخصی ساعتی بگیرید.", "error");
      return;
    }
    onAction("leave");
  };

  const handleBackClick = () => {
    if (!isOnLeave) {
      push("در حال حاضر در مرخصی ساعتی نیستید.", "error");
      return;
    }
    onAction("back");
  };

  const handleManualSubmit = () => {
    if (!overrideModal || !customTime) return;
    const at = customTime.trim();
    if (overrideModal === "in") {
      onAction("in", at);
    } else {
      handleOutClick(at);
    }
    setOverrideModal(null);
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* ── Main 4-Tile Action Grid ── */}
      <div className="actions">
        {/* Tile 1: Clock In */}
        <div
          className={`action action--in ${!isWorking && !isOnLeave && !isDone ? "active-glow" : ""}`}
          onClick={handleInClick}
          style={{ opacity: isWorking || isOnLeave || isDone || isBlockedHoliday ? 0.6 : 1 }}
        >
          <div className="ico">
            <LogIn size={20} />
          </div>
          <div>
            <h3>ثبت ورود</h3>
            <p>{isWorking || isOnLeave ? "ورود ثبت شده" : "شروع شیفت کاری"}</p>
          </div>
        </div>

        {/* Tile 2: Clock Out */}
        <div
          className="action action--out"
          onClick={() => handleOutClick()}
          style={{ opacity: isWorking || isOnLeave ? 1 : 0.55 }}
        >
          <div className="ico">
            <LogOut size={20} />
          </div>
          <div>
            <h3>ثبت خروج</h3>
            <p>{isDone ? "روز کاری پایان یافت" : "اتمام روز کاری"}</p>
          </div>
        </div>

        {/* Tile 3: Hourly Leave */}
        <div
          className="action action--leave"
          onClick={handleLeaveClick}
          style={{ opacity: isWorking && !isOnLeave ? 1 : 0.55 }}
        >
          <div className="ico">
            <Coffee size={20} />
          </div>
          <div>
            <h3>مرخصی ساعتی</h3>
            <p>{isOnLeave ? "در حال حاضر در مرخصی" : "خروج موقت در روز"}</p>
          </div>
        </div>

        {/* Tile 4: Return from Leave */}
        <div
          className="action action--back"
          onClick={handleBackClick}
          style={{ opacity: isOnLeave ? 1 : 0.55 }}
        >
          <div className="ico">
            <ArrowLeft size={20} />
          </div>
          <div>
            <h3>برگشت از مرخصی</h3>
            <p>{isOnLeave ? "ادامه کار و پایان مرخصی" : "هنوز در مرخصی نیستید"}</p>
          </div>
        </div>
      </div>

      {/* ── Work Mode & Manual Override Controls ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {/* Toggle Work Mode */}
        <button
          type="button"
          onClick={onRemoteToggle}
          className="btn btn-ghost mono"
          style={{
            padding: "10px 12px",
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: "2px 2px 0 #000",
            background: isRemote ? "rgba(124, 58, 237, 0.08)" : "#fff",
            borderColor: isRemote ? "var(--violet)" : "#000",
          }}
        >
          {isRemote ? <Home size={15} style={{ color: "var(--violet)" }} /> : <Building2 size={15} />}
          <span>محل حضور: {isRemote ? "دورکاری 🏠" : "حضوری در دفتر 🏢"}</span>
        </button>

        {/* Manual Time Override Trigger */}
        <button
          type="button"
          onClick={() => setOverrideModal(isWorking || isOnLeave ? "out" : "in")}
          className="btn btn-ghost mono"
          style={{
            padding: "10px 12px",
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: "2px 2px 0 #000",
          }}
        >
          <Clock size={15} />
          <span>ورود/خروج دستی (فراموشی)</span>
        </button>
      </div>

      {/* ── Overtime Prompt Dialog ── */}
      <Drawer
        open={otPromptModal}
        onClose={() => setOtPromptModal(false)}
        title="🌟 تایید ساعت اضافه‌کاری"
        height="auto"
      >
        <div style={{ display: "grid", gap: 14, padding: "6px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={20} style={{ color: "var(--amber-2)", flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
              شما بیش از <b>{standardHours} ساعت موظفی</b> کار کرده‌اید! آیا می‌خواهید اضافه‌کاری ثبت شود؟
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>میزان اضافه‌کاری (ساعت):</label>
            <input
              type="number"
              step="0.1"
              value={otHoursInput}
              onChange={(e) => setOtHoursInput(e.target.value)}
              className="input mono"
              style={{ fontSize: 16, fontWeight: 800, textAlign: "center" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={rejectOvertime}
              style={{ fontWeight: 800 }}
            >
              نه، نیاز نیست
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={confirmOvertime}
              style={{ fontWeight: 900 }}
            >
              تایید و ثبت اضافه‌کاری
            </button>
          </div>
        </div>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="mono"
              style={{
                fontSize: 22,
                fontWeight: 900,
                padding: "10px 14px",
                borderRadius: 14,
                border: "2.5px solid #000",
                boxShadow: "3px 3px 0 #000",
                background: "#fff",
                color: "#0F172A",
                textAlign: "center",
                width: "100%",
                maxWidth: "240px",
                boxSizing: "border-box",
                direction: "ltr",
                margin: "0 auto",
                display: "block",
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

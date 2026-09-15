import { useState, useEffect } from "react";
import { LogIn, LogOut, Clock, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { Drawer } from "../../shared/ui/Drawer";
import { Button } from "../../shared/ui/Button";
import { fmtHoursFa, toAsciiDigits } from "../../shared/lib/format";
import { useToast } from "../../shared/ui/Toast";

export interface ManualAttendanceSheetProps {
  open: boolean;
  mode: "in" | "out" | null;
  inTime?: string | null;
  leaveHours?: number;
  standardHours?: number;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (mode: "in" | "out", at: string) => void;
}

function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || !timeStr.includes(":")) return null;
  const clean = toAsciiDigits(timeStr).trim();
  const parts = clean.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function getNowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ManualAttendanceSheet({
  open,
  mode,
  inTime = "—",
  leaveHours = 0,
  standardHours = 8,
  loading = false,
  onClose,
  onSubmit,
}: ManualAttendanceSheetProps) {
  const { push } = useToast();
  const [customTime, setCustomTime] = useState<string>(getNowTimeStr);

  // Re-synchronize time when opening the sheet
  useEffect(() => {
    if (open) {
      setCustomTime(getNowTimeStr());
    }
  }, [open, mode]);

  if (!mode) return null;

  const isEntry = mode === "in";
  const title = isEntry ? "ثبت ورود با ساعت دلخواه" : "ثبت خروج با ساعت دلخواه";
  const description = isEntry
    ? "اگه یادت رفته بود موقع ورود دکمه بزنی، ساعت واقعی ورودت رو وارد کن:"
    : "اگه یادت رفته بود موقع خروج دکمه بزنی، ساعت واقعی خروجت رو وارد کن:";

  const cleanTime = customTime.trim();
  const timeM = parseTimeToMinutes(cleanTime);
  const inM = parseTimeToMinutes(inTime);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Validation flags
  const isFuture = timeM !== null && timeM > nowMinutes + 5;
  const isExitBeforeOrEqualEntry = !isEntry && inM !== null && timeM !== null && timeM <= inM;
  const isValidTime = timeM !== null && !isFuture && (!isExitBeforeOrEqualEntry || isEntry);

  // Live calculation for exit mode
  let effectiveWorkedHours: number | null = null;
  let overtimeHours: number = 0;
  let deficitHours: number = 0;

  if (!isEntry && inM !== null && timeM !== null && timeM > inM) {
    const grossM = Math.max(0, timeM - inM);
    const leaveM = Math.round(leaveHours * 60);
    const netM = Math.max(0, grossM - leaveM);
    effectiveWorkedHours = netM / 60;
    const diffM = Math.round(standardHours * 60 - netM);
    if (diffM < 0) {
      overtimeHours = Math.abs(diffM) / 60;
    } else if (diffM > 0) {
      deficitHours = diffM / 60;
    }
  }

  const handleSetCurrentTime = () => {
    setCustomTime(getNowTimeStr());
  };

  const handleSubmit = () => {
    if (!cleanTime) {
      push("❌ لطفاً ساعت را وارد کنید", "error");
      return;
    }

    if (timeM === null) {
      push("❌ فرمت ساعت نامعتبر است (مثال: 18:00)", "error");
      return;
    }

    if (isFuture) {
      push("❌ ساعت وارد شده نمی‌تواند در آینده باشد", "error");
      return;
    }

    if (isExitBeforeOrEqualEntry) {
      push(`❌ ساعت خروج باید بعد از ساعت ورود (${inTime}) باشد`, "error");
      return;
    }

    onSubmit(mode, cleanTime);
  };

  return (
    <Drawer open={open} onClose={onClose} title={title} height="auto">
      <div dir="rtl" style={{ display: "grid", gap: 14, padding: "8px 0" }}>
        {/* Description Banner */}
        <p style={{ color: "var(--muted)", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          {description}
        </p>

        {/* Reference Context Card (for Exit Mode) */}
        {!isEntry && inTime && inTime !== "—" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              padding: "10px 12px",
              background: "var(--surface-2, var(--card2))",
              border: "2px solid var(--border-strong, #000)",
              borderRadius: 14,
              boxShadow: "2px 2px 0 #000",
              fontSize: 12,
            }}
          >
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>ساعت ورود ثبت‌شده:</span>
              <b className="mono" style={{ display: "block", fontSize: 14, marginTop: 2, color: "var(--text)" }}>
                {inTime}
              </b>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>سقف موظفی استاندارد:</span>
              <b className="mono" style={{ display: "block", fontSize: 14, marginTop: 2, color: "var(--text)" }}>
                {standardHours} ساعت
              </b>
            </div>
          </div>
        )}

        {/* Time Picker & Quick "Now" Button */}
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={14} style={{ color: isEntry ? "#22C55E" : "#EF4444" }} />
              <span>{isEntry ? "ساعت واقعی ورود:" : "ساعت واقعی خروج:"}</span>
            </label>
            <button
              type="button"
              className="mono"
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--amber-2)",
                cursor: "pointer",
              }}
              onClick={handleSetCurrentTime}
            >
              تنظیم روی ساعت الان
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="mono"
              style={{
                fontSize: 22,
                fontWeight: 800,
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
        </div>

        {/* Real-time Validation & Feedback Banners */}
        {cleanTime && isFuture && (
          <div
            className="row"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              borderColor: "#EF4444",
              padding: "9px 12px",
              fontSize: 12,
              fontWeight: 700,
              color: "#EF4444",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircle size={15} style={{ color: "#EF4444", flexShrink: 0 }} />
            <span>ساعت انتخابی نمی‌تواند در آینده باشد.</span>
          </div>
        )}

        {cleanTime && isExitBeforeOrEqualEntry && (
          <div
            className="row"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              borderColor: "#EF4444",
              padding: "9px 12px",
              fontSize: 12,
              fontWeight: 700,
              color: "#EF4444",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircle size={15} style={{ color: "#EF4444", flexShrink: 0 }} />
            <span>ساعت خروج باید بعد از ساعت ورود ({inTime}) باشد.</span>
          </div>
        )}

        {/* Live Calculation Preview for Exit Mode */}
        {!isEntry && effectiveWorkedHours !== null && !isFuture && !isExitBeforeOrEqualEntry && (
          <div
            className="row"
            style={{
              background: overtimeHours > 0 ? "rgba(34, 197, 94, 0.12)" : "rgba(59, 130, 246, 0.10)",
              borderColor: overtimeHours > 0 ? "#22C55E" : "#3B82F6",
              padding: "10px 12px",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text)", fontWeight: 700 }}>
              {overtimeHours > 0 ? (
                <Sparkles size={15} style={{ color: "#22C55E" }} />
              ) : (
                <CheckCircle2 size={15} style={{ color: "#3B82F6" }} />
              )}
              <span>کارکرد تا این ساعت:</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <b className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
                {fmtHoursFa(effectiveWorkedHours)}
              </b>
              {overtimeHours > 0 && (
                <span className="badge badge-ok mono" style={{ fontSize: 10.5 }}>
                  +{fmtHoursFa(overtimeHours)} اضافه
                </span>
              )}
              {deficitHours > 0 && (
                <span className="badge mono" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", border: "1px solid #EF4444", fontSize: 10.5 }}>
                  -{fmtHoursFa(deficitHours)} کسری
                </span>
              )}
            </div>
          </div>
        )}

        {/* Submit Action Button */}
        <Button
          variant="primary"
          style={{ fontWeight: 800, padding: "12px", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          disabled={!isValidTime || loading}
          loading={loading}
          loadingText="در حال ثبت…"
          onClick={handleSubmit}
          icon={isEntry ? <LogIn size={16} /> : <LogOut size={16} />}
        >
          {isEntry
            ? `ثبت ورود در ساعت ${customTime}`
            : `بررسی و ثبت خروج در ساعت ${customTime}`}
        </Button>
      </div>
    </Drawer>
  );
}

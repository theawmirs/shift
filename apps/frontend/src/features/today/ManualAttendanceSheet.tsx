import { useState, useEffect } from "react";
import { LogIn, LogOut, Clock, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { Drawer } from "../../shared/ui/Drawer";
import { Button } from "../../shared/ui/Button";
import { fmtHoursFa, toAsciiDigits, computeOvertimeRange } from "../../shared/lib/format";
import { useToast } from "../../shared/ui/Toast";

export interface ManualAttendanceSheetProps {
  open: boolean;
  onClose: () => void;
  inTime?: string | null;
  day_status?: string | null;
  leaveHours?: number;
  standardHours?: number;
  loading?: boolean;
  onSubmit: (entryTime: string | null, exitTime: string | null) => Promise<void> | void;
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
  onClose,
  inTime = "—",
  day_status: _day_status = "idle",
  leaveHours = 0,
  standardHours = 8,
  loading = false,
  onSubmit,
}: ManualAttendanceSheetProps) {
  const { push } = useToast();

  const hasExistingIn = Boolean(inTime && inTime !== "—");
  const [entryTime, setEntryTime] = useState<string>("");
  const [exitTime, setExitTime] = useState<string>("");

  useEffect(() => {
    if (open) {
      if (hasExistingIn && inTime) {
        setEntryTime(inTime);
      } else {
        setEntryTime(getNowTimeStr());
      }
      setExitTime("");
    }
  }, [open, inTime, hasExistingIn]);

  const cleanEntry = entryTime.trim();
  const cleanExit = exitTime.trim();

  const entryM = parseTimeToMinutes(cleanEntry);
  const exitM = parseTimeToMinutes(cleanExit);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Validation
  const isEntryFuture = entryM !== null && entryM > nowMinutes + 5;
  const isExitFuture = exitM !== null && exitM > nowMinutes + 5;
  const isExitBeforeOrEqualEntry = entryM !== null && exitM !== null && exitM <= entryM;

  // Calculation when both are present
  let netWorkedHours: number | null = null;
  let overtimeHours = 0;
  let deficitHours = 0;
  let otRange: [string, string] | null = null;

  if (entryM !== null && exitM !== null && exitM > entryM) {
    const grossM = exitM - entryM;
    const leaveM = Math.round(leaveHours * 60);
    const netM = Math.max(0, grossM - leaveM);
    netWorkedHours = netM / 60;

    const diffM = Math.round(standardHours * 60 - netM);
    if (diffM < 0) {
      overtimeHours = Math.abs(diffM) / 60;
      otRange = computeOvertimeRange(cleanExit, overtimeHours, cleanEntry);
    } else if (diffM > 0) {
      deficitHours = diffM / 60;
    }
  }

  const isValidToSubmit = Boolean(
    entryM !== null &&
      !isEntryFuture &&
      (!cleanExit || (exitM !== null && !isExitFuture && !isExitBeforeOrEqualEntry))
  );

  const handleSubmit = async () => {
    if (!cleanEntry) {
      push("❌ لطفاً ساعت ورود را مشخص کنید", "error");
      return;
    }

    if (entryM === null) {
      push("❌ فرمت ساعت ورود نامعتبر است (مثال: 09:00)", "error");
      return;
    }

    if (isEntryFuture) {
      push("❌ ساعت ورود نمی‌تواند در آینده باشد", "error");
      return;
    }

    if (cleanExit) {
      if (exitM === null) {
        push("❌ فرمت ساعت خروج نامعتبر است (مثال: 18:00)", "error");
        return;
      }

      if (isExitFuture) {
        push("❌ ساعت خروج نمی‌تواند در آینده باشد", "error");
        return;
      }

      if (isExitBeforeOrEqualEntry) {
        push("❌ ساعت خروج باید بعد از ساعت ورود باشد", "error");
        return;
      }
    }

    await onSubmit(cleanEntry, cleanExit ? cleanExit : null);
  };

  return (
    <Drawer open={open} onClose={onClose} title="ثبت تردد دستی (ورود و خروج)" height="auto">
      <div dir="rtl" style={{ display: "grid", gap: 14, padding: "8px 0" }}>
        {/* Description Banner */}
        <p style={{ color: "var(--muted)", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          اگر ثبت دکمه ورود یا خروج را فراموش کرده‌اید، ساعت‌های دقیق حضور امروز را وارد کنید:
        </p>

        {/* 2-Column Time Input Pickers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Check-In Time (ساعت ورود) */}
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: 11.5, fontWeight: 800, color: "#22C55E", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={13} />
                <span>ساعت ورود</span>
              </label>
              <button
                type="button"
                className="mono"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "0 2px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--amber-2)",
                  cursor: "pointer",
                }}
                onClick={() => setEntryTime(getNowTimeStr())}
              >
                ساعت الان
              </button>
            </div>
            <input
              type="time"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              className="mono"
              style={{
                fontSize: 18,
                fontWeight: 800,
                padding: "10px 8px",
                borderRadius: 12,
                border: "2.5px solid #000",
                boxShadow: "3px 3px 0 #000",
                background: "#fff",
                color: "#0F172A",
                textAlign: "center",
                width: "100%",
                boxSizing: "border-box",
                direction: "ltr",
              }}
            />
          </div>

          {/* Check-Out Time (ساعت خروج - اختیاری) */}
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: 11.5, fontWeight: 800, color: "#EF4444", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={13} />
                <span>ساعت خروج (اختیاری)</span>
              </label>
              <button
                type="button"
                className="mono"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "0 2px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--amber-2)",
                  cursor: "pointer",
                }}
                onClick={() => setExitTime(getNowTimeStr())}
              >
                ساعت الان
              </button>
            </div>
            <input
              type="time"
              value={exitTime}
              placeholder="--:--"
              onChange={(e) => setExitTime(e.target.value)}
              className="mono"
              style={{
                fontSize: 18,
                fontWeight: 800,
                padding: "10px 8px",
                borderRadius: 12,
                border: "2.5px solid #000",
                boxShadow: "3px 3px 0 #000",
                background: "#fff",
                color: "#0F172A",
                textAlign: "center",
                width: "100%",
                boxSizing: "border-box",
                direction: "ltr",
              }}
            />
          </div>
        </div>

        {/* Validation Errors */}
        {cleanEntry && isEntryFuture && (
          <div
            className="row"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              borderColor: "#EF4444",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              color: "#EF4444",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircle size={15} style={{ color: "#EF4444", flexShrink: 0 }} />
            <span>ساعت ورود نمی‌تواند در آینده باشد.</span>
          </div>
        )}

        {cleanExit && isExitFuture && (
          <div
            className="row"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              borderColor: "#EF4444",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              color: "#EF4444",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircle size={15} style={{ color: "#EF4444", flexShrink: 0 }} />
            <span>ساعت خروج نمی‌تواند در آینده باشد.</span>
          </div>
        )}

        {cleanExit && isExitBeforeOrEqualEntry && (
          <div
            className="row"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              borderColor: "#EF4444",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              color: "#EF4444",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircle size={15} style={{ color: "#EF4444", flexShrink: 0 }} />
            <span>ساعت خروج باید بعد از ساعت ورود ({cleanEntry}) باشد.</span>
          </div>
        )}

        {/* Case 1: Both Entry and Exit Valid -> Live Calculated Card */}
        {cleanEntry && cleanExit && netWorkedHours !== null && !isEntryFuture && !isExitFuture && !isExitBeforeOrEqualEntry && (
          <div style={{ display: "grid", gap: 6 }}>
            <div
              className="row"
              style={{
                background: overtimeHours > 0 ? "rgba(34, 197, 94, 0.12)" : "rgba(59, 130, 246, 0.10)",
                borderColor: overtimeHours > 0 ? "#22C55E" : "#3B82F6",
                padding: "10px 12px",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text)", fontWeight: 700, fontSize: 12 }}>
                  {overtimeHours > 0 ? (
                    <Sparkles size={15} style={{ color: "#22C55E" }} />
                  ) : (
                    <CheckCircle2 size={15} style={{ color: "#3B82F6" }} />
                  )}
                  <span>کارکرد خالص محاسبه‌شده:</span>
                </span>
                <b className="mono" style={{ fontSize: 14, color: "var(--text)" }}>
                  {fmtHoursFa(netWorkedHours)}
                </b>
              </div>

              {overtimeHours > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11.5,
                    borderTop: "1px dashed rgba(34, 197, 94, 0.3)",
                    paddingTop: 6,
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>اضافه‌کاری:</span>
                  <b className="mono" style={{ color: "#22C55E" }}>
                    +{fmtHoursFa(overtimeHours)} {otRange ? `(از ${otRange[0]} تا ${otRange[1]})` : ""}
                  </b>
                </div>
              )}

              {deficitHours > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11.5,
                    borderTop: "1px dashed rgba(245, 158, 11, 0.3)",
                    paddingTop: 6,
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>کسری موظفی:</span>
                  <b className="mono" style={{ color: "var(--amber-2)" }}>
                    -{fmtHoursFa(deficitHours)}
                  </b>
                </div>
              )}
            </div>

            <small style={{ color: "var(--muted)", fontSize: 11, textAlign: "center" }}>
              ⚠️ با ثبت ساعت خروج، روز کاری امروز بسته خواهد شد.
            </small>
          </div>
        )}

        {/* Case 2: Only Entry Specified (Exit Empty) */}
        {cleanEntry && !cleanExit && !isEntryFuture && (
          <div
            className="row"
            style={{
              background: "var(--surface-2, var(--card2))",
              borderColor: "var(--border)",
              padding: "10px 12px",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Clock size={15} style={{ color: "#3B82F6", flexShrink: 0 }} />
            <span style={{ color: "var(--text)", lineHeight: 1.6 }}>
              {hasExistingIn ? (
                <>
                  ساعت ورود فعلی <b className="mono">{inTime}</b> است. با ثبت، به <b className="mono" style={{ color: "#22C55E" }}>{cleanEntry}</b> تغییر می‌یابد و شیفت کاری ادامه خواهد داشت.
                </>
              ) : (
                <>
                  ساعت ورود شما در <b className="mono" style={{ color: "#22C55E" }}>{cleanEntry}</b> ثبت شده و شیفت کاری آغاز می‌گردد.
                </>
              )}
            </span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          variant="primary"
          style={{ fontWeight: 800, padding: "12px", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          disabled={!isValidToSubmit || loading}
          loading={loading}
          loadingText="در حال ثبت…"
          onClick={handleSubmit}
          icon={cleanExit ? <LogOut size={16} /> : <LogIn size={16} />}
        >
          {cleanExit
            ? `ثبت تردد و بستن روز (${cleanEntry} تا ${cleanExit})`
            : hasExistingIn
            ? `ذخیره ویرایش ساعت ورود (${cleanEntry})`
            : `ثبت ورود در ساعت ${cleanEntry}`}
        </Button>
      </div>
    </Drawer>
  );
}

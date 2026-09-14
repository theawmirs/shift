import { useState } from "react";
import { Coffee, Clock, Trash2, AlertCircle, Sparkles, ArrowLeftRight } from "lucide-react";
import { Drawer } from "../../shared/ui/Drawer";
import { Button } from "../../shared/ui/Button";
import { useToast } from "../../shared/ui/Toast";
import { fmtHoursFa, toAsciiDigits } from "../../shared/lib/format";
import { useAddManualHourlyLeaveMutation, useDeleteManualHourlyLeaveMutation } from "../../shared/api/queries";

export interface ManualHourlyLeaveSheetProps {
  open: boolean;
  onClose: () => void;
  inTime?: string;
  outTime?: string | null;
  leaveIntervals?: [string, string][];
  onSuccess?: () => void;
}

function parseM(t?: string | null): number | null {
  if (!t || !t.includes(":")) return null;
  const clean = toAsciiDigits(t).trim();
  const parts = clean.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function ManualHourlyLeaveSheet({
  open,
  onClose,
  inTime = "—",
  outTime = null,
  leaveIntervals = [],
  onSuccess,
}: ManualHourlyLeaveSheetProps) {
  const { push } = useToast();
  const addMutation = useAddManualHourlyLeaveMutation();
  const deleteMutation = useDeleteManualHourlyLeaveMutation();

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const startM = parseM(startTime);
  const endM = parseM(endTime);
  const isValidDiff = startM !== null && endM !== null && endM > startM;
  const diffMinutes = isValidDiff ? endM - startM : 0;

  const handleSubmit = async () => {
    if (!startTime || !endTime) {
      push("❌ لطفاً هم ساعت خروج و هم ساعت ورود مرخصی را وارد کنید", "error");
      return;
    }

    if (startM === null || endM === null) {
      push("❌ فرمت ساعت نامعتبر است (مثال: 12:30)", "error");
      return;
    }

    if (endM <= startM) {
      push("❌ ساعت ورود (پایان مرخصی) باید بعد از ساعت خروج (شروع مرخصی) باشد", "error");
      return;
    }

    const inM = parseM(inTime);
    if (inM !== null && startM < inM) {
      push(`❌ ساعت خروج به مرخصی (${startTime}) نمی‌تواند قبل از ساعت ورود به شرکت (${inTime}) باشد`, "error");
      return;
    }

    const outM = parseM(outTime);
    if (outM !== null && endM > outM) {
      push(`❌ ساعت پایان مرخصی (${endTime}) نمی‌تواند بعد از ساعت خروج از شرکت (${outTime}) باشد`, "error");
      return;
    }

    try {
      const res = await addMutation.mutateAsync({
        start_time: startTime.trim(),
        end_time: endTime.trim(),
        note: note.trim() || undefined,
      });
      push(res.message || `✅ مرخصی ساعتی از ${startTime} تا ${endTime} ثبت شد`);
      setStartTime("");
      setEndTime("");
      setNote("");
      onSuccess?.();
      onClose();
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    }
  };

  const handleDelete = async (inv: [string, string]) => {
    const key = `${inv[0]}-${inv[1]}`;
    setDeletingKey(key);
    try {
      const res = await deleteMutation.mutateAsync({
        start_time: inv[0],
        end_time: inv[1],
      });
      push(res.message || `🗑 مرخصی ساعتی از ${inv[0]} تا ${inv[1]} حذف شد`);
      onSuccess?.();
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="ثبت مرخصی ساعتی دستی" height="85vh">
      <div dir="rtl" style={{ display: "grid", gap: 14 }}>
        {/* Description Banner */}
        <p style={{ color: "var(--muted)", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          اگر در طول روز برای کار شخصی از شرکت خارج شدید و دکمه مرخصی را ثبت نکردید، ساعت دقیق <b>خروج</b> و <b>ورود مجدد</b> را وارد کنید:
        </p>

        {/* Attendance Reference Card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            padding: "10px 12px",
            background: "var(--card2)",
            border: "2px solid #000",
            borderRadius: 14,
            boxShadow: "2px 2px 0 #000",
            fontSize: 12,
          }}
        >
          <div>
            <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>ساعت ورود به شرکت:</span>
            <b className="mono" style={{ display: "block", fontSize: 14, marginTop: 2, color: "var(--text)" }}>
              {inTime || "—"}
            </b>
          </div>
          <div>
            <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>وضعیت خروج از شرکت:</span>
            <b className="mono" style={{ display: "block", fontSize: 14, marginTop: 2, color: outTime ? "var(--text)" : "var(--green, #22c55e)" }}>
              {outTime ? outTime : "در حال کار 🟢"}
            </b>
          </div>
        </div>

        {/* Entry & Exit Time Pickers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Leave Start Time (خروج به مرخصی) */}
          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "var(--red, #ef4444)", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={13} />
              <span>ساعت خروج (شروع مرخصی)</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
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

          {/* Leave End Time (ورود / بازگشت از مرخصی) */}
          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "var(--green, #22c55e)", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={13} />
              <span>ساعت ورود (پایان مرخصی)</span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
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

        {/* Live Duration Calculation Badge */}
        {startTime && endTime && (
          <div>
            {isValidDiff ? (
              <div
                className="row"
                style={{
                  background: "rgba(34, 197, 94, 0.10)",
                  borderColor: "var(--green, #22c55e)",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "var(--green, #166534)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={15} style={{ color: "var(--green)" }} />
                <span>مدت زمان مرخصی:</span>
                <b className="mono" style={{ fontSize: 13 }}>
                  {fmtHoursFa(diffMinutes / 60)}
                </b>
              </div>
            ) : (
              <div
                className="row"
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  borderColor: "var(--red, #ef4444)",
                  padding: "8px 12px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--red, #b91c1c)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AlertCircle size={14} style={{ color: "var(--red)" }} />
                <span>ساعت ورود (پایان مرخصی) باید بعد از ساعت خروج باشد.</span>
              </div>
            )}
          </div>
        )}

        {/* Optional Note Field */}
        <div style={{ display: "grid", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
            توضیحات یا دلیل (اختیاری)
          </label>
          <input
            type="text"
            placeholder="مثلاً: کار اداری، مراجعه به پزشک"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            maxLength={100}
            style={{ fontSize: 12, padding: "8px 12px" }}
          />
        </div>

        {/* Submit Button */}
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={addMutation.isPending}
          loadingText="در حال ثبت مرخصی…"
          style={{ padding: "12px", fontWeight: 800, fontSize: 13 }}
        >
          ثبت مرخصی ساعتی
        </Button>

        {/* ── List of Today's Existing Hourly Leaves ── */}
        {leaveIntervals && leaveIntervals.length > 0 && (
          <div style={{ marginTop: 6, borderTop: "2px solid rgba(0,0,0,0.08)", paddingTop: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                <Coffee size={14} style={{ color: "var(--amber-2)" }} />
                <span>مرخصی‌های ساعتی امروز</span>
              </span>
              <span className="badge badge-muted mono" style={{ fontSize: 10 }}>
                {leaveIntervals.length} بازه
              </span>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              {leaveIntervals.map((inv: [string, string], idx: number) => {
                const sM = parseM(inv[0]);
                const eM = parseM(inv[1]);
                const durH = sM !== null && eM !== null && eM > sM ? (eM - sM) / 60 : null;
                const isDeleting = deletingKey === `${inv[0]}-${inv[1]}`;

                return (
                  <div
                    key={idx}
                    className="row"
                    style={{
                      padding: "8px 12px",
                      background: "var(--card)",
                      borderColor: "var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                      <span className="mono" style={{ color: "var(--red, #ef4444)", fontWeight: 800 }}>
                        خروج: {inv[0]}
                      </span>
                      <ArrowLeftRight size={13} style={{ color: "var(--muted)", opacity: 0.6 }} />
                      <span className="mono" style={{ color: "var(--green, #22c55e)", fontWeight: 800 }}>
                        ورود: {inv[1]}
                      </span>
                      {durH !== null && (
                        <span className="badge mono" style={{ fontSize: 10, padding: "2px 6px" }}>
                          {fmtHoursFa(durH)}
                        </span>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mono"
                      style={{ padding: "4px 8px", width: "auto", fontSize: 11 }}
                      loading={isDeleting}
                      onClick={() => handleDelete(inv)}
                      icon={<Trash2 size={13} style={{ color: "var(--red, #ef4444)" }} />}
                      title="حذف این مرخصی"
                    >
                      حذف
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

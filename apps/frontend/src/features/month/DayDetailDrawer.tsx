import { useState, useEffect } from "react";
import { Drawer } from "../../shared/ui/Drawer";
import { fmtHoursFa, formatShamsiDateText } from "../../shared/lib/format";
import { Edit3, Building2, Home, Trash2, AlertTriangle } from "lucide-react";
import { API } from "../../shared/lib/api";
import { useToast } from "../../shared/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";

export interface DayDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  day: any | null;
  onUpdated?: (updatedDay?: any) => void;
}

export function DayDetailDrawer({ open, onClose, day, onUpdated }: DayDetailDrawerProps) {
  const { push } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [inTime, setInTime] = useState("");
  const [outTime, setOutTime] = useState("");
  const [leaveHours, setLeaveHours] = useState("0");
  const [overtimeHours, setOvertimeHours] = useState("0");
  const [workMode, setWorkMode] = useState<"office" | "remote">("office");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (day) {
      setIsEditing(false);
      setShowConfirmDelete(false);
      setInTime(day.in || "");
      setOutTime(day.out || "");
      setLeaveHours(String(day.leave || 0));
      setOvertimeHours(String(day.overtime || 0));
      setWorkMode(day.work_mode === "remote" ? "remote" : "office");
      setNotes(day.note || "");
    }
  }, [day]);

  if (!day) return null;

  const dateFormatted = formatShamsiDateText(day.date);
  const title = day.label || (day.date ? `جزئیات ${dateFormatted}` : "جزئیات روز");

  // Format helpers
  const fmtH = (val: any) => {
    if (val == null || Number(val) === 0) return null;
    return fmtHoursFa(val);
  };

  const hasIn = Boolean(day.in);
  const hasOut = Boolean(day.out);
  const hasLeaveIntervals = Array.isArray(day.leave_intervals) && day.leave_intervals.length > 0;
  const hasGross = day.gross != null && Number(day.gross) > 0;
  const hasNet = day.net != null && Number(day.net) > 0;
  const hasOvertime = day.overtime != null && Number(day.overtime) > 0;
  const hasDeficit = day.deficit != null && Number(day.deficit) > 0;
  const hasLate = day.late != null && Number(day.late) > 0;
  const hasWork = hasIn || hasOut || hasNet || hasGross || Boolean(day.has_events);
  const standardHours = 8;

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const res = await API.editDay({
        date: day.date,
        in_time: inTime.trim() || null,
        out_time: outTime.trim() || null,
        leave_hours: parseFloat(leaveHours) || 0,
        overtime_hours: parseFloat(overtimeHours) || 0,
        work_mode: workMode,
        notes: notes.trim() || null,
      });
      push(`✅ ساعت کاری تاریخ ${dateFormatted} ذخیره شد`);
      queryClient.invalidateQueries();
      setIsEditing(false);
      onUpdated?.(res.day);
      onClose();
    } catch (e: any) {
      push(`❌ خطا در ذخیره: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      const res = await API.editDay({
        date: day.date,
        in_time: null,
        out_time: null,
        leave_hours: 0,
        overtime_hours: 0,
        work_mode: "office",
        notes: null,
      });
      push(`🗑 ساعات کاری تاریخ ${dateFormatted} پاک شد`);
      queryClient.invalidateQueries();
      setIsEditing(false);
      setShowConfirmDelete(false);
      onUpdated?.(res.day);
      onClose();
    } catch (e: any) {
      push(`❌ خطا: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Drawer open={open} onClose={onClose} title={title}>
        <div style={{ display: "grid", gap: 10 }}>
          {/* ── EDIT FORM VIEW ── */}
          {isEditing ? (
            <div style={{ display: "grid", gap: 12, padding: "4px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <b style={{ fontSize: 13 }}>ویرایش مشخصات روز</b>
                <button
                  className="btn btn-ghost mono"
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                  }}
                  onClick={() => setIsEditing(false)}
                >
                  انصراف
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>ساعت ورود:</span>
                  <input
                    type="time"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    className="mono"
                    style={{ width: "100%", padding: "8px 10px", fontSize: 14, textAlign: "center" }}
                  />
                </label>

                <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>ساعت خروج:</span>
                  <input
                    type="time"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    className="mono"
                    style={{ width: "100%", padding: "8px 10px", fontSize: 14, textAlign: "center" }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>مرخصی ساعتی (ساعت):</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="12"
                    value={leaveHours}
                    onChange={(e) => setLeaveHours(e.target.value)}
                    className="mono"
                    placeholder="0"
                    style={{ width: "100%", padding: "8px 10px", fontSize: 14, textAlign: "center" }}
                  />
                </label>

                <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>اضافه‌کاری (ساعت):</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="12"
                    value={overtimeHours}
                    onChange={(e) => setOvertimeHours(e.target.value)}
                    className="mono"
                    placeholder="0"
                    style={{ width: "100%", padding: "8px 10px", fontSize: 14, textAlign: "center" }}
                  />
                </label>
              </div>

              {/* Work Mode Selector */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 2px" }}>
                <span style={{ fontSize: 12, fontWeight: 800 }}>نحوه حضور:</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className={`btn ${workMode === "office" ? "btn-primary" : "btn-ghost"}`}
                    style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                    onClick={() => setWorkMode("office")}
                  >
                    <Building2 size={13} /> حضوری
                  </button>
                  <button
                    type="button"
                    className={`btn ${workMode === "remote" ? "btn-primary" : "btn-ghost"}`}
                    style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                    onClick={() => setWorkMode("remote")}
                  >
                    <Home size={13} /> دورکار
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2, padding: "10px", fontWeight: 800, fontSize: 13 }}
                  onClick={handleSaveEdit}
                  disabled={loading}
                >
                  {loading ? "در حال ذخیره..." : "ذخیره ساعت کاری"}
                </button>

                {hasWork && (
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1, padding: "10px", color: "var(--red)", borderColor: "var(--red)" }}
                    onClick={() => setShowConfirmDelete(true)}
                    disabled={loading}
                    title="حذف کامل ثبت کارکرد این روز"
                  >
                    <Trash2 size={15} /> پاک‌کردن
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ── READ-ONLY SUMMARY VIEW ── */
            <>
              {/* Status and Action Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="badge badge-muted mono" style={{ fontSize: 12 }}>
                    {day.day_status_label || (day.is_holiday ? "تعطیل (کاری)" : "کاری")}
                  </span>
                  {day.work_mode === "remote" && (
                    <span className="badge" style={{ background: "#DDD6FE", color: "#4C1D95", borderColor: "#000" }}>
                      🏠 دورکار
                    </span>
                  )}
                  {day.is_holiday && hasWork && (
                    <span className="badge badge-warn">
                      ⚡ کار در تعطیلی
                    </span>
                  )}
                </div>

                {/* Polished Edit Button with Auto Width */}
                <button
                  className="btn btn-ghost mono"
                  style={{
                    width: "auto",
                    padding: "5px 10px",
                    fontSize: 11,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    borderRadius: 10,
                    boxShadow: "2px 2px 0 #000",
                  }}
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 size={12} />
                  <span>{hasWork ? "ویرایش" : "ثبت کارکرد"}</span>
                </button>
              </div>

              {/* Holiday Banner if holiday */}
              {day.is_holiday && (
                <div className="row" style={{ borderColor: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
                  <b>مناسبت تعطیلی</b>
                  <span className="mono" style={{ fontWeight: 800, color: "#dc2626" }}>
                    {day.holiday_name || "تعطیلی رسمی / جمعه"}
                  </span>
                </div>
              )}

              {/* No work recorded message */}
              {!hasWork && !day.daily_leave && (
                <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "14px 0" }}>
                  {day.is_holiday ? "در این روز تعطیل کارکردی ثبت نشده است." : "ثبت کاری برای این روز وجود ندارد."}
                </div>
              )}

              {/* Check-in (ورود) */}
              {hasIn && (
                <div className="row">
                  <b>ورود</b>
                  <span className="mono" style={{ fontWeight: 800 }}>
                    {day.in}
                  </span>
                </div>
              )}

              {/* Check-out (خروج) */}
              {hasOut && (
                <div className="row">
                  <b>خروج</b>
                  <span className="mono" style={{ fontWeight: 800 }}>
                    {day.out}
                  </span>
                </div>
              )}

              {/* Hourly Leave Start/Return (مرخصی ساعتی) */}
              {hasLeaveIntervals && (
                <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <b>مرخصی ساعتی</b>
                    <span className="mono">{fmtH(day.leave) || "—"}</span>
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {day.leave_intervals.map((inv: [string, string], idx: number) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
                        <span>بازه {idx + 1}:</span>
                        <span className="mono">{inv[0]} تا {inv[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Duration (کارکرد کل / ناخالص) */}
              {hasGross && (
                <div className="row">
                  <b>کارکرد کل (ناخالص)</b>
                  <span className="mono">{fmtH(day.gross)}</span>
                </div>
              )}

              {/* Net Duration (کارکرد خالص) */}
              {hasNet && (
                <div className="row">
                  <b>کارکرد خالص</b>
                  <span className="mono" style={{ fontWeight: 800 }}>
                    {fmtH(day.net)}
                  </span>
                </div>
              )}

              {/* Regular Hours (ساعت موظفی) */}
              {!day.is_holiday && hasWork && (
                <div className="row">
                  <b>ساعت موظفی</b>
                  <span className="mono">{standardHours} ساعت</span>
                </div>
              )}

              {/* Overtime Hours (اضافه‌کاری) */}
              {hasOvertime && (
                <div className="row" style={{ borderColor: "var(--green)", background: "rgba(16,185,129,0.06)" }}>
                  <b>اضافه‌کاری</b>
                  <span className="mono" style={{ fontWeight: 800, color: "var(--green)" }}>
                    {fmtH(day.overtime)}
                  </span>
                </div>
              )}

              {/* Deficit Hours (کسری کار) */}
              {hasDeficit && (
                <div className="row" style={{ borderColor: "var(--red)", background: "rgba(239,68,68,0.06)" }}>
                  <b>کسری کار</b>
                  <span className="mono" style={{ fontWeight: 800, color: "var(--red)" }}>
                    {fmtH(day.deficit)}
                  </span>
                </div>
              )}

              {/* Late (تأخیر) */}
              {hasLate && (
                <div className="row" style={{ borderColor: "var(--red)" }}>
                  <b>تأخیر</b>
                  <span className="mono" style={{ fontWeight: 800, color: "var(--red)" }}>
                    {fmtH(day.late)}
                  </span>
                </div>
              )}

              {/* Daily Leave details if any */}
              {day.daily_leave && (
                <div className="row" style={{ background: "rgba(96,165,250,.08)", borderColor: "#60a5fa" }}>
                  <b>مرخصی روزانه</b>
                  <span className="mono" style={{ fontSize: 12 }}>
                    {day.daily_leave.label || day.daily_leave.type} ({day.daily_leave.hours || 8} ساعت)
                    {day.daily_leave.reason ? ` · ${day.daily_leave.reason}` : ""}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </Drawer>

      {/* ── CUSTOM BRUTALIST CONFIRMATION DRAWER ── */}
      <Drawer
        open={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        title="تأیید حذف کارکرد"
        height="auto"
      >
        <div style={{ display: "grid", gap: 14, padding: "8px 0" }}>
          <div
            className="row"
            style={{
              borderColor: "var(--red)",
              background: "rgba(239,68,68,0.08)",
              flexDirection: "column",
              alignItems: "stretch",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--red)" }}>
              <AlertTriangle size={20} />
              <b style={{ fontSize: 14 }}>آیا مطمئن هستید؟</b>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              تمام ساعات ورود، خروج، مرخصی و اضافه‌کاری ثبت‌شده برای تاریخ <b>{dateFormatted}</b> به طور کامل حذف خواهد شد.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ padding: "10px", fontSize: 12 }}
              onClick={() => setShowConfirmDelete(false)}
              disabled={loading}
            >
              انصراف
            </button>
            <button
              className="btn btn-primary"
              style={{
                padding: "10px",
                fontSize: 12,
                fontWeight: 800,
                background: "#EF4444",
                borderColor: "#000",
                color: "#fff",
              }}
              onClick={handleConfirmDelete}
              disabled={loading}
            >
              {loading ? "در حال حذف..." : "بله، حذف کن"}
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}

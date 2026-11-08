import { useState, useEffect } from "react";
import { Drawer } from "../../shared/ui/Drawer";
import { Button } from "../../shared/ui/Button";
import { fmtHoursFa, formatShamsiDateText, computeOvertimeRange } from "../../shared/lib/format";
import { Edit3, Building2, Home, Trash2, AlertTriangle, Palmtree, Zap, Moon, Clock, Plus } from "lucide-react";
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

  const [activeDay, setActiveDay] = useState<any | null>(day);
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

  // Daily leave states
  const [editTab, setEditTab] = useState<"work" | "overtime" | "leave">("work");
  const [leaveType, setLeaveType] = useState<string>("annual");
  const [leaveReason, setLeaveReason] = useState("");

  // Separate Overtime Session states
  const [otStartTime, setOtStartTime] = useState("");
  const [otEndTime, setOtEndTime] = useState("");
  const [otMode, setOtMode] = useState<"office" | "remote">("remote");
  const [otDesc, setOtDesc] = useState("");

  const computeOtPreview = () => {
    if (!otStartTime || !otEndTime) return null;
    const [sh, sm] = otStartTime.split(":").map(Number);
    const [eh, em] = otEndTime.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    if (startM === endM) return { hours: 0, isOvernight: false };
    const isOvernight = endM < startM;
    const durM = isOvernight ? (endM + 24 * 60) - startM : endM - startM;
    const hours = Math.round((durM / 60) * 100) / 100;
    return { hours, isOvernight };
  };

  useEffect(() => {
    if (day) {
      setActiveDay(day);
      setIsEditing(false);
      setShowConfirmDelete(false);
      setInTime(day.in || "");
      setOutTime(day.out || "");
      setLeaveHours(String(day.leave || 0));
      setOvertimeHours(String(day.overtime || 0));
      setWorkMode(day.work_mode === "remote" ? "remote" : "office");
      setNotes(day.note || "");
      if (day.daily_leave) {
        setEditTab("leave");
        setLeaveType(day.daily_leave.type || "annual");
        setLeaveReason(day.daily_leave.reason || "");
      } else {
        setEditTab("work");
        setLeaveType("annual");
        setLeaveReason("");
      }
    }
  }, [day]);

  const currentDay = day || activeDay;

  const dateFormatted = currentDay?.date ? formatShamsiDateText(currentDay.date) : "";
  const title = currentDay?.label || (currentDay?.date ? `جزئیات ${dateFormatted}` : "جزئیات روز");

  // Format helpers
  const fmtH = (val: any) => {
    if (val == null || Number(val) === 0) return null;
    return fmtHoursFa(val);
  };

  const hasIn = Boolean(currentDay?.in);
  const hasOut = Boolean(currentDay?.out);
  const hasLeaveIntervals = Array.isArray(currentDay?.leave_intervals) && currentDay.leave_intervals.length > 0;
  const hasGross = currentDay?.gross != null && Number(currentDay.gross) > 0;
  const hasNet = currentDay?.net != null && Number(currentDay.net) > 0;
  const hasOvertime = currentDay?.overtime != null && Number(currentDay.overtime) > 0;
  const hasDeficit = currentDay?.deficit != null && Number(currentDay.deficit) > 0;
  const hasLate = currentDay?.late != null && Number(currentDay.late) > 0;
  const hasOtSessions = Array.isArray(currentDay?.overtime_sessions) && currentDay.overtime_sessions.length > 0;
  const hasWork = hasIn || hasOut || hasNet || hasGross || Boolean(currentDay?.has_events) || hasOtSessions;
  const standardHours = 8;
  const otRange = currentDay?.overtime_interval || computeOvertimeRange(currentDay?.out, currentDay?.overtime, currentDay?.in);

  const handleSaveEdit = async () => {
    if (!currentDay) return;
    setLoading(true);
    try {
      const res = await API.editDay({
        date: currentDay.date,
        in_time: inTime.trim() || null,
        out_time: outTime.trim() || null,
        leave_hours: parseFloat(leaveHours) || 0,
        overtime_hours: parseFloat(overtimeHours) || 0,
        work_mode: workMode,
        notes: notes.trim() || null,
      });
      await queryClient.invalidateQueries();
      push(`✅ ساعت کاری تاریخ ${dateFormatted} ذخیره شد`);
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
    if (!currentDay) return;
    setLoading(true);
    try {
      const res = await API.editDay({
        date: currentDay.date,
        in_time: null,
        out_time: null,
        leave_hours: 0,
        overtime_hours: 0,
        work_mode: "office",
        notes: null,
      });
      await queryClient.invalidateQueries();
      push(`🗑 ساعات کاری تاریخ ${dateFormatted} پاک شد`);
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

  const handleSaveDailyLeave = async () => {
    if (!currentDay) return;
    setLoading(true);
    try {
      if (currentDay.daily_leave?.id) {
        await API.deleteDailyLeave(currentDay.daily_leave.id);
      }
      await API.createDailyLeave({
        date: currentDay.date,
        end_date: currentDay.date,
        type: leaveType,
        reason: leaveReason.trim() || undefined,
      });
      await queryClient.invalidateQueries();
      push(`🌴 مرخصی روزانه تاریخ ${dateFormatted} با موفقیت ثبت شد`);
      setIsEditing(false);
      onUpdated?.();
      onClose();
    } catch (e: any) {
      push(`❌ خطا در ثبت مرخصی: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDailyLeave = async () => {
    if (!currentDay?.daily_leave?.id) return;
    setLoading(true);
    try {
      await API.deleteDailyLeave(currentDay.daily_leave.id);
      await queryClient.invalidateQueries();
      push(`🗑 مرخصی روزانه تاریخ ${dateFormatted} حذف شد`);
      setIsEditing(false);
      onUpdated?.();
      onClose();
    } catch (e: any) {
      push(`❌ خطا در حذف مرخصی: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOtSession = async () => {
    if (!currentDay || !otStartTime || !otEndTime) return;
    setLoading(true);
    try {
      await API.createOvertimeSession({
        date: currentDay.date,
        start_time: otStartTime.trim(),
        end_time: otEndTime.trim(),
        mode: otMode,
        description: otDesc.trim() || undefined,
      });
      await queryClient.invalidateQueries();
      push(`⚡ بازه اضافه‌کاری تاریخ ${dateFormatted} ثبت شد`);
      setOtStartTime("");
      setOtEndTime("");
      setOtDesc("");
      setIsEditing(false);
      onUpdated?.();
      onClose();
    } catch (e: any) {
      push(`❌ خطا در ثبت اضافه‌کاری: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOtSession = async (sid: number) => {
    setLoading(true);
    try {
      await API.deleteOvertimeSession(sid);
      await queryClient.invalidateQueries();
      push(`🗑 بازه اضافه‌کاری حذف شد`);
      onUpdated?.();
    } catch (e: any) {
      push(`❌ خطا در حذف اضافه‌کاری: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Drawer open={open} onClose={onClose} title={title}>
        {currentDay && (
          <div style={{ display: "grid", gap: 10 }}>
            {/* ── EDIT FORM VIEW ── */}
            {isEditing ? (
              <div style={{ display: "grid", gap: 12, padding: "4px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <b style={{ fontSize: 13 }}>ویرایش مشخصات روز</b>
                  <button
                    type="button"
                    className="btn btn-ghost mono"
                    style={{
                      width: "auto",
                      padding: "4px 12px",
                      fontSize: 11,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    onClick={() => setIsEditing(false)}
                  >
                    انصراف
                  </button>
                </div>

                {/* ── MODE SWITCH: WORK HOURS vs OVERTIME vs DAILY LEAVE ── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 4,
                    background: "var(--surface-3, #f1f5f9)",
                    padding: 3,
                    borderRadius: 10,
                    border: "1.5px solid var(--border-strong, #000)",
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    style={{
                      padding: "7px 4px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: editTab === "work" ? "var(--surface, #fff)" : "transparent",
                      color: editTab === "work" ? "var(--text, #0f172a)" : "var(--muted, #64748b)",
                      border: editTab === "work" ? "1.5px solid #000" : "1.5px solid transparent",
                      boxShadow: editTab === "work" ? "1.5px 1.5px 0 #000" : "none",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      cursor: "pointer",
                    }}
                    onClick={() => setEditTab("work")}
                  >
                    <Building2 size={12} /> ساعت کاری
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      padding: "7px 4px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: editTab === "overtime" ? "var(--surface, #fff)" : "transparent",
                      color: editTab === "overtime" ? "var(--text, #0f172a)" : "var(--muted, #64748b)",
                      border: editTab === "overtime" ? "1.5px solid #000" : "1.5px solid transparent",
                      boxShadow: editTab === "overtime" ? "1.5px 1.5px 0 #000" : "none",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      cursor: "pointer",
                    }}
                    onClick={() => setEditTab("overtime")}
                  >
                    <Zap size={12} /> اضافه کار مجزا
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      padding: "7px 4px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: editTab === "leave" ? "var(--surface, #fff)" : "transparent",
                      color: editTab === "leave" ? "var(--text, #0f172a)" : "var(--muted, #64748b)",
                      border: editTab === "leave" ? "1.5px solid #000" : "1.5px solid transparent",
                      boxShadow: editTab === "leave" ? "1.5px 1.5px 0 #000" : "none",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      cursor: "pointer",
                    }}
                    onClick={() => setEditTab("leave")}
                  >
                    <Palmtree size={12} /> مرخصی
                  </button>
                </div>

                {editTab === "work" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800 }}>ساعت ورود:</span>
                        <input
                          type="time"
                          value={inTime}
                          onChange={(e) => setInTime(e.target.value)}
                          className="mono input"
                          style={{ width: "100%", padding: "8px 10px", fontSize: 14, textAlign: "center", direction: "ltr" }}
                        />
                      </label>

                      <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800 }}>ساعت خروج:</span>
                        <input
                          type="time"
                          value={outTime}
                          onChange={(e) => setOutTime(e.target.value)}
                          className="mono input"
                          style={{ width: "100%", padding: "8px 10px", fontSize: 14, textAlign: "center", direction: "ltr" }}
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
                      <Button
                        variant="primary"
                        style={{ flex: 2, padding: "10px", fontWeight: 800, fontSize: 13 }}
                        onClick={handleSaveEdit}
                        loading={loading}
                        loadingText="در حال ذخیره…"
                      >
                        ذخیره ساعت کاری
                      </Button>

                      {hasWork && (
                        <Button
                          variant="ghost"
                          style={{ flex: 1, padding: "10px", color: "var(--red)", borderColor: "var(--red)" }}
                          onClick={() => setShowConfirmDelete(true)}
                          disabled={loading}
                          title="حذف کامل ثبت کارکرد این روز"
                          icon={<Trash2 size={15} />}
                        >
                          پاک‌کردن
                        </Button>
                      )}
                    </div>
                  </>
                ) : editTab === "overtime" ? (
                  /* ── SEPARATE OVERTIME SESSION FORM ── */
                  <div style={{ display: "grid", gap: 10, padding: "4px 0" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
                      ثبت بازه کاری مجزا خارج از ساعت اداری (کار فورس، شیفت شب، پشتیبانی):
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800 }}>ساعت شروع:</span>
                        <input
                          type="time"
                          value={otStartTime}
                          onChange={(e) => setOtStartTime(e.target.value)}
                          className="mono input"
                          style={{ width: "100%", padding: "8px 10px", fontSize: 14, textAlign: "center", direction: "ltr" }}
                        />
                      </label>

                      <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800 }}>ساعت پایان:</span>
                        <input
                          type="time"
                          value={otEndTime}
                          onChange={(e) => setOtEndTime(e.target.value)}
                          className="mono input"
                          style={{ width: "100%", padding: "8px 10px", fontSize: 14, textAlign: "center", direction: "ltr" }}
                        />
                      </label>
                    </div>

                    {/* Overnight or duration calculation banner */}
                    {(() => {
                      const prev = computeOtPreview();
                      if (!prev) return null;
                      if (prev.isOvernight) {
                        return (
                          <div
                            style={{
                              background: "rgba(124, 58, 237, 0.08)",
                              border: "1.5px solid var(--violet)",
                              borderRadius: 10,
                              padding: "8px 10px",
                              fontSize: 12,
                              color: "#4C1D95",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Moon size={15} />
                            <span>
                              <b>شیفت شبانه (عبور از نیمه‌شب):</b> {prev.hours} ساعت اضافه کار برای این تاریخ منظور می‌شود.
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div
                          style={{
                            background: "rgba(34, 197, 94, 0.08)",
                            border: "1.5px solid #22c55e",
                            borderRadius: 10,
                            padding: "8px 10px",
                            fontSize: 12,
                            color: "#15803d",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Clock size={15} />
                          <span>
                            <b>مدت اضافه‌کاری:</b> {prev.hours} ساعت
                          </span>
                        </div>
                      );
                    })()}

                    {/* Mode Selector */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>نوع حضور:</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className={`btn ${otMode === "remote" ? "btn-primary" : "btn-ghost"}`}
                          style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                          onClick={() => setOtMode("remote")}
                        >
                          <Home size={13} /> دورکاری
                        </button>
                        <button
                          type="button"
                          className={`btn ${otMode === "office" ? "btn-primary" : "btn-ghost"}`}
                          style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                          onClick={() => setOtMode("office")}
                        >
                          <Building2 size={13} /> حضوری
                        </button>
                      </div>
                    </div>

                    <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>علت یا تسک فورس (اختیاری):</span>
                      <input
                        type="text"
                        value={otDesc}
                        onChange={(e) => setOtDesc(e.target.value)}
                        placeholder="مثال: دیپلوی نسخه جدید، رفع باگ فورس..."
                        className="input"
                        style={{ width: "100%", padding: "8px 10px", fontSize: 13 }}
                        maxLength={200}
                      />
                    </label>

                    <Button
                      variant="primary"
                      style={{ padding: "10px", fontWeight: 800, fontSize: 13, marginTop: 4 }}
                      onClick={handleSaveOtSession}
                      disabled={!otStartTime || !otEndTime}
                      loading={loading}
                      loadingText="در حال ثبت بازه…"
                      icon={<Zap size={14} />}
                    >
                      ثبت بازه اضافه‌کاری
                    </Button>
                  </div>
                ) : (
                  /* ── DAILY LEAVE FORM ── */
                  <div style={{ display: "grid", gap: 10, padding: "4px 0" }}>
                    <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>نوع مرخصی روزانه:</span>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="mono input"
                        style={{ width: "100%", padding: "8px 10px", fontSize: 13 }}
                      >
                        <option value="annual">🌴 مرخصی استحقاقی (سالانه)</option>
                        <option value="sick">🩺 مرخصی استعلاجی (پزشکی)</option>
                        <option value="unpaid">💼 مرخصی بدون حقوق</option>
                        <option value="casual">⭐ مرخصی تشویقی / ساعتی</option>
                      </select>
                    </label>

                    <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>علت یا توضیحات (اختیاری):</span>
                      <input
                        type="text"
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="مثال: سرماخوردگی، امور اداری، سفر..."
                        className="input"
                        style={{ width: "100%", padding: "8px 10px", fontSize: 13 }}
                        maxLength={200}
                      />
                    </label>

                    <div style={{ fontSize: 11, color: "var(--muted)", background: "rgba(96,165,250,0.08)", padding: "8px 10px", borderRadius: 8, border: "1px dashed #60a5fa" }}>
                      ℹ️ مرخصی روزانه معادل ۸ ساعت موظفی کامل محاسبه می‌شود و کسری کار این روز را به صفر می‌رساند.
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <Button
                        variant="primary"
                        style={{ flex: 2, padding: "10px", fontWeight: 800, fontSize: 13 }}
                        onClick={handleSaveDailyLeave}
                        loading={loading}
                        loadingText="در حال ثبت…"
                      >
                        {currentDay.daily_leave ? "بروزرسانی مرخصی روزانه" : "ثبت مرخصی روزانه"}
                      </Button>

                      {currentDay.daily_leave && (
                        <Button
                          variant="ghost"
                          style={{ flex: 1, padding: "10px", color: "var(--red)", borderColor: "var(--red)" }}
                          onClick={handleDeleteDailyLeave}
                          disabled={loading}
                          icon={<Trash2 size={15} />}
                        >
                          حذف مرخصی
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── READ-ONLY SUMMARY VIEW ── */
              <>
                {/* Status and Action Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="badge badge-muted mono" style={{ fontSize: 12 }}>
                      {currentDay.day_status_label || (currentDay.is_holiday ? "تعطیل (کاری)" : "کاری")}
                    </span>
                    {currentDay.work_mode === "remote" && (
                      <span className="badge" style={{ background: "#DDD6FE", color: "#4C1D95", borderColor: "#000" }}>
                        🏠 دورکار
                      </span>
                    )}
                    {currentDay.is_holiday && hasWork && (
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
                    onClick={() => {
                      if (currentDay.daily_leave) {
                        setEditTab("leave");
                      } else {
                        setEditTab("work");
                      }
                      setIsEditing(true);
                    }}
                  >
                    <Edit3 size={12} />
                    <span>{currentDay.daily_leave ? "ویرایش مرخصی" : hasWork ? "ویرایش" : "ثبت کارکرد / مرخصی"}</span>
                  </button>
                </div>

                {/* Holiday Banner if holiday */}
                {currentDay.is_holiday && (
                  <div className="row" style={{ borderColor: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
                    <b>مناسبت تعطیلی</b>
                    <span className="mono" style={{ fontWeight: 800, color: "#dc2626" }}>
                      {currentDay.holiday_name || "تعطیلی رسمی / جمعه"}
                    </span>
                  </div>
                )}

                {/* No work recorded message */}
                {!hasWork && !currentDay.daily_leave && (
                  <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "14px 0", display: "grid", gap: 10 }}>
                    <div>
                      {currentDay.is_holiday ? "در این روز تعطیل کارکردی ثبت نشده است." : "ثبت کاری، اضافه کار یا مرخصی برای این روز وجود ندارد."}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                      <button
                        type="button"
                        className="btn btn-primary mono"
                        style={{ fontSize: 11, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                        onClick={() => {
                          setEditTab("work");
                          setIsEditing(true);
                        }}
                      >
                        <Edit3 size={12} /> ساعت کاری
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost mono"
                        style={{ fontSize: 11, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 4, borderColor: "#EAB308", color: "#854D0E" }}
                        onClick={() => {
                          setEditTab("overtime");
                          setIsEditing(true);
                        }}
                      >
                        <Zap size={12} style={{ color: "#EAB308" }} /> اضافه کار مجزا
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost mono"
                        style={{ fontSize: 11, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                        onClick={() => {
                          setEditTab("leave");
                          setIsEditing(true);
                        }}
                      >
                        <Palmtree size={12} /> مرخصی روزانه
                      </button>
                    </div>
                  </div>
                )}

                {/* Check-in (ورود) */}
                {hasIn && (
                  <div className="row">
                    <b>ورود</b>
                    <span className="mono" style={{ fontWeight: 800 }}>
                      {currentDay.in}
                    </span>
                  </div>
                )}

                {/* Check-out (خروج) */}
                {hasOut && (
                  <div className="row">
                    <b>خروج</b>
                    <span className="mono" style={{ fontWeight: 800 }}>
                      {currentDay.out}
                    </span>
                  </div>
                )}

                {/* Hourly Leave Start/Return (مرخصی ساعتی) */}
                {hasLeaveIntervals && (
                  <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <b>مرخصی ساعتی</b>
                      <span className="mono">{fmtH(currentDay.leave) || "—"}</span>
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      {currentDay.leave_intervals.map((inv: [string, string], idx: number) => (
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
                    <span className="mono">{fmtH(currentDay.gross)}</span>
                  </div>
                )}

                {/* Net Duration (کارکرد خالص) */}
                {hasNet && (
                  <div className="row">
                    <b>کارکرد خالص</b>
                    <span className="mono" style={{ fontWeight: 800 }}>
                      {fmtH(currentDay.net)}
                    </span>
                  </div>
                )}

                {/* Regular Hours (ساعت موظفی) */}
                {!currentDay.is_holiday && hasWork && (
                  <div className="row">
                    <b>ساعت موظفی</b>
                    <span className="mono">{standardHours} ساعت</span>
                  </div>
                )}

                {/* Overtime Hours (اضافه‌کاری) */}
                {hasOvertime && (
                  <div
                    className="row"
                    style={{
                      borderColor: "#22C55E",
                      background: "rgba(34, 197, 94, 0.08)",
                      flexDirection: "column",
                      alignItems: "stretch",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b style={{ color: "var(--text)" }}>اضافه‌کاری</b>
                      <span className="mono" style={{ fontWeight: 800, color: "#22C55E" }}>
                        {fmtH(currentDay.overtime)}
                      </span>
                    </div>
                    {otRange && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 12,
                          borderTop: "1px dashed rgba(34, 197, 94, 0.25)",
                          paddingTop: 6,
                        }}
                      >
                        <span style={{ color: "var(--muted)", fontWeight: 700 }}>بازه اضافه‌کاری:</span>
                        <span className="mono" style={{ fontWeight: 800, color: "var(--text)" }}>
                          از <span style={{ color: "#22C55E" }}>{otRange[0]}</span> تا{" "}
                          <span style={{ color: "#22C55E" }}>{otRange[1]}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Separate Overtime Sessions List */}
                {Array.isArray(currentDay.overtime_sessions) && currentDay.overtime_sessions.length > 0 && (
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Zap size={13} style={{ color: "#EAB308" }} />
                      <span>بازه‌های اضافه‌کاری مجزا:</span>
                    </div>
                    {currentDay.overtime_sessions.map((s: any) => (
                      <div
                        key={s.id}
                        className="row"
                        style={{
                          background: s.mode === "remote" ? "rgba(124,58,237,.06)" : "rgba(34, 197, 94, 0.06)",
                          borderColor: s.mode === "remote" ? "var(--violet)" : "#22C55E",
                          borderWidth: 1.5,
                          padding: "8px 10px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "grid", gap: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {s.is_overnight && (
                              <span className="badge" style={{ background: "#4C1D95", color: "#fff", borderColor: "#000", fontSize: 10, padding: "2px 6px" }}>
                                🌙 شبانه (+۱ روز)
                              </span>
                            )}
                            <b className="mono" style={{ fontSize: 13, direction: "ltr" }}>
                              {s.start_time} تا {s.end_time}
                            </b>
                            <span className="badge" style={{ fontSize: 10, padding: "2px 6px", background: s.mode === "remote" ? "#DDD6FE" : "#DCFCE7", color: s.mode === "remote" ? "#4C1D95" : "#15803d", borderColor: "#000" }}>
                              {s.mode === "remote" ? "🏠 دورکار" : "🏢 حضوری"}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 8, alignItems: "center" }}>
                            <span>مدت: <b>{fmtHoursFa(s.hours)}</b></span>
                            {s.description && <span>· {s.description}</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ color: "var(--red)", borderColor: "var(--red)", padding: "4px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 3 }}
                          onClick={() => handleDeleteOtSession(s.id)}
                          disabled={loading}
                          title="حذف این بازه اضافه‌کاری"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {hasDeficit && (
                  <div className="row" style={{ borderColor: "var(--red)", background: "rgba(239,68,68,0.06)" }}>
                    <b>کسری کار</b>
                    <span className="mono" style={{ fontWeight: 800, color: "var(--red)" }}>
                      {fmtH(currentDay.deficit)}
                    </span>
                  </div>
                )}

                {/* Late (تأخیر) */}
                {hasLate && (
                  <div className="row" style={{ borderColor: "var(--red)" }}>
                    <b>تأخیر</b>
                    <span className="mono" style={{ fontWeight: 800, color: "var(--red)" }}>
                      {fmtH(currentDay.late)}
                    </span>
                  </div>
                )}

                {/* Daily Leave details if any */}
                {currentDay.daily_leave && (
                  <div
                    className="row"
                    style={{
                      background: "rgba(96,165,250,.08)",
                      borderColor: "#60a5fa",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14 }}>🌴</span>
                        <b>مرخصی روزانه</b>
                        <span className="badge" style={{ background: "#dbeafe", color: "#1e40af", borderColor: "#3b82f6", fontSize: 11 }}>
                          {currentDay.daily_leave.label || currentDay.daily_leave.type} ({currentDay.daily_leave.hours || 8} ساعت)
                        </span>
                      </div>
                      {currentDay.daily_leave.reason && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                          علت: {currentDay.daily_leave.reason}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: "var(--red)", borderColor: "var(--red)", padding: "4px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                      onClick={handleDeleteDailyLeave}
                      disabled={loading}
                    >
                      <Trash2 size={13} /> حذف
                    </button>
                  </div>
                )}

                {/* Quick Add Separate Overtime Button */}
                <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-ghost mono"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      borderRadius: 10,
                      borderColor: "var(--border-strong)",
                      background: "var(--surface-2)",
                    }}
                    onClick={() => {
                      setEditTab("overtime");
                      setIsEditing(true);
                    }}
                  >
                    <Plus size={14} />
                    <span>افزودن بازه اضافه‌کاری مجزا (شبانه / دورکاری / کار فورس)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* ── CUSTOM BRUTALIST CONFIRM DELETE DRAWER ── */}
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
            <Button
              variant="ghost"
              style={{ padding: "10px", fontSize: 12 }}
              onClick={() => setShowConfirmDelete(false)}
              disabled={loading}
            >
              انصراف
            </Button>
            <Button
              variant="danger"
              style={{
                padding: "10px",
                fontSize: 12,
                fontWeight: 800,
              }}
              onClick={handleConfirmDelete}
              loading={loading}
              loadingText="در حال حذف…"
            >
              بله، حذف کن
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}

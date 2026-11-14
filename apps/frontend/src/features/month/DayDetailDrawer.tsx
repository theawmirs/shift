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
                    gap: 5,
                    background: "rgba(255, 255, 255, 0.05)",
                    padding: 4,
                    borderRadius: 12,
                    border: "2px solid var(--border-strong)",
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    style={{
                      padding: "8px 4px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: editTab === "work" ? "var(--amber)" : "transparent",
                      color: editTab === "work" ? "#0F172A" : "var(--text)",
                      border: editTab === "work" ? "2px solid #000" : "2px solid transparent",
                      boxShadow: editTab === "work" ? "2px 2px 0 #000" : "none",
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
                      padding: "8px 4px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: editTab === "overtime" ? "var(--amber)" : "transparent",
                      color: editTab === "overtime" ? "#0F172A" : "var(--text)",
                      border: editTab === "overtime" ? "2px solid #000" : "2px solid transparent",
                      boxShadow: editTab === "overtime" ? "2px 2px 0 #000" : "none",
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
                      padding: "8px 4px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: editTab === "leave" ? "var(--amber)" : "transparent",
                      color: editTab === "leave" ? "#0F172A" : "var(--text)",
                      border: editTab === "leave" ? "2px solid #000" : "2px solid transparent",
                      boxShadow: editTab === "leave" ? "2px 2px 0 #000" : "none",
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
                        {leaveHours && parseFloat(leaveHours) > 0 ? (
                          <span style={{ fontSize: 11, color: "var(--amber-2)", fontWeight: 700 }}>
                            معادل: {fmtHoursFa(parseFloat(leaveHours))}
                          </span>
                        ) : null}
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
                        {overtimeHours && parseFloat(overtimeHours) > 0 ? (
                          <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>
                            معادل: {fmtHoursFa(parseFloat(overtimeHours))}
                          </span>
                        ) : null}
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
                              background: "rgba(99, 102, 241, 0.18)",
                              border: "2px solid #818cf8",
                              borderRadius: 12,
                              padding: "10px 12px",
                              fontSize: 12,
                              color: "#e0e7ff",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <Moon size={16} style={{ color: "#a5b4fc", flexShrink: 0 }} />
                            <span>
                              <b style={{ color: "#ffffff", fontWeight: 800 }}>شیفت شبانه (عبور از نیمه‌شب):</b>{" "}
                              <span style={{ color: "#c7d2fe" }}>{fmtHoursFa(prev.hours)} اضافه کار برای این تاریخ منظور می‌شود.</span>
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div
                          style={{
                            background: "rgba(34, 197, 94, 0.16)",
                            border: "2px solid #4ade80",
                            borderRadius: 12,
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "#dcfce7",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Clock size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
                          <span>
                            <b style={{ color: "#ffffff", fontWeight: 800 }}>مدت اضافه‌کاری:</b>{" "}
                            <span style={{ color: "#bbf7d0" }}>{fmtHoursFa(prev.hours)}</span>
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "var(--muted)",
                        background: "var(--surface-2)",
                        border: "1.5px solid var(--border-strong)",
                        borderRadius: 999,
                        padding: "3px 9px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {currentDay.day_status_label || (currentDay.is_holiday ? "تعطیل (کاری)" : "کاری")}
                    </span>
                    {currentDay.work_mode === "remote" && (
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "var(--tint-violet)",
                          background: "var(--tint-violet-bg)",
                          border: "1.5px solid var(--tint-violet-bd)",
                          borderRadius: 999,
                          padding: "3px 9px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        🏠 دورکار
                      </span>
                    )}
                    {currentDay.is_holiday && hasWork && (
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "var(--tint-amber)",
                          background: "var(--tint-amber-bg)",
                          border: "1.5px solid var(--tint-amber-bd)",
                          borderRadius: 999,
                          padding: "3px 9px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ⚡ کار در تعطیلی
                      </span>
                    )}
                  </div>

                  {/* Compact Edit Action */}
                  <button
                    className="btn mono"
                    style={{
                      width: "auto",
                      flexShrink: 0,
                      padding: "6px 11px",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      borderRadius: 10,
                      border: "2px solid var(--amber)",
                      background: "rgba(245,158,11,.14)",
                      color: "var(--text)",
                      boxShadow: "2px 2px 0 rgba(0,0,0,.35)",
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
                    <Edit3 size={12} style={{ color: "var(--amber)" }} />
                    <span>{currentDay.daily_leave ? "ویرایش مرخصی" : hasWork ? "ویرایش" : "ثبت کارکرد"}</span>
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
                        className="btn mono"
                        style={{
                          fontSize: 11,
                          padding: "6px 10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          borderColor: "var(--amber)",
                          background: "rgba(245, 158, 11, 0.16)",
                          color: "var(--text)",
                          boxShadow: "none",
                        }}
                        onClick={() => {
                          setEditTab("overtime");
                          setIsEditing(true);
                        }}
                      >
                        <Zap size={12} style={{ color: "var(--amber)" }} /> اضافه کار مجزا
                      </button>
                      <button
                        type="button"
                        className="btn mono"
                        style={{
                          fontSize: 11,
                          padding: "6px 10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          borderColor: "var(--border-strong)",
                          background: "var(--surface-2)",
                          color: "var(--text)",
                          boxShadow: "none",
                        }}
                        onClick={() => {
                          setEditTab("leave");
                          setIsEditing(true);
                        }}
                      >
                        <Palmtree size={12} style={{ color: "#60a5fa" }} /> مرخصی روزانه
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
                    <span className="mono">{fmtHoursFa(standardHours)}</span>
                  </div>
                )}

                {/* Overtime Hours (اضافه‌کاری) */}
                {hasOvertime && (
                  <div
                    className="row"
                    style={{
                      borderColor: "var(--tint-green-bd)",
                      background: "var(--ot-office-bg)",
                      flexDirection: "column",
                      alignItems: "stretch",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b style={{ color: "var(--text)" }}>اضافه‌کاری</b>
                      <span className="mono" style={{ fontWeight: 800, color: "var(--tint-green-txt)" }}>
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
                          از <span style={{ color: "var(--tint-green-txt)" }}>{otRange[0]}</span> تا{" "}
                          <span style={{ color: "var(--tint-green-txt)" }}>{otRange[1]}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Separate Overtime Sessions List */}
                {Array.isArray(currentDay.overtime_sessions) && currentDay.overtime_sessions.length > 0 && (
                  <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "var(--muted)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Zap size={12} style={{ color: "var(--amber)" }} /> بازه‌های اضافه‌کاری مجزا
                      </span>
                      <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>
                        {currentDay.overtime_sessions.length} بازه
                      </span>
                    </div>

                    {currentDay.overtime_sessions.map((s: any) => {
                      const isRemote = s.mode === "remote";
                      const accent = isRemote ? "var(--tint-violet-bd)" : "var(--tint-green-bd)";
                      return (
                        <div
                          key={s.id}
                          style={{
                            background: isRemote ? "var(--ot-remote-bg)" : "var(--ot-office-bg)",
                            border: `1.5px solid ${accent}`,
                            borderRadius: 14,
                            padding: "10px 11px",
                            display: "grid",
                            gap: 9,
                          }}
                        >
                          {/* Header: mode + overnight chips, delete */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  color: isRemote ? "var(--tint-violet)" : "var(--tint-green)",
                                  background: isRemote ? "var(--tint-violet-bg)" : "var(--tint-green-bg)",
                                  border: `1.5px solid ${accent}`,
                                  borderRadius: 999,
                                  padding: "2px 8px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {isRemote ? "🏠 دورکاری" : "🏢 حضوری"}
                              </span>
                              {s.is_overnight && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: "var(--tint-night)",
                                    background: "var(--tint-night-bg)",
                                    border: "1.5px solid var(--tint-night-bd)",
                                    borderRadius: 999,
                                    padding: "2px 8px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  🌙 شبانه +۱ روز
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              className="btn"
                              style={{
                                width: 30,
                                height: 30,
                                flexShrink: 0,
                                padding: 0,
                                borderRadius: 9,
                                border: "1.5px solid var(--red)",
                                background: "rgba(239,68,68,.12)",
                                color: "var(--red)",
                                boxShadow: "none",
                                display: "grid",
                                placeItems: "center",
                              }}
                              onClick={() => handleDeleteOtSession(s.id)}
                              disabled={loading}
                              title="حذف این بازه اضافه‌کاری"
                              aria-label="حذف این بازه اضافه‌کاری"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Time range + duration (bidi-isolated so order never flips) */}
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)" }}>از</span>
                            <bdi
                              className="mono"
                              style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", letterSpacing: ".01em" }}
                            >
                              {s.start_time}
                            </bdi>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)" }}>تا</span>
                            <bdi
                              className="mono"
                              style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", letterSpacing: ".01em" }}
                            >
                              {s.end_time}
                            </bdi>
                            <span
                              style={{
                                marginInlineStart: "auto",
                                fontSize: 11,
                                fontWeight: 800,
                                color: isRemote ? "var(--tint-violet-txt)" : "var(--tint-green-txt)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {fmtHoursFa(s.hours)}
                            </span>
                          </div>

                          {s.description && (
                            <small style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
                              {s.description}
                            </small>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Compensated Overtime notice on day level */}
                {currentDay.compensated_hours > 0 && (
                  <div
                    className="row"
                    style={{
                      padding: "8px 12px",
                      background: "var(--tint-blue-bg)",
                      borderColor: "var(--tint-blue-bd)",
                      borderWidth: 1.5,
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--tint-blue-txt)", fontWeight: 800 }}>⚖️ تهاتر عملکرد روز:</span>
                    <span style={{ fontSize: 12, color: "var(--text)" }}>
                      {fmtHoursFa(currentDay.compensated_hours)} اضافه کار برای جبران کسری کار امروز تهاتر شد
                    </span>
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
                      background: "rgba(96,165,250,.10)",
                      borderColor: "#60a5fa",
                      borderWidth: 1.5,
                      padding: "10px 12px",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", minWidth: 0 }}>
                      <span style={{ fontSize: 16, lineHeight: 1.3 }}>🌴</span>
                      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <b style={{ fontSize: 13 }}>مرخصی روزانه</b>
                          <span
                            className="mono"
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: "var(--tint-amber)",
                              background: "var(--tint-amber-bg)",
                              border: "1.5px solid var(--tint-amber-bd)",
                              borderRadius: 999,
                              padding: "2px 7px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {currentDay.daily_leave.label || currentDay.daily_leave.type}
                          </span>
                        </div>
                        <small style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.6 }}>
                          {fmtHoursFa(currentDay.daily_leave.hours || 8)}
                          {currentDay.daily_leave.reason ? ` · علت: ${currentDay.daily_leave.reason}` : ""}
                        </small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        padding: 0,
                        marginTop: 2,
                        borderRadius: 10,
                        border: "2px solid var(--red)",
                        background: "rgba(239,68,68,.12)",
                        color: "var(--red)",
                        boxShadow: "2px 2px 0 rgba(0,0,0,.35)",
                        display: "grid",
                        placeItems: "center",
                      }}
                      onClick={handleDeleteDailyLeave}
                      disabled={loading}
                      title="حذف مرخصی روزانه"
                      aria-label="حذف مرخصی روزانه"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* Quick Add Separate Overtime Button */}
                <button
                  type="button"
                  className="mono"
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "2px solid var(--amber)",
                    background: "rgba(245, 158, 11, 0.14)",
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    justifyContent: "flex-start",
                    textAlign: "right",
                    boxShadow: "3px 3px 0 rgba(0,0,0,.35)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  onClick={() => {
                    setEditTab("overtime");
                    setIsEditing(true);
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      flexShrink: 0,
                      borderRadius: 10,
                      background: "var(--amber)",
                      color: "#0F172A",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Plus size={16} />
                  </span>
                  <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                    <b style={{ fontSize: 12.5, fontWeight: 800 }}>افزودن بازه اضافه‌کاری مجزا</b>
                    <small style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>
                      شبانه · دورکاری · کار فورس
                    </small>
                  </span>
                </button>
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

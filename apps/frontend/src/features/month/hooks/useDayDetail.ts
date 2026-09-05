import { useState, useEffect } from "react";
import { attendanceApi } from "@/shared/api/endpoints/attendance";
import { useToast } from "@/shared/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatShamsiDateText } from "@/shared/lib/format";

export function useDayDetail(day: any | null, onUpdated?: (updatedDay?: any) => void, onClose?: () => void) {
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
    }
  }, [day]);

  const currentDay = day || activeDay;
  const dateFormatted = currentDay?.date ? formatShamsiDateText(currentDay.date) : "";

  const handleSaveEdit = async () => {
    if (!currentDay) return;
    setLoading(true);
    try {
      const res = await attendanceApi.editDay({
        date: currentDay.date,
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
      onClose?.();
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
      const res = await attendanceApi.editDay({
        date: currentDay.date,
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
      onClose?.();
    } catch (e: any) {
      push(`❌ خطا: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return {
    currentDay,
    dateFormatted,
    isEditing,
    setIsEditing,
    showConfirmDelete,
    setShowConfirmDelete,
    loading,
    inTime,
    setInTime,
    outTime,
    setOutTime,
    leaveHours,
    setLeaveHours,
    overtimeHours,
    setOvertimeHours,
    workMode,
    setWorkMode,
    notes,
    setNotes,
    handleSaveEdit,
    handleConfirmDelete,
  };
}

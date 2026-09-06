import { useState } from "react";
import { useToast } from "@/shared/ui/Toast";
import { useRecordMutation } from "@/shared/api/queries";
import { attendanceApi } from "@/shared/api/endpoints/attendance";
import { useNavigate } from "react-router-dom";

export function computeFallbackDayStatus(day: any) {
  if (!day) return { status: null, label: null, reason: null };
  const isHoliday = !!day.is_holiday;
  const holName = day.holiday_name || null;
  if (isHoliday) {
    const reason = holName
      ? `🏖 امروز تعطیله (${holName}) — ثبت ورود/خروج بسته‌ست`
      : "🏖 امروز تعطیله — ثبت ورود/خروج بسته‌ست";
    return { status: "holiday", label: "تعطیل", reason };
  }
  if (day.out != null) {
    return { status: "done", label: "تمام‌شده", reason: "✅ امروز خروج زدی — روز کاری تمومه، تا فردا" };
  }
  if (!!day.leave_open) {
    return { status: "on_leave", label: "مرخصی", reason: "در مرخصی هستی — «برگشتم» بزن تا ادامه بدی" };
  }
  if (day.in != null) {
    return { status: "working", label: "مشغول", reason: "مشغول به کار — خروج یا مرخصی ثبت کن" };
  }
  return { status: "idle", label: "آماده", reason: "آماده — ورود بزن تا روز کاری شروع شه" };
}

export function useTodayStatus(status: any, refetch: () => Promise<any>) {
  const { push } = useToast();
  const navigate = useNavigate();
  const recordMutation = useRecordMutation();
  const [holidayOptIn, setHolidayOptIn] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  let day_status = status?.day_status ?? status?.day?.day_status ?? null;
  let day_status_label = status?.day_status_label ?? status?.day?.day_status_label ?? null;
  let day_status_reason = status?.day_status_reason ?? status?.day?.day_status_reason ?? null;

  if (status && !day_status) {
    const fb = computeFallbackDayStatus(status.day);
    day_status = fb.status;
    if (!day_status_label) day_status_label = fb.label;
    if (!day_status_reason) day_status_reason = fb.reason;
  }

  const onAction = async (k: string, at?: string, otHours?: number) => {
    const map: Record<string, string> = { in: "in", out: "out", leave: "leave_start", back: "leave_end" };
    const et = map[k] || k;
    const allowHoliday = day_status === "holiday" && holidayOptIn;
    setLoadingAction(k);
    try {
      const r = await recordMutation.mutateAsync({ event_type: et, at, allow_holiday: allowHoliday });
      if (k === "out" && otHours && otHours > 0) {
        try {
          await attendanceApi.ot(otHours);
        } catch {}
      }
      push(
        r.message ||
          (k === "in"
            ? `✅ ورود ثبت شد${at ? ` (${at})` : ""}`
            : k === "out"
            ? `✅ خروج ثبت شد${at ? ` (${at})` : ""}`
            : k === "leave"
            ? "🟡 مرخصی شروع شد"
            : "🔵 برگشتم")
      );
      await refetch();
      if (k === "out") navigate("/reports");
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const onRemoteToggle = async () => {
    try {
      const j = await attendanceApi.toggleWorkMode();
      push(j.mode === "remote" ? "🏠 دورکار شد" : "🏢 حضوری شد");
      await refetch();
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    }
  };

  return {
    day_status,
    day_status_label,
    day_status_reason,
    holidayOptIn,
    setHolidayOptIn,
    loadingAction,
    onAction,
    onRemoteToggle,
  };
}

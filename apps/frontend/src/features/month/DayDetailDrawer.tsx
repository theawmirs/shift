import { Drawer } from "@/shared/ui/Drawer";
import { Button } from "@/shared/ui/Button";
import { formatShamsiDateText } from "@/shared/lib/format";
import { AlertTriangle } from "lucide-react";
import { useDayDetail } from "./hooks/useDayDetail";
import { DayEventsTimeline } from "./DayEventsTimeline";
import { DayWorklogDrawerContent } from "./DayWorklogDrawerContent";

export interface DayDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  day: any | null;
  onUpdated?: (updatedDay?: any) => void;
}

export function DayDetailDrawer({ open, onClose, day, onUpdated }: DayDetailDrawerProps) {
  const {
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
    handleSaveEdit,
    handleConfirmDelete,
  } = useDayDetail(day, onUpdated, onClose);

  const title = currentDay?.label || (currentDay?.date ? `جزئیات ${formatShamsiDateText(currentDay.date)}` : "جزئیات روز");

  const hasIn = Boolean(currentDay?.in);
  const hasOut = Boolean(currentDay?.out);
  const hasGross = currentDay?.gross != null && Number(currentDay.gross) > 0;
  const hasNet = currentDay?.net != null && Number(currentDay.net) > 0;
  const hasWork = hasIn || hasOut || hasNet || hasGross || Boolean(currentDay?.has_events);

  return (
    <>
      <Drawer open={open} onClose={onClose} title={title}>
        {currentDay && (
          <div style={{ display: "grid", gap: 10 }}>
            {isEditing ? (
              <DayWorklogDrawerContent
                inTime={inTime}
                setInTime={setInTime}
                outTime={outTime}
                setOutTime={setOutTime}
                leaveHours={leaveHours}
                setLeaveHours={setLeaveHours}
                overtimeHours={overtimeHours}
                setOvertimeHours={setOvertimeHours}
                workMode={workMode}
                setWorkMode={setWorkMode}
                loading={loading}
                hasWork={hasWork}
                onCancel={() => setIsEditing(false)}
                onSave={handleSaveEdit}
                onDeleteRequest={() => setShowConfirmDelete(true)}
              />
            ) : (
              <DayEventsTimeline
                currentDay={currentDay}
                onEditClick={() => setIsEditing(true)}
              />
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

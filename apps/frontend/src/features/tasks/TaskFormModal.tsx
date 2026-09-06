import { Drawer } from "@/shared/ui/Drawer";
import { Button } from "@/shared/ui/Button";
import { ShamsiCalendar } from "@/shared/ui/ShamsiCalendar";
import { formatShamsiDateText } from "@/shared/lib/format";
import { CalendarDays, X } from "lucide-react";

interface TaskFormModalProps {
  open: boolean;
  mode: "add" | "edit" | null;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formDesc: string;
  setFormDesc: (v: string) => void;
  formPriority: "low" | "medium" | "high";
  setFormPriority: (v: "low" | "medium" | "high") => void;
  formDueDate: string;
  setFormDueDate: (v: string) => void;
  showDatePicker: boolean;
  setShowDatePicker: (v: boolean | ((prev: boolean) => boolean)) => void;
  todayStr: string;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function TaskFormModal({
  open,
  mode,
  formTitle,
  setFormTitle,
  formDesc,
  setFormDesc,
  formPriority,
  setFormPriority,
  formDueDate,
  setFormDueDate,
  showDatePicker,
  setShowDatePicker,
  todayStr,
  saving,
  onSave,
  onClose,
}: TaskFormModalProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={mode === "add" ? "📝 افزودن تسک کاری جدید" : "✏️ ویرایش تسک"}
    >
      <div style={{ display: "grid", gap: 14 }}>
        {/* Title Input */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>
            عنوان تسک <span style={{ color: "var(--red)" }}>*</span>
          </label>
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="مثلاً: طراحی صفحات فیگما یا گزارش کار…"
            className="input"
            autoFocus
          />
        </div>

        {/* Description Input */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>توضیحات و جزئیات (اختیاری)</label>
          <textarea
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="توضیحات تکمیلی تسک را اینجا بنویسید…"
            rows={3}
            className="input mono"
            style={{ resize: "vertical" }}
          />
        </div>

        {/* Priority Selector */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>سطح اولویت</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[
              { k: "low", label: "عادی 🌿", bg: "#F3F4F6", color: "#4B5563" },
              { k: "medium", label: "مهم ⚠️", bg: "#FEF3C7", color: "#92400E" },
              { k: "high", label: "فوری 🔥", bg: "#FEE2E2", color: "#991B1B" },
            ].map((pItem) => (
              <button
                key={pItem.k}
                type="button"
                className="btn mono"
                style={{
                  padding: "8px 4px",
                  fontSize: 11,
                  fontWeight: 900,
                  borderRadius: 12,
                  borderWidth: 2,
                  background: formPriority === pItem.k ? pItem.bg : "transparent",
                  color: formPriority === pItem.k ? pItem.color : "var(--muted)",
                  borderColor: formPriority === pItem.k ? "#000" : "var(--border-strong)",
                  boxShadow: formPriority === pItem.k ? "3px 3px 0 #000" : "none",
                }}
                onClick={() => setFormPriority(pItem.k as any)}
              >
                {pItem.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date (Shamsi) */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>تاریخ سررسید (شمسی)</label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              type="button"
              className="btn mono"
              style={{
                flex: 1,
                padding: "9px 12px",
                fontSize: 12,
                fontWeight: 800,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: showDatePicker ? "#000" : "var(--border-strong)",
                background: showDatePicker ? "var(--amber)" : "#fff",
                color: "#0F172A",
                boxShadow: showDatePicker ? "3px 3px 0 #000" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
              onClick={() => setShowDatePicker((prev) => !prev)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CalendarDays size={15} style={{ color: "var(--amber-2)", flexShrink: 0 }} />
                <span>{formDueDate ? formatShamsiDateText(formDueDate) : "بدون تاریخ سررسید"}</span>
              </span>
              <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>
                {showDatePicker ? "بستن تقویم ▲" : "انتخاب تقویم ▼"}
              </span>
            </button>

            <button
              type="button"
              className="btn btn-ghost mono"
              style={{
                width: "auto",
                padding: "9px 12px",
                fontSize: 11,
                fontWeight: 800,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: formDueDate === todayStr ? "#000" : "var(--border-strong)",
                background: formDueDate === todayStr ? "var(--amber)" : "transparent",
                color: formDueDate === todayStr ? "#0F172A" : "var(--text)",
              }}
              onClick={() => {
                setFormDueDate(todayStr);
                setShowDatePicker(false);
              }}
            >
              امروز
            </button>

            {formDueDate && (
              <button
                type="button"
                className="btn btn-ghost mono"
                style={{ width: "auto", padding: "9px 10px", fontSize: 11, color: "var(--red)" }}
                title="حذف تاریخ سررسید"
                onClick={() => {
                  setFormDueDate("");
                  setShowDatePicker(false);
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {showDatePicker && (
            <div style={{ marginTop: 6, animation: "popIn 0.2s ease" }}>
              <ShamsiCalendar
                value={formDueDate || todayStr}
                onPick={(picked) => {
                  setFormDueDate(picked);
                  setShowDatePicker(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            انصراف
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onSave}
            loading={saving}
            loadingText={mode === "add" ? "در حال ثبت…" : "در حال ذخیره…"}
            style={{ fontWeight: 900 }}
          >
            {mode === "add" ? "ثبت تسک جدید" : "ذخیره تغییرات"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

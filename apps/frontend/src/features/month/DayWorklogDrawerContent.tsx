import { Building2, Home, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/Button";

interface DayWorklogEditFormProps {
  inTime: string;
  setInTime: (v: string) => void;
  outTime: string;
  setOutTime: (v: string) => void;
  leaveHours: string;
  setLeaveHours: (v: string) => void;
  overtimeHours: string;
  setOvertimeHours: (v: string) => void;
  workMode: "office" | "remote";
  setWorkMode: (v: "office" | "remote") => void;
  loading: boolean;
  hasWork: boolean;
  onCancel: () => void;
  onSave: () => void;
  onDeleteRequest: () => void;
}

export function DayWorklogDrawerContent({
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
  loading,
  hasWork,
  onCancel,
  onSave,
  onDeleteRequest,
}: DayWorklogEditFormProps) {
  return (
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
          onClick={onCancel}
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
          onClick={onSave}
          loading={loading}
          loadingText="در حال ذخیره…"
        >
          ذخیره ساعت کاری
        </Button>

        {hasWork && (
          <Button
            variant="ghost"
            style={{ flex: 1, padding: "10px", color: "var(--red)", borderColor: "var(--red)" }}
            onClick={onDeleteRequest}
            disabled={loading}
            title="حذف کامل ثبت کارکرد این روز"
            icon={<Trash2 size={15} />}
          >
            پاک‌کردن
          </Button>
        )}
      </div>
    </div>
  );
}

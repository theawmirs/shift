import { useToast } from "../shared/ui/Toast";
import { DailyLeaveCard, DailyLeaveList } from "../features/leave/DailyLeaveCard";

export function LeavesPage() {
  const { push } = useToast();
  return (
    <div style={{ display: "grid", gap: 12 }}>
    
      <div className="card">
        <div className="section-head">
          <h2 className="display">مدیریت مرخصی</h2>
        </div>
        <DailyLeaveCard onChanged={() => push("لیست مرخصی‌ها به‌روزرسانی شد")} />
        <div style={{ marginTop: 14 }}>
          <DailyLeaveList />
        </div>
      </div>
    </div>
  );
}

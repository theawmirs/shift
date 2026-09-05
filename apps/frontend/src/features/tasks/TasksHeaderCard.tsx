import { Plus } from "lucide-react";

interface TasksHeaderCardProps {
  totalCount: number;
  doneCount: number;
  openCount: number;
  progressPercent: number;
  onAddNew: () => void;
}

export function TasksHeaderCard({
  totalCount,
  doneCount,
  openCount,
  progressPercent,
  onAddNew,
}: TasksHeaderCardProps) {
  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div className="kicker">TASKS & SPRINT MANAGER</div>
          <h2 className="display" style={{ fontSize: 22, margin: "2px 0 0" }}>
            مدیریت تسک‌ها و وظایف
          </h2>
        </div>

        <button
          type="button"
          className="btn btn-primary mono"
          onClick={onAddNew}
          style={{
            width: "auto",
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 900,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "3px 3px 0 #000",
          }}
        >
          <Plus size={16} />
          <span>تسک جدید</span>
        </button>
      </div>

      {/* Progress Bar & Bento Stats */}
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ fontWeight: 800, color: "var(--muted)" }}>پیشرفت تکمیل وظایف</span>
          <span className="mono" style={{ fontWeight: 900, color: "var(--amber-2)" }}>
            {doneCount} از {totalCount} تسک ({progressPercent}٪)
          </span>
        </div>

        <div className="progress" style={{ height: 10 }}>
          <i style={{ width: `${progressPercent}%`, transition: "width 0.3s ease" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 4 }}>
          <div
            className="row"
            style={{
              padding: "8px 6px",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              background: "var(--surface-2)",
              borderColor: "var(--border-strong)",
            }}
          >
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>کل تسک‌ها</span>
            <b className="mono" style={{ fontSize: 14 }}>{totalCount}</b>
          </div>

          <div
            className="row"
            style={{
              padding: "8px 6px",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              background: "rgba(245, 158, 11, 0.08)",
              borderColor: "var(--amber)",
            }}
          >
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>در انتظار انجام</span>
            <b className="mono" style={{ fontSize: 14, color: "var(--amber-2)" }}>{openCount}</b>
          </div>

          <div
            className="row"
            style={{
              padding: "8px 6px",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              background: "rgba(34, 197, 94, 0.08)",
              borderColor: "var(--green)",
            }}
          >
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>تکمیل‌شده</span>
            <b className="mono" style={{ fontSize: 14, color: "var(--green)" }}>{doneCount}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

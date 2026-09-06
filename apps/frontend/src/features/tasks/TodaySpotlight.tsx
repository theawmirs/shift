import { TaskType } from "./hooks/useTasks";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Circle, Edit2 } from "lucide-react";
import { TaskPriorityBadge } from "./TaskPriorityBadge";

interface TodaySpotlightProps {
  todayTasks: TaskType[];
  filter: "all" | "open" | "done";
  togglingId: number | string | null;
  onToggle: (id: number | string) => void;
  onEdit: (task: TaskType) => void;
}

export function TodaySpotlight({
  todayTasks,
  filter,
  togglingId,
  onToggle,
  onEdit,
}: TodaySpotlightProps) {
  if (todayTasks.length === 0 || filter === "done") return null;

  return (
    <div
      className="card"
      style={{
        background: "linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)",
        borderColor: "var(--amber)",
        borderWidth: 2.5,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>☀️</span>
          <b style={{ fontSize: 13, color: "var(--text)" }}>تسک‌های اختصاصی امروز ☀️</b>
        </div>
        <span className="badge badge-warn mono" style={{ fontSize: 10 }}>
          {todayTasks.length} وظیفه برای امروز
        </span>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {todayTasks.map((t) => {
          const isItemToggling = togglingId === t.id;
          if (isItemToggling) {
            return (
              <div
                key={t.id}
                className="row"
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  borderStyle: "dashed",
                  borderColor: "var(--amber)",
                }}
              >
                <Skeleton w={20} h={20} r={999} />
                <div style={{ flex: 1, display: "grid", gap: 6 }}>
                  <Skeleton w="65%" h={14} r={8} />
                  <Skeleton w="40%" h={11} r={6} />
                </div>
                <Skeleton w={50} h={24} r={8} />
              </div>
            );
          }

          return (
            <div
              key={t.id}
              className="row"
              style={{
                padding: "10px 12px",
                background: "#fff",
                borderColor: "#000",
                color: "#0F172A",
                boxShadow: "2.5px 2.5px 0 #000",
              }}
            >
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                  color: "#0F172A",
                }}
              >
                <Circle size={18} />
              </button>

              <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>{t.title}</div>
                {t.description && (
                  <div style={{ fontSize: 11, color: "rgba(15,23,42,.7)", marginTop: 2 }}>{t.description}</div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <TaskPriorityBadge priority={t.priority} />
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 28, height: 28, boxShadow: "1.5px 1.5px 0 #000" }}
                  onClick={() => onEdit(t)}
                >
                  <Edit2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

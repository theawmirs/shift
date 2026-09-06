import { TaskType, formatJalaliReadable } from "./hooks/useTasks";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Calendar, CheckCircle2, Circle, Edit2, Trash2 } from "lucide-react";

interface TaskItemCardProps {
  task: TaskType;
  todayStr: string;
  isToggling: boolean;
  onToggle: (id: number | string) => void;
  onEdit: (task: TaskType) => void;
  onDelete: (task: TaskType) => void;
}

export function TaskItemCard({
  task,
  todayStr,
  isToggling,
  onToggle,
  onEdit,
  onDelete,
}: TaskItemCardProps) {
  const isDueToday = task.due_date ? task.due_date === todayStr : task.shamsi_date === todayStr;

  if (isToggling) {
    return (
      <div
        className="row"
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderStyle: "dashed",
        }}
      >
        <Skeleton w={20} h={20} r={999} />
        <div style={{ flex: 1, display: "grid", gap: 6 }}>
          <Skeleton w="65%" h={14} r={8} />
          <Skeleton w="40%" h={11} r={6} />
        </div>
        <Skeleton w={50} h={24} r={8} />
        <Skeleton w={30} h={30} r={8} />
      </div>
    );
  }

  return (
    <div
      className="row"
      style={{
        padding: "12px 14px",
        background: task.done
          ? "rgba(255,255,255,0.02)"
          : isDueToday
          ? "rgba(245, 158, 11, 0.05)"
          : "var(--surface-2)",
        borderColor: task.done
          ? "rgba(255,255,255,0.06)"
          : isDueToday
          ? "var(--amber)"
          : "var(--border-strong)",
        opacity: task.done ? 0.65 : 1,
        transition: "all 0.15s ease",
      }}
    >
      {/* Complete Toggle Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        disabled={isToggling}
        style={{
          background: "transparent",
          border: "none",
          cursor: isToggling ? "wait" : "pointer",
          padding: 0,
          display: "grid",
          placeItems: "center",
          color: task.done ? "var(--green)" : "var(--muted)",
          flexShrink: 0,
          opacity: isToggling ? 0.5 : 1,
        }}
        title={task.done ? "علامت به عنوان انجام‌نشده" : "علامت به عنوان انجام‌شده"}
      >
        {task.done ? (
          <CheckCircle2 size={20} />
        ) : (
          <Circle size={20} />
        )}
      </button>

      {/* Task Content */}
      <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 13.5,
            color: "var(--text)",
            textDecoration: task.done ? "line-through" : "none",
            lineHeight: 1.4,
          }}
        >
          {task.title}
        </div>

        {task.description && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--muted)",
              marginTop: 3,
              lineHeight: 1.5,
            }}
          >
            {task.description}
          </div>
        )}

        {/* Metadata: Due date & Shamsi Date */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          {task.due_date ? (
            <span
              className="mono"
              style={{
                fontSize: 10.5,
                color: isDueToday ? "var(--amber-2)" : "var(--muted)",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Calendar size={12} /> سررسید: {formatJalaliReadable(task.due_date)} {isDueToday ? "(امروز)" : ""}
            </span>
          ) : task.shamsi_date ? (
            <span
              className="mono"
              style={{
                fontSize: 10.5,
                color: "var(--muted2)",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Calendar size={12} /> ایجاد: {formatJalaliReadable(task.shamsi_date)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Actions & Priority */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <TaskPriorityBadge priority={task.priority} />

        <button
          type="button"
          className="icon-btn"
          style={{ width: 30, height: 30, boxShadow: "2px 2px 0 #000" }}
          onClick={() => onEdit(task)}
          title="ویرایش تسک"
        >
          <Edit2 size={13} />
        </button>

        <button
          type="button"
          className="icon-btn"
          style={{
            width: 30,
            height: 30,
            boxShadow: "2px 2px 0 #000",
            color: "var(--red)",
          }}
          onClick={() => onDelete(task)}
          title="حذف تسک"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useToast } from "../../shared/ui/Toast";
import { Drawer } from "../../shared/ui/Drawer";
import {
  useTasksQuery,
  useAddTaskMutation,
  usePatchTaskMutation,
  useDeleteTaskMutation,
} from "../../shared/api/queries";
import {
  ListChecks,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  Circle,
  Flame,
  AlertCircle,
  Leaf,
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  X,
} from "lucide-react";

export interface TaskType {
  id: number | string;
  title: string;
  description?: string | null;
  priority?: "low" | "medium" | "high" | string;
  due_date?: string | null;
  done: boolean;
  day_num?: number | null;
  shamsi_date?: string;
}

// ── Jalali Helper Functions ──
const JALALI_MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

function getTodayJalaliString(): string {
  const g = new Date();
  let gy = g.getFullYear();
  let gm = g.getMonth() + 1;
  let gd = g.getDate();

  let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    (365 * gy) +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  let jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);

  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${jy}-${p2(jm)}-${p2(jd)}`;
}

function formatJalaliReadable(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const y = parts[0];
    const mIdx = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const mName = JALALI_MONTH_NAMES[mIdx] || parts[1];
    return `${d} ${mName} ${y}`;
  } catch {
    return dateStr;
  }
}

const PAGE_SIZE = 6;

export function TasksList() {
  const { push } = useToast();
  const { data: tasksData, error: queryError, isLoading } = useTasksQuery();
  const addTaskMutation = useAddTaskMutation();
  const patchTaskMutation = usePatchTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();

  const tasks: TaskType[] = useMemo(() => tasksData?.tasks || [], [tasksData]);

  // Filter & Search states
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // Drawer modal states
  const [activeTaskModal, setActiveTaskModal] = useState<"add" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<TaskType | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState<"low" | "medium" | "high">("medium");
  const [formDueDate, setFormDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const todayStr = useMemo(() => getTodayJalaliString(), []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [filter, priorityFilter, q]);

  const totalCount = tasks.length;
  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const openCount = totalCount - doneCount;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Filtered & Sorted master array
  const allFiltered = useMemo(() => {
    return tasks
      .filter((t) => {
        if (filter === "open" && t.done) return false;
        if (filter === "done" && !t.done) return false;
        if (priorityFilter !== "all" && (t.priority || "medium") !== priorityFilter) return false;
        if (q.trim()) {
          const term = q.trim().toLowerCase();
          const matchTitle = t.title?.toLowerCase().includes(term);
          const matchDesc = t.description?.toLowerCase().includes(term);
          if (!matchTitle && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // 1. Unfinished (open) always first!
        if (a.done !== b.done) return a.done ? 1 : -1;

        // 2. Exact Today's due date first among the same completion state
        const aIsDueToday = a.due_date ? a.due_date === todayStr : a.shamsi_date === todayStr;
        const bIsDueToday = b.due_date ? b.due_date === todayStr : b.shamsi_date === todayStr;
        if (aIsDueToday !== bIsDueToday) return aIsDueToday ? -1 : 1;

        // 3. Priority weight (high > medium > low)
        const prioWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const diffPrio = (prioWeight[b.priority || "medium"] || 2) - (prioWeight[a.priority || "medium"] || 2);
        if (diffPrio !== 0) return diffPrio;

        // 4. Creation Date / ID descending
        return Number(b.id) - Number(a.id);
      });
  }, [tasks, filter, priorityFilter, q, todayStr]);

  // Tasks explicitly due today (for hero spotlight)
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.done) return false;
      return t.due_date ? t.due_date === todayStr : t.shamsi_date === todayStr;
    });
  }, [tasks, todayStr]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(allFiltered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return allFiltered.slice(start, start + PAGE_SIZE);
  }, [allFiltered, currentPage]);

  const openAddModal = () => {
    setEditingTask(null);
    setFormTitle("");
    setFormDesc("");
    setFormPriority("medium");
    setFormDueDate(todayStr);
    setActiveTaskModal("add");
  };

  const openEditModal = (t: TaskType) => {
    setEditingTask(t);
    setFormTitle(t.title);
    setFormDesc(t.description || "");
    setFormPriority((t.priority as any) || "medium");
    setFormDueDate(t.due_date || "");
    setActiveTaskModal("edit");
  };

  const handleSaveTask = async () => {
    const v = formTitle.trim();
    if (!v) {
      push("❌ عنوان تسک نمی‌تواند خالی باشد", "error");
      return;
    }
    setSaving(true);
    try {
      if (activeTaskModal === "add") {
        await addTaskMutation.mutateAsync({
          title: v,
          description: formDesc.trim() || undefined,
          priority: formPriority,
          due_date: formDueDate.trim() || undefined,
        });
        push(`📝 تسک «${v}» اضافه شد`);
      } else if (activeTaskModal === "edit" && editingTask) {
        await patchTaskMutation.mutateAsync({
          id: editingTask.id,
          body: {
            title: v,
            description: formDesc.trim() || undefined,
            priority: formPriority,
            due_date: formDueDate.trim() || undefined,
          },
        });
        push(`✅ تسک به‌روزرسانی شد`);
      }
      setActiveTaskModal(null);
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number | string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    try {
      await patchTaskMutation.mutateAsync({
        id,
        body: { done: !t.done },
      });
      push(t.done ? `↩️ تسک بازگردانده شد` : `🎉 تسک انجام شد!`);
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTask) return;
    setSaving(true);
    try {
      await deleteTaskMutation.mutateAsync(deleteConfirmTask.id);
      push(`🗑 «${deleteConfirmTask.title}» حذف شد`);
      setDeleteConfirmTask(null);
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const renderPriorityBadge = (p?: string) => {
    if (p === "high") {
      return (
        <span
          className="badge"
          style={{
            background: "#FEE2E2",
            color: "#991B1B",
            border: "1.5px solid #000",
            fontSize: 10,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 7px",
          }}
        >
          <Flame size={11} /> فوری
        </span>
      );
    }
    if (p === "low") {
      return (
        <span
          className="badge"
          style={{
            background: "#F3F4F6",
            color: "#4B5563",
            border: "1.5px solid #000",
            fontSize: 10,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 7px",
          }}
        >
          <Leaf size={11} /> عادی
        </span>
      );
    }
    return (
      <span
        className="badge"
        style={{
          background: "#FEF3C7",
          color: "#92400E",
          border: "1.5px solid #000",
          fontSize: 10,
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          padding: "2px 7px",
        }}
      >
        <AlertCircle size={11} /> مهم
      </span>
    );
  };

  return (
    <div className="page-fade" style={{ display: "grid", gap: 14 }}>
      {/* ── 1. Telemetry / Progress Header Card ── */}
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
            onClick={openAddModal}
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

      {/* ── 2. Today's Due Tasks Spotlight (If any exist) ── */}
      {todayTasks.length > 0 && filter !== "done" && (
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
              <Sun size={16} style={{ color: "var(--amber-2)" }} />
              <b style={{ fontSize: 13, color: "var(--text)" }}>تسک‌های اختصاصی امروز ☀️</b>
            </div>
            <span className="badge badge-warn mono" style={{ fontSize: 10 }}>
              {todayTasks.length} وظیفه برای امروز
            </span>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {todayTasks.map((t) => (
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
                  onClick={() => handleToggle(t.id)}
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
                  {renderPriorityBadge(t.priority)}
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ width: 28, height: 28, boxShadow: "1.5px 1.5px 0 #000" }}
                    onClick={() => openEditModal(t)}
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. Filters & Search Control Bar ── */}
      <div className="card" style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
        {/* Search Input */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در عناوین و توضیحات تسک‌ها…"
            className="input mono"
            style={{
              paddingRight: 36,
              fontSize: 12.5,
              height: 38,
            }}
          />
          <Search
            size={16}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          {/* Status Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { k: "all", label: "همه" },
              { k: "open", label: "انجام‌نشده" },
              { k: "done", label: "انجام‌شده" },
            ].map((tb) => (
              <button
                key={tb.k}
                type="button"
                className="btn mono"
                style={{
                  width: "auto",
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 800,
                  borderRadius: 12,
                  borderWidth: 2,
                  background: filter === tb.k ? "var(--amber)" : "transparent",
                  color: filter === tb.k ? "#0F172A" : "var(--muted)",
                  borderColor: filter === tb.k ? "#000" : "var(--border-strong)",
                  boxShadow: filter === tb.k ? "2px 2px 0 #000" : "none",
                }}
                onClick={() => setFilter(tb.k as any)}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {/* Priority Pill Filter */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {[
              { k: "all", label: "اولویت: همه" },
              { k: "high", label: "فوری 🔥" },
              { k: "medium", label: "مهم ⚠️" },
              { k: "low", label: "عادی 🌿" },
            ].map((pb) => (
              <button
                key={pb.k}
                type="button"
                className="btn mono"
                style={{
                  width: "auto",
                  padding: "6px 8px",
                  fontSize: 10.5,
                  fontWeight: 800,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  background: priorityFilter === pb.k ? "var(--surface-2)" : "transparent",
                  color: priorityFilter === pb.k ? "var(--text)" : "var(--muted)",
                  borderColor: priorityFilter === pb.k ? "var(--amber)" : "var(--border-strong)",
                }}
                onClick={() => setPriorityFilter(pb.k as any)}
              >
                {pb.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Main Tasks List Section ── */}
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ListChecks size={18} style={{ color: "var(--amber)" }} />
            <b style={{ fontSize: 13, color: "var(--text)" }}>فهرست تسک‌ها</b>
          </div>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
            {allFiltered.length} مورد منطبق (صفحه {currentPage} از {totalPages})
          </span>
        </div>

        {queryError ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--red)" }}>
            خطا در دریافت تسک‌ها: {String((queryError as any)?.message || queryError)}
          </div>
        ) : isLoading ? (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
          </div>
        ) : paginatedTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 14px", color: "var(--muted)" }}>
            <ListChecks size={36} style={{ opacity: 0.3, margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>هیچ تسکی با این فیلترها پیدا نشد.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {paginatedTasks.map((t) => {
              const isDueToday = t.due_date ? t.due_date === todayStr : t.shamsi_date === todayStr;
              return (
                <div
                  key={t.id}
                  className="row"
                  style={{
                    padding: "12px 14px",
                    background: t.done
                      ? "rgba(255,255,255,0.02)"
                      : isDueToday
                      ? "rgba(245, 158, 11, 0.05)"
                      : "var(--surface-2)",
                    borderColor: t.done
                      ? "rgba(255,255,255,0.06)"
                      : isDueToday
                      ? "var(--amber)"
                      : "var(--border-strong)",
                    opacity: t.done ? 0.65 : 1,
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Complete Toggle Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggle(t.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "grid",
                      placeItems: "center",
                      color: t.done ? "var(--green)" : "var(--muted)",
                      flexShrink: 0,
                    }}
                    title={t.done ? "علامت به عنوان انجام‌نشده" : "علامت به عنوان انجام‌شده"}
                  >
                    {t.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>

                  {/* Task Content */}
                  <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 13.5,
                        color: "var(--text)",
                        textDecoration: t.done ? "line-through" : "none",
                        lineHeight: 1.4,
                      }}
                    >
                      {t.title}
                    </div>

                    {t.description && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--muted)",
                          marginTop: 3,
                          lineHeight: 1.5,
                        }}
                      >
                        {t.description}
                      </div>
                    )}

                    {/* Metadata: Due date & Shamsi Date */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                      {t.due_date ? (
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
                          <Calendar size={12} /> سررسید: {formatJalaliReadable(t.due_date)} {isDueToday ? "(امروز)" : ""}
                        </span>
                      ) : t.shamsi_date ? (
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
                          <Calendar size={12} /> ایجاد: {formatJalaliReadable(t.shamsi_date)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions & Priority */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {renderPriorityBadge(t.priority)}

                    <button
                      type="button"
                      className="icon-btn"
                      style={{ width: 30, height: 30, boxShadow: "2px 2px 0 #000" }}
                      onClick={() => openEditModal(t)}
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
                      onClick={() => setDeleteConfirmTask(t)}
                      title="حذف تسک"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 5. Neo-Brutalist Pagination Controls ── */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 10,
              borderTop: "1px solid var(--border)",
              marginTop: 6,
            }}
          >
            <button
              type="button"
              className="btn btn-ghost mono"
              style={{ width: "auto", padding: "6px 12px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronRight size={14} /> قبلی
            </button>

            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  className="mono"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "2px solid #000",
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: "pointer",
                    background: pNum === currentPage ? "var(--amber)" : "#fff",
                    color: "#0F172A",
                    boxShadow: pNum === currentPage ? "1px 1px 0 #000" : "2px 2px 0 #000",
                    transform: pNum === currentPage ? "translate(1px, 1px)" : "none",
                  }}
                  onClick={() => setPage(pNum)}
                >
                  {pNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-ghost mono"
              style={{ width: "auto", padding: "6px 12px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              بعدی <ChevronLeft size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── 6. Add / Edit Task Modal (Responsive Dialog) ── */}
      <Drawer
        open={activeTaskModal !== null}
        onClose={() => setActiveTaskModal(null)}
        title={activeTaskModal === "add" ? "📝 افزودن تسک کاری جدید" : "✏️ ویرایش تسک"}
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
              <input
                type="text"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                placeholder="YYYY-MM-DD (مثلاً: 1405-06-10)"
                className="input mono"
                style={{ direction: "ltr", textAlign: "center", flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-ghost mono"
                style={{ width: "auto", padding: "8px 12px", fontSize: 11 }}
                onClick={() => setFormDueDate(todayStr)}
              >
                امروز
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setActiveTaskModal(null)}
              disabled={saving}
            >
              انصراف
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveTask}
              disabled={saving}
              style={{ fontWeight: 900 }}
            >
              {saving ? (
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              ) : activeTaskModal === "add" ? (
                "ثبت تسک جدید"
              ) : (
                "ذخیره تغییرات"
              )}
            </button>
          </div>
        </div>
      </Drawer>

      {/* ── 7. Delete Confirmation Dialog ── */}
      <Drawer
        open={deleteConfirmTask !== null}
        onClose={() => setDeleteConfirmTask(null)}
        title="🗑 حذف تسک"
      >
        <div style={{ display: "grid", gap: 14, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
            آیا از حذف تسک «<b>{deleteConfirmTask?.title}</b>» اطمینان دارید؟ این عمل غیرقابل بازگشت است.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDeleteConfirmTask(null)}
              disabled={saving}
            >
              انصراف
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: "var(--red)", color: "#fff", fontWeight: 900 }}
              onClick={handleConfirmDelete}
              disabled={saving}
            >
              {saving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : "بله، حذف کن"}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

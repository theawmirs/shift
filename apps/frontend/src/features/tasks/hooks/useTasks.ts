import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/shared/ui/Toast";
import {
  useTasksQuery,
  useAddTaskMutation,
  usePatchTaskMutation,
  useDeleteTaskMutation,
} from "@/shared/api/queries";

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

const JALALI_MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

export function getTodayJalaliString(): string {
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

export function formatJalaliReadable(dateStr?: string | null): string {
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

export const PAGE_SIZE = 6;

export function useTasks() {
  const { push } = useToast();
  const { data: tasksData, error: queryError, isLoading } = useTasksQuery();
  const addTaskMutation = useAddTaskMutation();
  const patchTaskMutation = usePatchTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();

  const tasks: TaskType[] = useMemo(() => tasksData?.tasks || [], [tasksData]);

  const [togglingId, setTogglingId] = useState<number | string | null>(null);

  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [activeTaskModal, setActiveTaskModal] = useState<"add" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<TaskType | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState<"low" | "medium" | "high">("medium");
  const [formDueDate, setFormDueDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const todayStr = useMemo(() => getTodayJalaliString(), []);

  useEffect(() => {
    setPage(1);
  }, [filter, priorityFilter, q]);

  const totalCount = tasks.length;
  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const openCount = totalCount - doneCount;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

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
        if (a.done !== b.done) return a.done ? 1 : -1;

        const aIsDueToday = a.due_date ? a.due_date === todayStr : a.shamsi_date === todayStr;
        const bIsDueToday = b.due_date ? b.due_date === todayStr : b.shamsi_date === todayStr;
        if (aIsDueToday !== bIsDueToday) return aIsDueToday ? -1 : 1;

        const prioWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const diffPrio = (prioWeight[b.priority || "medium"] || 2) - (prioWeight[a.priority || "medium"] || 2);
        if (diffPrio !== 0) return diffPrio;

        return Number(b.id) - Number(a.id);
      });
  }, [tasks, filter, priorityFilter, q, todayStr]);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.done) return false;
      return t.due_date ? t.due_date === todayStr : t.shamsi_date === todayStr;
    });
  }, [tasks, todayStr]);

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
    setShowDatePicker(false);
    setActiveTaskModal("add");
  };

  const openEditModal = (t: TaskType) => {
    setEditingTask(t);
    setFormTitle(t.title);
    setFormDesc(t.description || "");
    setFormPriority((t.priority as any) || "medium");
    setFormDueDate(t.due_date || "");
    setShowDatePicker(false);
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
    if (!t || togglingId !== null) return;
    setTogglingId(id);
    try {
      await patchTaskMutation.mutateAsync({
        id,
        body: { done: !t.done },
      });
      push(t.done ? `↩️ تسک بازگردانده شد` : `🎉 تسک انجام شد!`);
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    } finally {
      setTogglingId(null);
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

  return {
    tasks,
    totalCount,
    doneCount,
    openCount,
    progressPercent,
    todayTasks,
    allFiltered,
    paginatedTasks,
    currentPage,
    totalPages,
    page,
    setPage,
    filter,
    setFilter,
    priorityFilter,
    setPriorityFilter,
    q,
    setQ,
    todayStr,
    togglingId,
    activeTaskModal,
    setActiveTaskModal,
    editingTask,
    deleteConfirmTask,
    setDeleteConfirmTask,
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
    saving,
    isLoading,
    tasksData,
    queryError,
    openAddModal,
    openEditModal,
    handleSaveTask,
    handleToggle,
    handleConfirmDelete,
  };
}

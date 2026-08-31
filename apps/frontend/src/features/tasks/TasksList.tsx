import { useEffect, useState, useMemo } from "react";
import {
  ListChecks,
  Check,
  Trash2,
  Search,
  Plus,
  Edit3,
  Calendar,
  AlertTriangle,
  CalendarDays,
  X,
  Flame,
  Zap,
  Leaf,
  CheckCircle2,
  CircleDashed,
  Sparkles,
} from "lucide-react";
import { API } from "../../shared/lib/api";
import { useToast } from "../../shared/ui/Toast";
import { CardSkeleton } from "../../shared/ui/Skeleton";
import { Drawer } from "../../shared/ui/Drawer";
import { ShamsiCalendar } from "../../shared/ui/ShamsiCalendar";
import { formatShamsiDateText } from "../../shared/lib/format";

export interface TaskType {
  id: number;
  title: string;
  description?: string | null;
  priority?: "low" | "medium" | "high";
  due_date?: string | null;
  done: boolean;
  day_num?: number;
  shamsi_date?: string;
}

export function TasksList() {
  const { push } = useToast();
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Drawer modal states
  const [activeTaskModal, setActiveTaskModal] = useState<"add" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<TaskType | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState<"low" | "medium" | "high">("medium");
  const [formDueDate, setFormDueDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await API.tasks();
      setTasks(r.tasks || []);
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalCount = tasks.length;
  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const openCount = totalCount - doneCount;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const filtered = useMemo(() => {
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
        // Unfinished first, then by priority (high > medium > low), then by ID desc
        if (a.done !== b.done) return a.done ? 1 : -1;
        const prioWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const diffPrio = (prioWeight[b.priority || "medium"] || 2) - (prioWeight[a.priority || "medium"] || 2);
        if (diffPrio !== 0) return diffPrio;
        return b.id - a.id;
      });
  }, [tasks, filter, priorityFilter, q]);

  const openAddModal = () => {
    setFormTitle("");
    setFormDesc("");
    setFormPriority("medium");
    setFormDueDate("");
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
        const r = await API.addTask({
          title: v,
          description: formDesc.trim() || null,
          priority: formPriority,
          due_date: formDueDate.trim() || null,
        });
        setTasks(r.tasks || []);
        push(`📝 تسک «${v}» اضافه شد`);
      } else if (activeTaskModal === "edit" && editingTask) {
        const r = await API.patchTask(editingTask.id, {
          title: v,
          description: formDesc.trim() || null,
          priority: formPriority,
          due_date: formDueDate.trim() || null,
        });
        setTasks(r.tasks || []);
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
      const r = await API.patchTask(id, { done: !t.done });
      setTasks(r.tasks || []);
      push(t.done ? `↩️ تسک بازگردانده شد` : `🎉 تسک انجام شد!`);
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTask) return;
    setSaving(true);
    try {
      const r = await API.delTask(deleteConfirmTask.id);
      setTasks(r.tasks || []);
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
        <Zap size={11} /> متوسط
      </span>
    );
  };

  if (loading) return <CardSkeleton rows={4} />;
  if (err)
    return (
      <div className="card">
        <p style={{ color: "var(--red)", fontWeight: 800 }}>❌ {err}</p>
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={load}>
          تلاش دوباره
        </button>
      </div>
    );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* ── 1. Hero & Progress Widget ── */}
      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="kicker">TASK MANAGER</div>
            <h2 className="hero-title" style={{ fontSize: 22, marginTop: 4 }}>
              مدیریت وظایف
            </h2>
          </div>
          <button
            className="btn btn-primary"
            style={{
              width: "auto",
              padding: "8px 14px",
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "3px 3px 0 #000",
            }}
            onClick={openAddModal}
          >
            <Plus size={16} /> تسک جدید
          </button>
        </div>

        {/* Progress Bar & Stats */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "2px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "10px 12px",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
              <Sparkles size={14} style={{ color: "var(--amber)" }} />
              <span>پیشرفت کل:</span>
            </span>
            <b className="mono" style={{ fontSize: 12, color: progressPercent === 100 ? "var(--green)" : "var(--text)" }}>
              {doneCount} از {totalCount} تسک ({progressPercent}٪)
            </b>
          </div>

          {/* Neo-brutalist Progress Track */}
          <div className="progress" style={{ height: 10 }}>
            <i
              style={{
                width: `${progressPercent}%`,
                transition: "width 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                background: progressPercent === 100 ? "var(--green)" : "linear-gradient(90deg, var(--amber), var(--violet))",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 2. Search & Segmented Filters ── */}
      <div className="card" style={{ padding: "12px", display: "grid", gap: 10 }}>
        {/* Search Input with quick clear */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "var(--bg)",
            border: "2px solid #000",
            borderRadius: 12,
            padding: "8px 12px",
            boxShadow: "2px 2px 0 #000",
          }}
        >
          <Search size={15} color="var(--muted)" style={{ flexShrink: 0 }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در عنوان یا متن تسک‌ها…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontFamily: "YekanBakh",
              fontSize: 12,
              fontWeight: 600,
            }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                color: "var(--muted)",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Tabs (Segmented Control) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
            background: "rgba(0,0,0,0.15)",
            padding: 4,
            borderRadius: 12,
            border: "1.5px solid var(--border-strong)",
          }}
        >
          {[
            { k: "all", label: "همه", icon: ListChecks, count: totalCount },
            { k: "open", label: "در جریان", icon: CircleDashed, count: openCount },
            { k: "done", label: "انجام‌شده", icon: CheckCircle2, count: doneCount },
          ].map((tab) => {
            const active = filter === tab.k;
            const Icon = tab.icon;
            return (
              <button
                key={tab.k}
                onClick={() => setFilter(tab.k as any)}
                style={{
                  border: active ? "2px solid #000" : "2px solid transparent",
                  borderRadius: 9,
                  background: active ? "var(--amber)" : "transparent",
                  color: active ? "#0F172A" : "var(--muted)",
                  fontWeight: 800,
                  fontSize: 11,
                  padding: "6px 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  cursor: "pointer",
                  boxShadow: active ? "2px 2px 0 #000" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    background: active ? "#000" : "rgba(255,255,255,0.08)",
                    color: active ? "#fff" : "inherit",
                    padding: "1px 5px",
                    borderRadius: 999,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Priority Filter Chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, flexShrink: 0 }}>اولویت:</span>
          {[
            { k: "all", label: "همه" },
            { k: "high", label: "فوری 🔥" },
            { k: "medium", label: "متوسط ⚡" },
            { k: "low", label: "عادی 🌱" },
          ].map((p) => {
            const active = priorityFilter === p.k;
            return (
              <button
                key={p.k}
                onClick={() => setPriorityFilter(p.k as any)}
                className={`badge ${active ? "badge-ok" : "badge-muted"}`}
                style={{
                  cursor: "pointer",
                  fontSize: 11,
                  padding: "4px 8px",
                  flexShrink: 0,
                  transition: "all 0.12s ease",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Task Items List ── */}
      {filtered.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "32px 14px",
            color: "var(--muted)",
            display: "grid",
            gap: 8,
            justifyItems: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              border: "2px solid #000",
              background: "rgba(255,255,255,0.04)",
              display: "grid",
              placeItems: "center",
              boxShadow: "3px 3px 0 #000",
            }}
          >
            <ListChecks size={24} style={{ opacity: 0.6 }} />
          </div>
          <b style={{ fontSize: 14, color: "var(--text)" }}>
            {tasks.length === 0 ? "هیچ تسکی وجود ندارد" : "تسک منطبق با فیلتر یافت نشد"}
          </b>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, maxWidth: 260 }}>
            {tasks.length === 0
              ? "برای برنامه‌ریزی کارهای روزمره، از دکمه «تسک جدید» استفاده کنید."
              : "عبارت جستجو یا فیلترهای وضعیت و اولویت را تغییر دهید."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((t) => {
            return (
              <div
                key={t.id}
                className="card"
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  background: t.done ? "rgba(0,0,0,0.18)" : "linear-gradient(180deg, var(--card) 0%, var(--card2) 100%)",
                  borderColor: t.done ? "var(--border)" : "var(--border-strong)",
                  opacity: t.done ? 0.65 : 1,
                  transition: "all 0.18s ease",
                }}
              >
                {/* Checkbox (Right Side RTL) */}
                <button
                  type="button"
                  aria-label={t.done ? "علامت‌گذاری باز" : "علامت‌گذاری انجام‌شده"}
                  style={{
                    width: 26,
                    height: 26,
                    minWidth: 26,
                    borderRadius: 8,
                    border: "2.5px solid #000",
                    background: t.done ? "var(--green)" : "#fff",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "2px 2px 0 #000",
                    cursor: "pointer",
                    marginTop: 2,
                    padding: 0,
                    transition: "transform 0.1s ease",
                  }}
                  onClick={() => handleToggle(t.id)}
                >
                  {t.done && <Check size={16} strokeWidth={3.5} color="#052e0b" />}
                </button>

                {/* Task Details (Middle) */}
                <div style={{ flex: 1, display: "grid", gap: 5, cursor: "pointer", minWidth: 0 }} onClick={() => openEditModal(t)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "var(--text)",
                        textDecoration: t.done ? "line-through" : "none",
                        wordBreak: "break-word",
                      }}
                    >
                      {t.title}
                    </span>
                    {renderPriorityBadge(t.priority)}
                  </div>

                  {t.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "var(--muted)",
                        lineHeight: 1.5,
                        textDecoration: t.done ? "line-through" : "none",
                        wordBreak: "break-word",
                      }}
                    >
                      {t.description}
                    </p>
                  )}

                  {t.due_date && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "var(--muted)",
                        marginTop: 2,
                      }}
                    >
                      <Calendar size={12} />
                      <span className="mono">مهلت: {formatShamsiDateText(t.due_date)}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons (Left Side RTL) */}
                <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                  <button
                    className="icon-btn"
                    style={{ width: 32, height: 32, boxShadow: "2px 2px 0 #000" }}
                    onClick={() => openEditModal(t)}
                    title="ویرایش"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    style={{ width: 32, height: 32, boxShadow: "2px 2px 0 #000", color: "var(--red)" }}
                    onClick={() => setDeleteConfirmTask(t)}
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT TASK DRAWER ── */}
      <Drawer
        open={activeTaskModal !== null}
        onClose={() => setActiveTaskModal(null)}
        title={activeTaskModal === "add" ? "افزودن تسک جدید" : "ویرایش تسک"}
        height="82vh"
      >
        <div style={{ display: "grid", gap: 14, padding: "4px 0" }}>
          <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>عنوان تسک:</span>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="مثال: تکمیل گزارش عملکرد یا پیگیری پروژه…"
              className="input"
              autoFocus
            />
          </label>

          <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>توضیحات و یادداشت (اختیاری):</span>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="جزئیات بیشتر، چک‌لیست یا نکات لازم…"
              rows={3}
              className="input"
              style={{ resize: "vertical" }}
            />
          </label>

          {/* Priority selector cards */}
          <div className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>اولویت تسک:</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, width: "100%" }}>
              {[
                { k: "low", label: "عادی", icon: Leaf, bg: "#F3F4F6", color: "#374151" },
                { k: "medium", label: "متوسط", icon: Zap, bg: "#FEF3C7", color: "#92400E" },
                { k: "high", label: "فوری", icon: Flame, bg: "#FEE2E2", color: "#991B1B" },
              ].map((p) => {
                const selected = formPriority === p.k;
                const Icon = p.icon;
                return (
                  <button
                    key={p.k}
                    type="button"
                    style={{
                      padding: "10px 6px",
                      borderRadius: 12,
                      border: selected ? "2.5px solid #000" : "1.5px solid var(--border-strong)",
                      background: selected ? p.bg : "var(--bg)",
                      color: selected ? p.color : "var(--text)",
                      boxShadow: selected ? "3px 3px 0 #000" : "none",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: 12,
                      transition: "all 0.12s ease",
                    }}
                    onClick={() => setFormPriority(p.k as any)}
                  >
                    <Icon size={16} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due date picker */}
          <div className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>مهلت انجام (سررسید):</span>

            <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-ghost mono"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#fff",
                  color: "#0F172A",
                }}
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CalendarDays size={16} />
                  <b>{formDueDate ? formatShamsiDateText(formDueDate) : "انتخاب تاریخ مهلت"}</b>
                </span>
                <span className="badge badge-muted mono" style={{ fontSize: 11 }}>
                  {formDueDate ? formDueDate : "بدون مهلت"}
                </span>
              </button>

              {formDueDate && (
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 38, height: 38, flexShrink: 0 }}
                  onClick={() => setFormDueDate("")}
                  title="پاک کردن مهلت"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Inline ShamsiCalendar Picker */}
            {showDatePicker && (
              <div style={{ width: "100%", marginTop: 4 }}>
                <ShamsiCalendar
                  value={formDueDate}
                  onPick={(d) => {
                    setFormDueDate(d);
                    setShowDatePicker(false);
                  }}
                />
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 800, marginTop: 6 }}
            onClick={handleSaveTask}
            disabled={saving}
          >
            {saving ? "در حال ذخیره..." : activeTaskModal === "add" ? "افزودن تسک" : "ذخیره تغییرات"}
          </button>
        </div>
      </Drawer>

      {/* ── CUSTOM BRUTALIST CONFIRM DELETE DRAWER ── */}
      <Drawer
        open={Boolean(deleteConfirmTask)}
        onClose={() => setDeleteConfirmTask(null)}
        title="تأیید حذف تسک"
        height="auto"
      >
        {deleteConfirmTask && (
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
                <b style={{ fontSize: 14 }}>آیا از حذف این تسک اطمینان دارید؟</b>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                تسک <b>«{deleteConfirmTask.title}»</b> به طور کامل پاک خواهد شد.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ padding: "10px", fontSize: 12 }}
                onClick={() => setDeleteConfirmTask(null)}
                disabled={saving}
              >
                انصراف
              </button>
              <button
                className="btn btn-primary"
                style={{
                  padding: "10px",
                  fontSize: 12,
                  fontWeight: 800,
                  background: "#EF4444",
                  borderColor: "#000",
                  color: "#fff",
                }}
                onClick={handleConfirmDelete}
                disabled={saving}
              >
                {saving ? "در حال حذف..." : "بله، حذف کن"}
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ListChecks, BadgeCheck, Trash2, Search, Plus, Edit3, Calendar, AlertTriangle, CalendarDays, X } from "lucide-react";
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

  const filtered = tasks.filter((t) => {
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
  });

  const openCount = tasks.filter((t) => !t.done).length;

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
      push(t.done ? `↩️ «${t.title}» باز شد` : `✅ «${t.title}» انجام شد`);
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
        <span className="badge" style={{ background: "#FEE2E2", color: "#991B1B", border: "1.5px solid #000", fontSize: 10, fontWeight: 800 }}>
          🔥 فوری
        </span>
      );
    }
    if (p === "low") {
      return (
        <span className="badge" style={{ background: "#F3F4F6", color: "#4B5563", border: "1.5px solid #000", fontSize: 10, fontWeight: 800 }}>
          کم
        </span>
      );
    }
    return (
      <span className="badge" style={{ background: "#FEF3C7", color: "#92400E", border: "1.5px solid #000", fontSize: 10, fontWeight: 800 }}>
        متوسط
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
    <div className="card brutal rotate1">
      {/* Header & Quick Add Button */}
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="display">تسک‌های کاری</h2>
          <span className="badge badge-ok" style={{ marginTop: 4, display: "inline-flex" }}>
            <ListChecks size={14} /> {openCount} باقی · {tasks.length} کل
          </span>
        </div>
        <button
          className="btn btn-primary"
          style={{ width: "auto", padding: "8px 14px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={openAddModal}
        >
          <Plus size={16} /> تسک جدید
        </button>
      </div>

      {/* Filters & Search */}
      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            background: "rgba(255,255,255,.06)",
            border: "2px solid rgba(255,255,255,.08)",
            borderRadius: 14,
            padding: "6px 12px",
          }}
        >
          <Search size={15} color="var(--muted)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در عنوان و توضیحات تسک…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontFamily: "YekanBakh",
              fontSize: 12,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "space-between" }}>
          {/* Status Filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["all", "open", "done"] as const).map((k) => (
              <button
                key={k}
                className={`badge ${filter === k ? "badge-ok" : "badge-muted"}`}
                style={{ cursor: "pointer", fontSize: 11 }}
                onClick={() => setFilter(k)}
              >
                {k === "all" ? "همه" : k === "open" ? "باز" : "انجام‌شده"}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["all", "high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                className={`badge ${priorityFilter === p ? "badge-ok" : "badge-muted"}`}
                style={{ cursor: "pointer", fontSize: 11 }}
                onClick={() => setPriorityFilter(p)}
              >
                {p === "all" ? "اولویت: همه" : p === "high" ? "فوری" : p === "medium" ? "متوسط" : "کم"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task Items List */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px 10px",
            color: "var(--muted)",
            border: "2px dashed rgba(255,255,255,.12)",
            borderRadius: 16,
          }}
        >
          <p style={{ margin: 0, fontWeight: 800, fontSize: 13 }}>
            {tasks.length === 0 ? "هنوز هیچ تسکی نداری — با دکمه بالا یکی اضافه کن ✨" : "نتیجه‌ای مطابق جستجو پیدا نشد"}
          </p>
        </div>
      ) : (
        <div className="list" style={{ display: "grid", gap: 8 }}>
          <AnimatePresence>
            {filtered.map((t) => (
              <div
                key={t.id}
                className="row"
                style={{
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  background: t.done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)",
                }}
              >
                {/* Checkbox */}
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 8,
                    border: "2px solid #000",
                    background: t.done ? "var(--green)" : "#fff",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "2px 2px 0 #000",
                    cursor: "pointer",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                  onClick={() => handleToggle(t.id)}
                >
                  {t.done ? <BadgeCheck size={14} color="#052e0b" /> : null}
                </span>

                {/* Content */}
                <div style={{ flex: 1, display: "grid", gap: 4, cursor: "pointer" }} onClick={() => openEditModal(t)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <b
                      style={{
                        fontSize: 13,
                        textDecoration: t.done ? "line-through" : "none",
                        opacity: t.done ? 0.6 : 1,
                      }}
                    >
                      {t.title}
                    </b>
                    {renderPriorityBadge(t.priority)}
                  </div>

                  {t.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: "var(--muted)",
                        lineHeight: 1.5,
                        textDecoration: t.done ? "line-through" : "none",
                        opacity: t.done ? 0.5 : 0.9,
                      }}
                    >
                      {t.description}
                    </p>
                  )}

                  {t.due_date && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--muted)" }}>
                      <Calendar size={11} />
                      <span>مهلت: {formatShamsiDateText(t.due_date)}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                  <button
                    className="icon-btn"
                    style={{ width: 28, height: 28, boxShadow: "1.5px 1.5px 0 #000" }}
                    onClick={() => openEditModal(t)}
                    title="ویرایش"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    className="icon-btn"
                    style={{ width: 28, height: 28, boxShadow: "1.5px 1.5px 0 #000", color: "var(--red)" }}
                    onClick={() => setDeleteConfirmTask(t)}
                    title="حذف"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── CREATE / EDIT TASK DRAWER ── */}
      <Drawer
        open={activeTaskModal !== null}
        onClose={() => setActiveTaskModal(null)}
        title={activeTaskModal === "add" ? "افزودن تسک جدید" : "ویرایش مشخصات تسک"}
        height="auto"
      >
        <div style={{ display: "grid", gap: 12, padding: "6px 0" }}>
          <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>عنوان تسک:</span>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="مثال: تکمیل گزارش ماهانه یا جلسه با تیم"
              style={{ width: "100%", padding: "10px 12px", fontSize: 13 }}
              autoFocus
            />
          </label>

          <label className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>توضیحات و یادداشت (اختیاری):</span>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="جزئیات بیشتر، چک‌لیست یا نکات مهم…"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 12,
                borderRadius: 12,
                border: "2px solid #000",
                background: "#fff",
                color: "#0F172A",
                fontFamily: "YekanBakh",
                boxShadow: "3px 3px 0 #000",
                resize: "vertical",
              }}
            />
          </label>

          {/* Priority selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>اولویت:</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                { k: "low", label: "کم", bg: "#F3F4F6", color: "#4B5563" },
                { k: "medium", label: "متوسط", bg: "#FEF3C7", color: "#92400E" },
                { k: "high", label: "فوری 🔥", bg: "#FEE2E2", color: "#991B1B" },
              ].map((p) => (
                <button
                  key={p.k}
                  type="button"
                  className={`btn ${formPriority === p.k ? "btn-primary" : "btn-ghost"}`}
                  style={{
                    padding: "8px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                  onClick={() => setFormPriority(p.k as any)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>مهلت انجام (تاریخ سررسید):</span>
            
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
                  <b>{formDueDate ? formatShamsiDateText(formDueDate) : "انتخاب تاریخ از تقویم"}</b>
                </span>
                <span className="badge badge-muted mono" style={{ fontSize: 11 }}>
                  {formDueDate ? formDueDate : "بدون مهلت"}
                </span>
              </button>

              {formDueDate && (
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 36, height: 36, flexShrink: 0 }}
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
            style={{ width: "100%", padding: "12px", fontSize: 13, fontWeight: 800, marginTop: 4 }}
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

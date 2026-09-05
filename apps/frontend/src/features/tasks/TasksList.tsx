import { useTasks, TaskType } from "./hooks/useTasks";
import { TaskItemCard } from "./TaskItemCard";
import { TaskFilterBar } from "./TaskFilterBar";
import { TaskFormModal } from "./TaskFormModal";
import { TasksHeaderCard } from "./TasksHeaderCard";
import { TodaySpotlight } from "./TodaySpotlight";
import { TasksSkeleton } from "@/shared/ui/Skeleton";
import { Drawer } from "@/shared/ui/Drawer";
import { Button } from "@/shared/ui/Button";
import { ListChecks, ChevronLeft, ChevronRight } from "lucide-react";

export function TasksList() {
  const {
    totalCount,
    doneCount,
    openCount,
    progressPercent,
    todayTasks,
    allFiltered,
    paginatedTasks,
    currentPage,
    totalPages,
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
  } = useTasks();

  if (isLoading && !tasksData) return <TasksSkeleton />;

  return (
    <div className="page-fade" style={{ display: "grid", gap: 14 }}>
      {/* ── 1. Telemetry / Progress Header Card ── */}
      <TasksHeaderCard
        totalCount={totalCount}
        doneCount={doneCount}
        openCount={openCount}
        progressPercent={progressPercent}
        onAddNew={openAddModal}
      />

      {/* ── 2. Today's Due Tasks Spotlight (If any exist) ── */}
      <TodaySpotlight
        todayTasks={todayTasks}
        filter={filter}
        togglingId={togglingId}
        onToggle={handleToggle}
        onEdit={openEditModal}
      />

      {/* ── 3. Filters & Search Control Bar ── */}
      <TaskFilterBar
        q={q}
        setQ={setQ}
        filter={filter}
        setFilter={setFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
      />

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
            {paginatedTasks.map((t) => (
              <TaskItemCard
                key={t.id}
                task={t}
                todayStr={todayStr}
                isToggling={togglingId === t.id}
                onToggle={handleToggle}
                onEdit={openEditModal}
                onDelete={(task) => setDeleteConfirmTask(task)}
              />
            ))}
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
              onClick={() => setPage(Math.max(1, currentPage - 1))}
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
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            >
              بعدی <ChevronLeft size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── 6. Add / Edit Task Modal (Responsive Dialog) ── */}
      <TaskFormModal
        open={activeTaskModal !== null}
        mode={activeTaskModal}
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formDesc={formDesc}
        setFormDesc={setFormDesc}
        formPriority={formPriority}
        setFormPriority={setFormPriority}
        formDueDate={formDueDate}
        setFormDueDate={setFormDueDate}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        todayStr={todayStr}
        saving={saving}
        onSave={handleSaveTask}
        onClose={() => setActiveTaskModal(null)}
      />

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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteConfirmTask(null)}
              disabled={saving}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="danger"
              style={{ fontWeight: 900 }}
              onClick={handleConfirmDelete}
              loading={saving}
              loadingText="در حال حذف…"
            >
              بله، حذف کن
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
export type { TaskType };

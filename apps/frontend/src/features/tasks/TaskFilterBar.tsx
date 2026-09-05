import { Search, X } from "lucide-react";

interface TaskFilterBarProps {
  q: string;
  setQ: (val: string) => void;
  filter: "all" | "open" | "done";
  setFilter: (val: "all" | "open" | "done") => void;
  priorityFilter: "all" | "high" | "medium" | "low";
  setPriorityFilter: (val: "all" | "high" | "medium" | "low") => void;
}

export function TaskFilterBar({
  q,
  setQ,
  filter,
  setFilter,
  priorityFilter,
  setPriorityFilter,
}: TaskFilterBarProps) {
  return (
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
  );
}

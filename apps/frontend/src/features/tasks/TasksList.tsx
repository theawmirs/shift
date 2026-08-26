import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, BadgeCheck, Trash2, Search } from "lucide-react";
import { API } from "../../shared/lib/api";
import { useToast } from "../../shared/ui/Toast";
import { CardSkeleton } from "../../shared/ui/Skeleton";

export function TasksList() {
  const { push } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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
    if (q.trim() && !t.title?.includes(q.trim())) return false;
    return true;
  });
  const openCount = tasks.filter((t) => !t.done).length;

  const handleAdd = async () => {
    const v = text.trim();
    if (!v) {
      push("❌ متن تسک خالیه", "error");
      return;
    }
    try {
      const r = await API.addTask(v);
      setTasks(r.tasks || []);
      setText("");
      push(`📝 «${v}» اضافه شد`);
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
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
  const handleDelete = async (id: number | string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    try {
      const r = await API.delTask(id);
      setTasks(r.tasks || []);
      push(`🗑 «${t.title}» حذف شد`);
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    }
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
      <div className="section-head">
        <h2 className="display">تسک‌های امروز</h2>
        <span className="badge badge-ok">
          <ListChecks size={14} /> {openCount} باقی · {tasks.length} کل
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            flex: 1,
            minWidth: 160,
            alignItems: "center",
            background: "rgba(255,255,255,.06)",
            border: "2px solid rgba(255,255,255,.08)",
            borderRadius: 14,
            padding: "6px 10px",
          }}
        >
          <Search size={14} color="var(--muted)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو…"
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
        <div style={{ display: "flex", gap: 6 }}>
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
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "18px 10px",
            color: "var(--muted)",
            border: "2px dashed rgba(255,255,255,.12)",
            borderRadius: 16,
          }}
        >
          <p style={{ margin: 0, fontWeight: 800 }}>
            {tasks.length === 0 ? "هنوز تسکی نداری — یکی اضافه کن ✨" : "نتیجه‌ای پیدا نشد"}
          </p>
          {tasks.length === 0 && (
            <p className="mono" style={{ margin: "6px 0 0", fontSize: 11 }}>
              تسک‌های امروز بعد از ورود هم اینجا نمایش داده می‌شن
            </p>
          )}
        </div>
      ) : (
        <div className="list">
          <AnimatePresence>
            {filtered.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="row"
              >
                <div
                  style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, cursor: "pointer" }}
                  onClick={() => handleToggle(t.id)}
                >
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
                    }}
                  >
                    {t.done ? <BadgeCheck size={14} color="#052e0b" /> : null}
                  </span>
                  <b style={{ textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.6 : 1, flex: 1 }}>
                    {t.day_num}. {t.title}
                  </b>
                </div>
                <span
                  className={`badge ${t.done ? "badge-ok" : "badge-warn"}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleToggle(t.id)}
                >
                  {t.done ? "انجام شد" : "باز"}
                </span>
                <button
                  className="icon-btn"
                  style={{ width: 32, height: 32, boxShadow: "2px 2px 0 #000" }}
                  onClick={() => handleDelete(t.id)}
                  aria-label="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="تسک جدید… (Enter برای افزودن)"
          className="mono task-input"
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-violet"
          style={{ width: "auto", padding: "10px 14px" }}
          onClick={handleAdd}
        >
          افزودن
        </button>
      </div>
      <p className="mono" style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 10, textAlign: "center" }}>
        روی تسک بزن تا تیک بخوره · سطل حذف برای حذف
      </p>
    </div>
  );
}

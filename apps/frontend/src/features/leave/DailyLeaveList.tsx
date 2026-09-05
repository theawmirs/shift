import { Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { useLeaves } from "./hooks/useLeaves";

export function DailyLeaveList({ month }: { month?: string }) {
  const { items, error, deleteLeave, isDeleting, deletingId } = useLeaves(month);

  if (error) return <p style={{ color: "var(--muted)", fontSize: 12 }}>مرخصی روزانه: {error}</p>;
  if (!items.length)
    return <p style={{ color: "var(--muted)", fontSize: 12 }}>مرخصی روزانه ثبت‌شده‌ای برای این بازه نیست.</p>;

  return (
    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
      {items.map((it) => (
        <div key={it.id} className="row" style={{ padding: "8px 10px" }}>
          <small className="mono">
            {it.start_date}
            {it.end_date !== it.start_date ? ` → ${it.end_date}` : ""} · {it.label} · {it.hours} ساعت{" "}
            {it.reason ? `· ${it.reason}` : ""}
          </small>
          <Button
            variant="ghost"
            className="mono"
            size="sm"
            style={{ fontSize: 11, padding: "4px 8px", width: "auto" }}
            onClick={() => deleteLeave(it.id)}
            loading={isDeleting && deletingId === it.id}
            icon={<Trash2 size={12} />}
          >
            لغو
          </Button>
        </div>
      ))}
    </div>
  );
}

import { Flame, Leaf, AlertCircle } from "lucide-react";

export function TaskPriorityBadge({ priority }: { priority?: string }) {
  if (priority === "high") {
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
  if (priority === "low") {
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
}

import { useState } from "react";
import { Plane } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { DailyLeaveDrawer } from "./DailyLeaveDrawer";

export { DailyLeaveDrawer } from "./DailyLeaveDrawer";
export { DailyLeaveList } from "./DailyLeaveList";
export { useLeaves } from "./hooks/useLeaves";

export function DailyLeaveCard({ onChanged }: { onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderStyle: "dashed",
          padding: "14px 12px",
          fontWeight: 800,
        }}
        onClick={() => setOpen(true)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Plane size={16} /> درخواست مرخصی روزانه
        </span>
        <span className="pill mono" style={{ fontSize: 10, background: "#0F172A", color: "#fff" }}>
          تقویم
        </span>
      </Button>
      <DailyLeaveDrawer
        open={open}
        onClose={() => setOpen(false)}
        onChanged={() => {
          onChanged?.();
        }}
      />
    </>
  );
}

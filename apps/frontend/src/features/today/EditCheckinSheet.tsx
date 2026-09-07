import { useEffect, useState } from "react";
import { Drawer } from "../../shared/ui/Drawer";
import { Button } from "../../shared/ui/Button";

export interface EditCheckinSheetProps {
  open: boolean;
  initialTime: string;
  loading: boolean;
  onConfirm: (at: string) => void;
  onCancel: () => void;
}

// Correct today's check-in time. Input is prefilled with the recorded entry.
export function EditCheckinSheet({ open, initialTime, loading, onConfirm, onCancel }: EditCheckinSheetProps) {
  const [value, setValue] = useState(initialTime);

  useEffect(() => {
    if (open) setValue(initialTime);
  }, [open, initialTime]);

  return (
    <Drawer open={open} onClose={onCancel} title="ویرایش ساعت ورود" height="auto">
      <div dir="rtl" style={{ display: "grid", gap: 14, padding: "8px 0" }}>
        <p style={{ color: "var(--muted)", fontSize: 12, margin: 0, lineHeight: 1.7 }}>
          اگه دیر دکمه ورود رو زدی، ساعت واقعی ورودت رو اصلاح کن:
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <input
            type="time"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mono"
            style={{
              fontSize: 22,
              fontWeight: 800,
              padding: "10px 14px",
              borderRadius: 14,
              border: "2.5px solid #000",
              boxShadow: "3px 3px 0 #000",
              background: "#fff",
              color: "#0F172A",
              textAlign: "center",
              width: "100%",
              maxWidth: "240px",
              boxSizing: "border-box",
              direction: "ltr",
              margin: "0 auto",
              display: "block",
            }}
          />
        </div>
        <Button
          variant="primary"
          style={{ fontWeight: 800, padding: "12px", marginTop: 4 }}
          loading={loading}
          loadingText="در حال ثبت..."
          disabled={!value}
          onClick={() => value && onConfirm(value.trim())}
        >
          ثبت ساعت ورود {value}
        </Button>
      </div>
    </Drawer>
  );
}

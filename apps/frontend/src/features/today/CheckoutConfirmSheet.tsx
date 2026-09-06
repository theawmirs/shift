import { AlertTriangle } from "lucide-react";
import { Drawer } from "../../shared/ui/Drawer";
import { Button } from "../../shared/ui/Button";
import { fmtHoursFa } from "../../shared/lib/format";

export interface CheckoutConfirmSheetProps {
  open: boolean;
  inTime: string;
  liveMinutes: number;
  standardHours: number;
  dateLabel: string;
  loading: boolean;
  exitTime?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Confirmation step before an irreversible checkout is recorded.
// Escape, backdrop click, and drag-to-close all route to onCancel.
export function CheckoutConfirmSheet({
  open,
  inTime,
  liveMinutes,
  standardHours,
  dateLabel,
  loading,
  exitTime,
  onConfirm,
  onCancel,
}: CheckoutConfirmSheetProps) {
  const liveHours = liveMinutes / 60;
  const diffMinutes = Math.round(standardHours * 60 - liveMinutes);

  const rows: Array<{ label: string; value: string; ltr?: boolean; color?: string }> = [
    { label: "زمان ورود", value: inTime, ltr: true },
    { label: "کارکرد تا این لحظه", value: fmtHoursFa(liveHours) },
    { label: "سقف موظفی روزانه", value: fmtHoursFa(standardHours) },
  ];

  if (diffMinutes > 0) {
    rows.push({
      label: "کسری کارکرد فعلی",
      value: fmtHoursFa(diffMinutes / 60),
      color: "var(--amber)",
    });
  } else if (diffMinutes < 0) {
    rows.push({
      label: "اضافه‌کاری تا الان",
      value: fmtHoursFa(Math.abs(diffMinutes) / 60),
      color: "var(--green, #22c55e)",
    });
  } else {
    rows.push({
      label: "وضعیت موظفی",
      value: "تکمیل سقف موظفی 🎉",
      color: "var(--green, #22c55e)",
    });
  }

  if (exitTime) {
    rows.push({ label: "زمان خروج انتخابی", value: exitTime, ltr: true });
  }
  rows.push({ label: "تاریخ", value: dateLabel });

  return (
    <Drawer open={open} onClose={onCancel} title="تأیید ثبت خروج" height="auto">
      <div dir="rtl" style={{ display: "grid", gap: 14, padding: "8px 0" }}>
        <div
          className="row"
          style={{
            borderColor: "var(--amber)",
            background: "rgba(245,158,11,0.08)",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} style={{ color: "var(--amber)", flexShrink: 0 }} />
            <b style={{ fontSize: 14 }}>از ثبت خروج مطمئنی؟</b>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
            با تأیید، روز کاری امروز بسته میشود و امکان ویرایش دیگری نخواهد بود. خلاصه زیر را بررسی کن:
          </p>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "9px 12px",
                border: "2px solid #000",
                borderRadius: 12,
                background: "var(--card2)",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--muted)", fontWeight: 700 }}>{r.label}</span>
              <b
                className="mono"
                style={{
                  direction: r.ltr ? "ltr" : "rtl",
                  unicodeBidi: "plaintext",
                  color: r.color || "inherit",
                }}
              >
                {r.value}
              </b>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <Button
            variant="primary"
            style={{ padding: "12px", fontWeight: 800, fontSize: 13 }}
            loading={loading}
            loadingText="در حال ثبت..."
            onClick={onConfirm}
          >
            بله، خروج ثبت شود
          </Button>
          <Button variant="ghost" style={{ padding: "10px", fontSize: 12 }} disabled={loading} onClick={onCancel}>
            انصراف
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

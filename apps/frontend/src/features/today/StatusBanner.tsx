import { AlertCircle, CheckCircle, Info, Sparkles } from "lucide-react";
import { Button } from "../../shared/ui/Button";

interface StatusBannerProps {
  day_status: string | null;
  day_status_label: string | null;
  day_status_reason: string | null;
  holidayName: string;
  showHolidayGate: boolean;
  holidayOptIn: boolean;
  onOptInChange: (optIn: boolean) => void;
}

export function StatusBanner({
  day_status,
  day_status_label,
  day_status_reason,
  holidayName,
  showHolidayGate,
  holidayOptIn,
  onOptInChange,
}: StatusBannerProps) {
  const bannerReason = day_status_reason || day_status_label || null;

  if (showHolidayGate) {
    return (
      <div
        className="card"
        style={{
          display: "grid",
          gap: 14,
          textAlign: "center",
          padding: "20px 16px",
          borderColor: "var(--amber)",
          background: "linear-gradient(180deg, var(--card) 0%, var(--card2) 100%)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            border: "2px solid #000",
            background: "linear-gradient(135deg, var(--amber), var(--amber-2))",
            display: "grid",
            placeItems: "center",
            margin: "0 auto",
            boxShadow: "3px 3px 0 #000",
            fontSize: 24,
          }}
        >
          🏖️
        </div>
        <div>
          <b style={{ fontSize: 16, color: "var(--text)" }}>امروز {holidayName} — تعطیل رسمی</b>
          <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
            آیا مایلید امروز هم مشغول به کار باشید؟ با انتخاب «بله»، دکمه‌های ثبت تردد فعال شده و کارکرد به عنوان اضافه‌کاری منظور می‌گردد.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
          <Button
            variant="primary"
            style={{ padding: "10px", fontWeight: 800, fontSize: 12 }}
            onClick={() => onOptInChange(true)}
          >
            بله، کار می‌کنم
          </Button>
          <Button
            variant="ghost"
            style={{ padding: "10px", fontSize: 12 }}
            onClick={() => onOptInChange(false)}
          >
            نه، روز تعطیله
          </Button>
        </div>
      </div>
    );
  }

  let banner = null;
  if (day_status === "holiday") {
    const label =
      day_status_reason ||
      (holidayName ? `امروز تعطیل رسمی است (${holidayName})` : day_status_label ? `${day_status_label}` : "امروز تعطیل است");
    banner = (
      <div
        className="card"
        style={{
          borderColor: "var(--amber, #f59e0b)",
          background: "rgba(245,158,11,.10)",
          color: "var(--amber, #92400e)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
        }}
      >
        <AlertCircle size={20} style={{ flexShrink: 0, color: "var(--amber)" }} />
        <div>
          <b style={{ fontSize: 13 }}>{label}</b>
          {bannerReason && bannerReason !== label ? (
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{bannerReason}</div>
          ) : null}
        </div>
      </div>
    );
  } else if (day_status === "done") {
    const label = day_status_reason || "امروز قبلاً خروج ثبت شده است";
    banner = (
      <div
        className="card"
        style={{
          borderColor: "var(--green, #22c55e)",
          background: "rgba(34,197,94,.10)",
          color: "var(--green, #166534)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
        }}
      >
        <CheckCircle size={20} style={{ flexShrink: 0, color: "var(--green)" }} />
        <div>
          <b style={{ fontSize: 13 }}>{label}</b>
          {bannerReason && bannerReason !== label ? (
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{bannerReason}</div>
          ) : null}
        </div>
      </div>
    );
  } else if (day_status === "on_leave") {
    const label = day_status_reason || "شما در مرخصی ساعتی هستید";
    banner = (
      <div
        className="card"
        style={{
          borderColor: "#60a5fa",
          background: "rgba(96,165,250,.10)",
          color: "#1e40af",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
        }}
      >
        <Info size={20} style={{ flexShrink: 0, color: "#2563eb" }} />
        <div>
          <b style={{ fontSize: 13 }}>{label}</b>
          {bannerReason && bannerReason !== label ? (
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>{bannerReason}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      {banner}
      {day_status === "holiday" && holidayOptIn && (
        <div
          className="card"
          style={{
            background: "rgba(16,185,129,.08)",
            borderColor: "#10b981",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} style={{ color: "#10b981", flexShrink: 0 }} />
            <small style={{ fontWeight: 800, color: "#047857", fontSize: 12 }}>
              حالت کار در تعطیلی فعال شد — کارکرد شما محاسبه می‌شود.
            </small>
          </div>
          <Button
            variant="ghost"
            className="mono"
            style={{ width: "auto", padding: "4px 10px", fontSize: 11, borderRadius: 8, boxShadow: "1.5px 1.5px 0 #000" }}
            onClick={() => onOptInChange(false)}
          >
            انصراف
          </Button>
        </div>
      )}
    </>
  );
}

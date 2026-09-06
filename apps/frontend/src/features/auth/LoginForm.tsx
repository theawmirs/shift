import { useEffect, useRef } from "react";
import { Send, Copy, Clock3, RefreshCw, XCircle, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/shared/ui/Button";

function QrCanvas({ data, size = 170 }: { data: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || !data) return;

    QRCode.toCanvas(
      c,
      data,
      {
        width: size,
        margin: 2,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      },
      (error) => {
        if (error) console.error("QR Code render error:", error);
      }
    );
  }, [data, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        border: "2.5px solid #000",
        display: "block",
        boxShadow: "3px 3px 0 #000",
      }}
    />
  );
}

interface LoginFormProps {
  phase: "idle" | "loading" | "ready" | "polling" | "expired" | "error";
  err: string;
  remaining: number;
  tgLink: string;
  qrData: string;
  mm: string;
  ss: string;
  onInit: () => void;
  onCopyLink: () => void;
  onReset: () => void;
}

export function LoginForm({
  phase,
  err,
  remaining,
  tgLink,
  qrData,
  mm,
  ss,
  onInit,
  onCopyLink,
  onReset,
}: LoginFormProps) {
  if (phase === "idle" || phase === "loading") {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {err && (
          <div
            style={{
              padding: "10px 12px",
              background: "#FEF2F2",
              border: "2px solid #EF4444",
              borderRadius: 12,
              color: "#B91C1C",
              fontSize: 12,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            <XCircle size={15} style={{ verticalAlign: "middle", marginLeft: 6 }} />
            {err}
          </div>
        )}

        <Button
          onClick={onInit}
          loading={phase === "loading"}
          loadingText="در حال ارتباط با سرور…"
          variant="none"
          style={{
            padding: "14px",
            fontSize: 14,
            fontWeight: 900,
            background: "linear-gradient(135deg, #38BDF8, #0284C7)",
            color: "#fff",
            borderColor: "#000",
          }}
          icon={<Send size={18} />}
        >
          ورود با تلگرام
        </Button>

        <span style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
          با زدن دکمه فوق، لینک یک‌بارمصرف با اعتبار ۳ دقیقه برای شما ایجاد خواهد شد.
        </span>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            padding: "12px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "2px solid var(--red)",
            borderRadius: 14,
            color: "var(--red)",
            fontSize: 12,
            fontWeight: 800,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Clock3 size={16} />
          <span>{err || "زمان اعتبار لینک ورود به پایان رسید."}</span>
        </div>

        <Button
          onClick={onInit}
          variant="primary"
          style={{ padding: "12px", fontWeight: 800 }}
          icon={<RefreshCw size={16} />}
        >
          ایجاد لینک جدید
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14, textAlign: "center" }}>
      {/* Status Pills */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          className="pill"
          style={{
            background: remaining < 30 ? "#FEF2F2" : "#F0FDF4",
            color: remaining < 30 ? "#B91C1C" : "#166534",
            border: "2px solid #000",
            boxShadow: "2px 2px 0 #000",
            fontSize: 12,
          }}
        >
          <Clock3 size={14} /> <b className="mono">{mm}:{ss}</b> تا انقضا
        </span>

        <span
          className="pill"
          style={{
            background: "#EFF6FF",
            color: "#1D4ED8",
            border: "2px solid #000",
            boxShadow: "2px 2px 0 #000",
            fontSize: 11,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span className="spinner" style={{ width: 10, height: 10, borderWidth: 2, borderTopColor: "#1D4ED8" }} />
          <span>در انتظار تأیید شما…</span>
        </span>
      </div>

      {/* QR Code Section with Framing */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px",
          background: "var(--surface-2)",
          border: "2px solid var(--border-strong)",
          borderRadius: 18,
        }}
      >
        <div style={{ padding: 8, background: "#fff", borderRadius: 14, border: "2px solid #000" }}>
          <QrCanvas data={qrData} size={160} />
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
          با دوربین گوشی یا تلگرام اسکن کنید
        </div>
      </div>

      {/* Direct Link Actions */}
      <div style={{ display: "grid", gap: 8 }}>
        <a
          href={tgLink}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary"
          style={{
            padding: "12px",
            fontSize: 13,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            textDecoration: "none",
            background: "linear-gradient(135deg, #38BDF8, #0284C7)",
            color: "#fff",
          }}
        >
          <Send size={16} />
          <span>باز کردن مستقیم ربات در تلگرام</span>
          <ExternalLink size={14} />
        </a>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button
            type="button"
            onClick={onCopyLink}
            className="btn btn-ghost mono"
            style={{ padding: "9px 6px", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
          >
            <Copy size={13} />
            <span>کپی لینک</span>
          </button>

          <button
            type="button"
            onClick={onInit}
            className="btn btn-ghost mono"
            style={{ padding: "9px 6px", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            title="ایجاد لینک و QR کد جدید"
          >
            <RefreshCw size={13} />
            <span>لینک جدید</span>
          </button>
        </div>
      </div>

      <button
        onClick={onReset}
        type="button"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--muted)",
          fontSize: 11,
          cursor: "pointer",
          textDecoration: "underline",
          marginTop: 2,
        }}
      >
        انصراف و لغو فرآیند ورود
      </button>
    </div>
  );
}

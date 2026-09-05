import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Copy, Clock3, RefreshCw, XCircle, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import { apiClient } from "../shared/api/client";
import { authApi } from "../shared/api/endpoints/auth";
import { useToast } from "../shared/ui/Toast";
import { Button } from "../shared/ui/Button";

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

export function LoginPage({ onLogin }: { onLogin: (tokens: any, user: any) => void }) {
  const { push } = useToast();
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "polling" | "expired" | "error">("idle");
  const [initData, setInitData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [remaining, setRemaining] = useState(180);
  const pollRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const verifiedHandledRef = useRef(false);

  const botName = initData?.bot_username || "attloginbot";
  const loginToken = initData?.token || initData?.login_token || "";
  const tgLink = loginToken ? `https://t.me/${botName}?start=${loginToken}` : "";
  const qrData = initData?.qrData || initData?.qr_data || tgLink;

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleInit = async () => {
    clearTimers();
    verifiedHandledRef.current = false;
    setErr("");
    setPhase("loading");
    try {
      const data = await authApi.authTelegramInit();
      setInitData(data);
      setPhase("ready");
      setTimeout(() => {
        const tok = data.token || data.login_token || "";
        if (tok) {
          setPhase("polling");
          const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 180000;
          const tick = () => {
            const sec = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            setRemaining(sec);
            if (sec <= 0) {
              if (pollRef.current) clearInterval(pollRef.current);
              if (timerRef.current) clearInterval(timerRef.current);
              pollRef.current = null;
              timerRef.current = null;
              setPhase("expired");
              setErr("⏰ لینک منقضی شد — لطفاً دوباره تلاش کنید");
            }
          };
          tick();
          timerRef.current = setInterval(tick, 1000);
          pollRef.current = setInterval(async () => {
            if (verifiedHandledRef.current) return;
            try {
              const res = await authApi.authPoll(tok);
              const status =
                res.status || res.state || (res.verified ? "verified" : res.token ? "verified" : "pending");
              if (status === "verified" || res.verified || res.token) {
                if (verifiedHandledRef.current) return;
                verifiedHandledRef.current = true;
                if (pollRef.current) clearInterval(pollRef.current);
                if (timerRef.current) clearInterval(timerRef.current);
                pollRef.current = null;
                timerRef.current = null;
                const jwt = res.token || res.jwt || res.access_token;
                const refresh2 = res.refresh_token || res.refreshToken;
                if (!jwt) throw new Error("توکن دریافتی نامعتبر است");
                try {
                  localStorage.setItem("wt-token", jwt);
                  if (refresh2) localStorage.setItem("wt-refresh-token", refresh2);
                } catch {}
                apiClient.setTokens(jwt, refresh2 || null);
                push("✅ ورود با موفقیت انجام شد — خوش آمدید!");
                onLogin({ access_token: jwt, refresh_token: refresh2, user: res.user || null }, res.user || null);
              } else if (status === "expired") {
                if (pollRef.current) clearInterval(pollRef.current);
                if (timerRef.current) clearInterval(timerRef.current);
                pollRef.current = null;
                timerRef.current = null;
                setPhase("expired");
                setErr("⏰ لینک تلگرام منقضی شد");
              }
            } catch (e: any) {
              const msg = String(e?.message || "");
              if (msg.includes("منقضی") || msg.includes("expired")) {
                if (pollRef.current) clearInterval(pollRef.current);
                if (timerRef.current) clearInterval(timerRef.current);
                pollRef.current = null;
                timerRef.current = null;
                setPhase("expired");
                setErr("⏰ لینک منقضی شد");
              }
            }
          }, 1500);
        }
      }, 50);
    } catch (e: any) {
      setPhase("error");
      setErr(e.message || "خطا در برقراری ارتباط با سرور");
    }
  };

  const copyLink = () => {
    if (!tgLink) return;
    try {
      navigator.clipboard.writeText(tgLink);
      push("📋 لینک ورود کپی شد");
    } catch {
      push("❌ امکان کپی خودکار نیست", "error");
    }
  };

  const reset = () => {
    clearTimers();
    verifiedHandledRef.current = false;
    setPhase("idle");
    setInitData(null);
    setErr("");
    setRemaining(180);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="login-wrapper">
      <div className="login-container card brutal">
        {/* ── Brand Logo & App Intro Header ── */}
        <div style={{ textAlign: "center", display: "grid", gap: 8, justifyItems: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              border: "3px solid #000",
              boxShadow: "4px 4px 0 #000",
              background: "linear-gradient(135deg, var(--amber), var(--amber-2))",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
          >
            <img src="/logo.png" alt="SHIFT" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          <div>
            <h1 className="display" style={{ fontSize: 24, margin: 0, letterSpacing: "-0.01em" }}>
              سامانه حضور و تایم‌شیت شیفت
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
              ثبت هوشمند تردد، مدیریت شیفت‌ها و گزارش‌های کاری
            </p>
          </div>
        </div>

        {/* ── State 1: Idle (Ready to Generate Link) ── */}
        {phase === "idle" || phase === "loading" ? (
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
              onClick={handleInit}
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
        ) : phase === "expired" ? (
          /* ── State 2: Expired ── */
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
              onClick={handleInit}
              variant="primary"
              style={{ padding: "12px", fontWeight: 800 }}
              icon={<RefreshCw size={16} />}
            >
              ایجاد لینک جدید
            </Button>
          </div>
        ) : (
          /* ── State 3: Polling (QR + Telegram Link) ── */
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
                  onClick={copyLink}
                  className="btn btn-ghost mono"
                  style={{ padding: "9px 6px", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                >
                  <Copy size={13} />
                  <span>کپی لینک</span>
                </button>

                <button
                  type="button"
                  onClick={handleInit}
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
              onClick={reset}
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
        )}
      </div>
    </div>
  );
}

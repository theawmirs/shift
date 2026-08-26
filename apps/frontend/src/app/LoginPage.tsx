import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Copy, Clock3, RefreshCw, XCircle, ExternalLink } from "lucide-react";
import { API } from "../shared/lib/api";
import { useToast } from "../shared/ui/Toast";

function QrCanvas({ data, size = 180 }: { data: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !data) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const N = 21; // modules
    const cell = Math.floor(size / N);
    const off = Math.floor((size - N * cell) / 2);
    // hash data to pseudo-random pattern
    let h = 0;
    for (let i = 0; i < data.length; i++) h = ((h << 5) - h + data.charCodeAt(i)) | 0;
    const rnd = (i: number) => {
      const x = Math.sin(h * 9301 + i * 49297) * 233280;
      return x - Math.floor(x);
    };
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    // border
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    // finder patterns (3 corners)
    const drawFinder = (ox: number, oy: number) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(ox, oy, 7 * cell, 7 * cell);
      ctx.fillStyle = "#fff";
      ctx.fillRect(ox + cell, oy + cell, 5 * cell, 5 * cell);
      ctx.fillStyle = "#000";
      ctx.fillRect(ox + 2 * cell, oy + 2 * cell, 3 * cell, 3 * cell);
    };
    drawFinder(off, off);
    drawFinder(off + (N - 7) * cell, off);
    drawFinder(off, off + (N - 7) * cell);
    // data modules
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const inFinder =
          (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8) || x === 8 || y === 8;
        if (inFinder) continue;
        if (rnd(y * N + x) > 0.52) {
          ctx.fillStyle = "#0F172A";
          ctx.fillRect(off + x * cell, off + y * cell, cell - 0.5, cell - 0.5);
        }
      }
    }
  }, [data, size]);
  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: 12, border: "2px solid #000", display: "block" }}
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
    setErr("");
    setPhase("loading");
    try {
      const data = await API.authTelegramInit();
      setInitData(data);
      setPhase("ready");
      // start polling after state is set
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
              setErr("⏰ لینک منقضی شد — دوباره تلاش کنید");
            }
          };
          tick();
          timerRef.current = setInterval(tick, 1000);
          pollRef.current = setInterval(async () => {
            try {
              const res = await API.authPoll(tok);
              const status =
                res.status || res.state || (res.verified ? "verified" : res.token ? "verified" : "pending");
              if (status === "verified" || res.verified || res.token) {
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
                API.setTokens(jwt, refresh2 || null);
                push("✅ ورود موفق — خوش آمدید!");
                onLogin({ access_token: jwt, refresh_token: refresh2, user: res.user || null }, res.user || null);
              } else if (status === "expired") {
                if (pollRef.current) clearInterval(pollRef.current);
                if (timerRef.current) clearInterval(timerRef.current);
                pollRef.current = null;
                timerRef.current = null;
                setPhase("expired");
                setErr("⏰ توکن منقضی شد");
              } else if (status === "consumed" || status === "used") {
                if (pollRef.current) clearInterval(pollRef.current);
                if (timerRef.current) clearInterval(timerRef.current);
                pollRef.current = null;
                timerRef.current = null;
                setPhase("expired");
                setErr("این لینک قبلاً استفاده شده — لینک جدید بسازید");
              }
            } catch (e: any) {
              const msg = String(e.message || "");
              if (msg.includes("404") || msg.includes("not found") || msg.includes("expired")) {
                if (pollRef.current) clearInterval(pollRef.current);
                if (timerRef.current) clearInterval(timerRef.current);
                pollRef.current = null;
                timerRef.current = null;
                setPhase("expired");
                setErr("لینک منقضی یا نامعتبر است");
              }
            }
          }, 2000);
        }
      }, 100);
    } catch (e: any) {
      setPhase("error");
      setErr(e.message || "خطا در ایجاد لینک ورود");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tgLink);
      push("📋 لینک کپی شد");
    } catch {
      push("❌ کپی ناموفق بود", "error");
    }
  };

  const reset = () => {
    clearTimers();
    setInitData(null);
    setErr("");
    setRemaining(180);
    setPhase("idle");
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="login-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="login-card"
        style={{ maxWidth: 400 }}
      >
        <div className="login-icon">
          <Send size={28} strokeWidth={2.5} />
        </div>
        <h1 className="login-title">حضور و غیاب</h1>
        <p className="login-subtitle">ورود امن با تلگرام</p>

        <AnimatePresence mode="wait">
          {phase === "idle" || phase === "loading" || phase === "error" ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "grid", gap: 14 }}
            >
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
                  <XCircle size={14} style={{ verticalAlign: "middle", marginLeft: 6 }} />
                  {err}
                </div>
              )}
              <button
                onClick={handleInit}
                disabled={phase === "loading"}
                className="login-btn"
                style={{ background: "linear-gradient(135deg,#229ED9,#1a7db5)" }}
              >
                {phase === "loading" ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <Send size={18} />
                    <span>ورود با تلگرام</span>
                  </>
                )}
              </button>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "var(--muted)",
                  lineHeight: 1.6,
                  textAlign: "center",
                }}
              >
                با زدن دکمه، لینک یک‌بارمصرف تلگرام ساخته می‌شود (اعتبار ۳ دقیقه)
              </p>
            </motion.div>
          ) : phase === "expired" ? (
            <motion.div
              key="expired"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "grid", gap: 14 }}
            >
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
                <Clock3 size={14} style={{ verticalAlign: "middle", marginLeft: 6 }} />
                {err || "لینک منقضی شد"}
              </div>
              <button onClick={reset} className="login-btn">
                <RefreshCw size={18} />
                <span>لینک جدید</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="polling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "grid", gap: 14, textAlign: "center" }}
            >
              {/* Timer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                <span
                  className="pill"
                  style={{
                    background: remaining < 30 ? "#FEF2F2" : "#F0FDF4",
                    color: remaining < 30 ? "#B91C1C" : "#166534",
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0 #000",
                  }}
                >
                  <Clock3 size={14} /> {mm}:{ss}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>تا انقضا</span>
                <span
                  className="pill"
                  style={{
                    background: "#EFF6FF",
                    color: "#1D4ED8",
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0 #000",
                    fontSize: 10,
                  }}
                >
                  <span
                    className="spinner"
                    style={{
                      width: 12,
                      height: 12,
                      borderWidth: 2,
                      borderTopColor: "#1D4ED8",
                      borderColor: "rgba(29,78,216,.2)",
                    }}
                  />{" "}
                  در انتظار تأیید…
                </span>
              </div>

              {/* QR */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    padding: 10,
                    background: "#fff",
                    borderRadius: 16,
                    border: "3px solid #000",
                    boxShadow: "4px 4px 0 #000",
                  }}
                >
                  <QrCanvas data={qrData} size={180} />
                </div>
              </div>

              {/* Link card */}
              <div
                style={{
                  background: "rgba(255,255,255,.06)",
                  border: "2px solid rgba(255,255,255,.08)",
                  borderRadius: 14,
                  padding: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>لینک ورود تلگرام</div>
                <div
                  style={{
                    background: "#fff",
                    border: "2px solid #000",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#0F172A",
                    wordBreak: "break-all",
                    direction: "ltr",
                    textAlign: "left",
                    boxShadow: "3px 3px 0 #000",
                  }}
                >
                  {tgLink}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href={tgLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: 13,
                      padding: "10px 12px",
                    }}
                  >
                    <ExternalLink size={16} /> باز کردن در تلگرام
                  </a>
                  <button onClick={handleCopy} className="btn btn-ghost" style={{ width: "auto", padding: "10px 14px" }}>
                    <Copy size={16} />
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
                  ربات <b style={{ color: "var(--text)" }}>@{botName}</b> را باز کنید و <b>Start</b> بزنید تا ورود
                  تأیید شود.
                </p>
              </div>

              <button onClick={reset} className="btn btn-ghost" style={{ fontSize: 12 }}>
                <RefreshCw size={14} /> لینک جدید
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

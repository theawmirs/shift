import { useEffect, useRef, useState, useCallback } from "react";
import { apiClient } from "@/shared/api/client";
import { authApi } from "@/shared/api/endpoints/auth";
import { useToast } from "@/shared/ui/Toast";

export function useLoginForm(onLogin: (tokens: any, user: any) => void) {
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

  return {
    phase,
    err,
    remaining,
    tgLink,
    qrData,
    mm,
    ss,
    handleInit,
    copyLink,
    reset,
  };
}

import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { queryClient } from "../shared/api/queryClient";
import { AuthContext } from "../shared/lib/auth";
import { Topbar, BottomNav, DesktopSidebar } from "../shared/ui/Chrome";
import { LoginPage } from "../pages/LoginPage";
import { AppRoutes } from "./router";
import { apiClient } from "../shared/api/client";
import { authApi } from "../shared/api/endpoints/auth";
import { User } from "../shared/types";

export function Shell() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const s = localStorage.getItem("wt-theme");
      if (s === "light" || s === "dark") return s;
    } catch {}
    return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem("wt-token"); } catch { return null; }
  });
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("wt-theme", theme); } catch {}
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.setHeaderColor) {
      try { tg.setHeaderColor(theme === "light" ? "#FFF7ED" : "#0F172A"); } catch {}
    }
  }, [theme]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      try {
        localStorage.removeItem("wt-token");
        localStorage.removeItem("wt-refresh-token");
      } catch {}
      apiClient.clearTokens();
      queryClient.clear();
    };

    apiClient.setOnUnauthorized(handleUnauthorized);
    window.addEventListener("wt:unauthorized", handleUnauthorized);

    return () => {
      apiClient.setOnUnauthorized(null);
      window.removeEventListener("wt:unauthorized", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    apiClient.setToken(token);
    try {
      const rt = localStorage.getItem("wt-refresh-token");
      if (rt) apiClient.setRefreshToken(rt);
    } catch {}
    authApi.authMe()
      .then((data: any) => {
        const u = data.user || data;
        setUser(u);
      })
      .catch(async () => {
        try {
          await apiClient._doRefresh();
          const data2 = await authApi.authMe();
          const u2 = data2.user || data2;
          const nt = apiClient.getToken();
          if (nt) { setToken(nt); setUser(u2); setChecking(false); return; }
        } catch (refreshErr: any) {
          // If refresh failed during initial check, log user out immediately
          setToken(null);
          setUser(null);
          try {
            localStorage.removeItem("wt-token");
            localStorage.removeItem("wt-refresh-token");
          } catch {}
          apiClient.clearTokens();
          queryClient.clear();
        }
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = useCallback((t: any, u?: User | null) => {
    let access = t;
    let refresh: string | null = null;
    if (t && typeof t === "object") {
      access = t.access_token || t.jwt || t.token;
      refresh = t.refresh_token || t.refreshToken || null;
      u = u || t.user || null;
    }
    setToken(access);
    try {
      localStorage.setItem("wt-token", access);
      if (refresh) localStorage.setItem("wt-refresh-token", refresh);
      else if (u && ((u as any).refresh_token || (u as any).refreshToken)) {
        localStorage.setItem("wt-refresh-token", (u as any).refresh_token || (u as any).refreshToken);
      }
    } catch {}
    apiClient.setTokens(access, refresh || (u as any)?.refresh_token || (u as any)?.refreshToken || null);
    if (u) setUser(u);
    else {
      authApi.authMe().then((data: any) => setUser(data.user || data)).catch(() => {});
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try { await authApi.authLogout(); } catch {}
    setToken(null);
    setUser(null);
    try { localStorage.removeItem("wt-token"); localStorage.removeItem("wt-refresh-token"); } catch {}
    apiClient.clearTokens();
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname === "/" ? "today" : location.pathname.slice(1);

  if (checking) return <div className="app safe" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100dvh" }}><span className="spinner" /></div>;

  if (!token) return <LoginPage onLogin={handleLogin} />;

  return (
    <AuthContext.Provider value={{ user, setUser, logout: handleLogout, token }}>
      <div className="app safe desktop-layout-container">
        {/* Desktop Sidebar (visible on md/lg desktop screens) */}
        <DesktopSidebar
          active={tab}
          onChange={(to) => navigate(to)}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        />

        {/* Main Application Area */}
        <div className="desktop-main-wrapper">
          {/* Mobile Topbar */}
          <Topbar theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />

          <main className="content">
            <AppRoutes />
          </main>
        </div>

        {/* Mobile Bottom Navigation (hidden on desktop) */}
        <BottomNav active={tab} onChange={(to) => navigate(to)} />
      </div>
    </AuthContext.Provider>
  );
}

import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../shared/api/queryClient";
import { ToastProvider } from "../shared/ui/Toast";
import { AttendanceProvider } from "../shared/lib/attendance";
import { AuthContext } from "../shared/lib/auth";
import { Topbar, BottomNav, DesktopSidebar } from "../shared/ui/Chrome";
import { TodayPage } from "./TodayPage";
import { WeekPage } from "./WeekPage";
import { TasksPage } from "./TasksPage";
import { SettingsPage } from "./SettingsPage";
import { CalendarPage } from "../pages/CalendarPage";
import { LeavesPage } from "./LeavesPage";
import { LoginPage } from "./LoginPage";
import { API } from "../shared/lib/api";
import { User } from "../shared/types";

function Shell() {
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
      API.clearTokens();
      queryClient.clear();
    };

    API.setOnUnauthorized(handleUnauthorized);
    window.addEventListener("wt:unauthorized", handleUnauthorized);

    return () => {
      API.setOnUnauthorized(null);
      window.removeEventListener("wt:unauthorized", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    API.setToken(token);
    try {
      const rt = localStorage.getItem("wt-refresh-token");
      if (rt) API.setRefreshToken(rt);
    } catch {}
    API.authMe()
      .then((data: any) => {
        const u = data.user || data;
        setUser(u);
      })
      .catch(async () => {
        try {
          await API._doRefresh();
          const data2 = await API.authMe();
          const u2 = data2.user || data2;
          const nt = API.getToken();
          if (nt) { setToken(nt); setUser(u2); setChecking(false); return; }
        } catch (refreshErr: any) {
          // If refresh failed during initial check, log user out immediately
          setToken(null);
          setUser(null);
          try {
            localStorage.removeItem("wt-token");
            localStorage.removeItem("wt-refresh-token");
          } catch {}
          API.clearTokens();
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
    API.setTokens(access, refresh || (u as any)?.refresh_token || (u as any)?.refreshToken || null);
    if (u) setUser(u);
    else {
      API.authMe().then((data: any) => setUser(data.user || data)).catch(() => {});
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try { await API.authLogout(); } catch {}
    setToken(null);
    setUser(null);
    try { localStorage.removeItem("wt-token"); localStorage.removeItem("wt-refresh-token"); } catch {}
    API.clearTokens();
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
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<TodayPage />} />
              <Route path="/reports" element={<WeekPage />} />
              <Route path="/week" element={<WeekPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/leaves" element={<LeavesPage />} />
            </Routes>
          </main>
        </div>

        {/* Mobile Bottom Navigation (hidden on desktop) */}
        <BottomNav active={tab} onChange={(to) => navigate(to)} />
      </div>
    </AuthContext.Provider>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AttendanceProvider>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </AttendanceProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;

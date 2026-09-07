import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, idbPersister } from "../shared/api/queryClient";
import { ToastProvider } from "../shared/ui/Toast";
import { AttendanceProvider } from "../shared/lib/attendance";
import { AuthContext } from "../shared/lib/auth";
import { Topbar, BottomNav, DesktopSidebar } from "../shared/ui/Chrome";
import { OfflineBanner } from "../shared/ui/OfflineBanner";
import { processOfflineOutbox } from "../shared/lib/offlineSync";
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
  const [user, setUser] = useState<User | null>(() => {
    try {
      const s = localStorage.getItem("wt-user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
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
        localStorage.removeItem("wt-user");
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

    // If offline, do NOT try network auth — use cached token & user safely
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setChecking(false);
      return;
    }

    API.authMe()
      .then((data: any) => {
        const u = data.user || data;
        setUser(u);
        try { localStorage.setItem("wt-user", JSON.stringify(u)); } catch {}
        // If online and connected, attempt to sync any pending outbox items
        processOfflineOutbox().catch(() => {});
      })
      .catch(async (err: any) => {
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        const isNetErr =
          err?.name === "TypeError" ||
          String(err?.message || "").toLowerCase().includes("network") ||
          String(err?.message || "").toLowerCase().includes("fetch");

        // If it was just a network error, keep current session alive!
        if (isOffline || isNetErr) {
          setChecking(false);
          return;
        }

        try {
          await API._doRefresh();
          const data2 = await API.authMe();
          const u2 = data2.user || data2;
          const nt = API.getToken();
          if (nt) {
            setToken(nt);
            setUser(u2);
            try { localStorage.setItem("wt-user", JSON.stringify(u2)); } catch {}
            setChecking(false);
            return;
          }
        } catch (refreshErr: any) {
          const isRefreshNetErr =
            typeof navigator !== "undefined" && !navigator.onLine ||
            String(refreshErr?.message || "").toLowerCase().includes("fetch");

          if (!isRefreshNetErr) {
            setToken(null);
            setUser(null);
            try {
              localStorage.removeItem("wt-token");
              localStorage.removeItem("wt-refresh-token");
              localStorage.removeItem("wt-user");
            } catch {}
            API.clearTokens();
            queryClient.clear();
          }
        }
      })
      .finally(() => setChecking(false));
  }, [token]);

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
      if (u) localStorage.setItem("wt-user", JSON.stringify(u));
    } catch {}
    API.setTokens(access, refresh || (u as any)?.refresh_token || (u as any)?.refreshToken || null);
    if (u) setUser(u);
    else {
      API.authMe().then((data: any) => {
        const usr = data.user || data;
        setUser(usr);
        try { localStorage.setItem("wt-user", JSON.stringify(usr)); } catch {}
      }).catch(() => {});
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try { await API.authLogout(); } catch {}
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem("wt-token");
      localStorage.removeItem("wt-refresh-token");
      localStorage.removeItem("wt-user");
    } catch {}
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
          {/* Offline / Syncing Global Banner */}
          <OfflineBanner />

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days cache retention
      }}
    >
      <ToastProvider>
        <AttendanceProvider>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </AttendanceProvider>
      </ToastProvider>
    </PersistQueryClientProvider>
  );
}

export default App;

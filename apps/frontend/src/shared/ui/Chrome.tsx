import { Clock3, BarChart3, Calendar, ListChecks, Settings, Sun, Moon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export interface TopbarProps {
  theme: "light" | "dark" | string;
  onToggleTheme: () => void;
}

export function Topbar({
  theme,
  onToggleTheme,
}: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = location.pathname === "/settings";

  return (
    <div className="topbar">
      <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        <img
          src="/logo.png"
          alt="SHIFT"
          className="mark"
          style={{ objectFit: "cover", padding: 0 }}
        />
        <div>
          <h1 className="display">SHIFT</h1>
        </div>
      </div>
      <div className="top-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className="theme-btn"
          onClick={() => navigate(isSettings ? "/" : "/settings")}
          aria-label="settings"
          style={{
            background: isSettings ? "var(--amber)" : "#fff",
            color: "#0F172A",
            padding: "8px 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Settings size={16} />
          <span>تنظیمات</span>
        </button>
        <button className="theme-btn" onClick={onToggleTheme} aria-label="toggle theme">
          {theme === "dark" ? (
            <>
              <Sun size={16} /> لایت
            </>
          ) : (
            <>
              <Moon size={16} /> دارک
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function BottomNav({ active, onChange }: { active: string; onChange: (to: string) => void }) {
  const items = [
    { k: "today", to: "/", label: "امروز", Icon: Clock3 },
    { k: "reports", to: "/reports", label: "گزارش‌ها", Icon: BarChart3 },
    { k: "calendar", to: "/calendar", label: "تقویم", Icon: Calendar },
    { k: "tasks", to: "/tasks", label: "تسک‌ها", Icon: ListChecks },
  ];
  return (
    <nav className="bottom-nav" aria-label="bottom navigation">
      {items.map((it) => (
        <button
          key={it.k}
          className={`bn-item ${active === it.k ? "active" : ""}`}
          onClick={() => onChange(it.to)}
          aria-current={active === it.k ? "page" : undefined}
        >
          <it.Icon size={18} />
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

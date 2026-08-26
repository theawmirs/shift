import { Clock3, BarChart3, ListChecks, Settings2, Sun, Moon } from "lucide-react";

export interface TopbarProps {
  theme: "light" | "dark" | string;
  onToggleTheme: () => void;
}

export function Topbar({
  theme,
  onToggleTheme,
}: TopbarProps) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="mark">◈</div>
        <div>
          <h1 className="display">SHIFT</h1>
        </div>
      </div>
      <div className="top-actions" style={{ gap: 8 }}>
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
    { k: "week", to: "/week", label: "هفته", Icon: BarChart3 },
    { k: "tasks", to: "/tasks", label: "تسک‌ها", Icon: ListChecks },
    { k: "settings", to: "/settings", label: "تنظیمات", Icon: Settings2 },
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

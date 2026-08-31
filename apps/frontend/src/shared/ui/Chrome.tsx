import {
  Clock3,
  BarChart3,
  Calendar,
  ListChecks,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export interface TopbarProps {
  theme: "light" | "dark" | string;
  onToggleTheme: () => void;
}

export function Topbar({ theme, onToggleTheme }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = location.pathname === "/settings";

  return (
    <header className="topbar">
      <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        <img src="/logo.png" alt="SHIFT" className="mark" style={{ objectFit: "cover", padding: 0 }} />
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
          <span className="desktop-only-inline">تنظیمات</span>
        </button>

        <button className="theme-btn" onClick={onToggleTheme} aria-label="toggle theme">
          {theme === "dark" ? (
            <>
              <Sun size={16} /> <span className="desktop-only-inline">روشن</span>
            </>
          ) : (
            <>
              <Moon size={16} /> <span className="desktop-only-inline">تاریک</span>
            </>
          )}
        </button>
      </div>
    </header>
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
    <nav className="bottom-nav mobile-only" aria-label="bottom navigation">
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

export function DesktopSidebar({
  active,
  onChange,
  theme,
  onToggleTheme,
}: {
  active: string;
  onChange: (to: string) => void;
  theme: string;
  onToggleTheme: () => void;
}) {
  const { user } = useAuth();
  const location = useLocation();

  const items = [
    { k: "today", to: "/", label: "امروز و تردد", desc: "ثبت زنده ورود و خروج", Icon: Clock3 },
    { k: "reports", to: "/reports", label: "گزارش عملکرد", desc: "کارکرد ماهانه و هفتگی", Icon: BarChart3 },
    { k: "calendar", to: "/calendar", label: "تقویم شمسی", desc: "روزها و تعطیلات رسمی", Icon: Calendar },
    { k: "tasks", to: "/tasks", label: "مدیریت تسک‌ها", desc: "وظایف و پیگیری کارها", Icon: ListChecks },
  ];

  const dn =
    (user as any)?.display_name ||
    (user as any)?.displayName ||
    [(user as any)?.first_name, (user as any)?.last_name].filter(Boolean).join(" ") ||
    "کاربر شیفت";
  const username = (user as any)?.username ? `@${(user as any).username}` : "—";
  const initials = dn.slice(0, 2).toUpperCase();
  const photo = (user as any)?.photo_url || (user as any)?.photoUrl || "";

  return (
    <aside className="desktop-sidebar">
      {/* ── Brand Logo Header ── */}
      <div
        className="sidebar-brand"
        onClick={() => onChange("/")}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12, paddingBottom: 16 }}
      >
        <img src="/logo.png" alt="SHIFT" className="mark" style={{ width: 44, height: 44, borderRadius: 14 }} />
        <div>
          <h1 className="display" style={{ fontSize: 20, margin: 0, letterSpacing: "-0.01em" }}>
            SHIFT APP
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
            سامانه مدیریت حضور و تایم‌شیت
          </p>
        </div>
      </div>

      {/* ── Navigation Links ── */}
      <nav style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: "var(--muted2)", letterSpacing: "0.1em", paddingRight: 6 }}>
          ناوبری اصلی
        </span>
        {items.map((it) => {
          const isActive = active === it.k;
          const Icon = it.Icon;
          return (
            <button
              key={it.k}
              onClick={() => onChange(it.to)}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
            >
              <div className="nav-icon-wrap">
                <Icon size={18} />
              </div>
              <div style={{ textAlign: "right", flex: 1, minWidth: 0 }}>
                <div className="nav-title">{it.label}</div>
                <div className="nav-desc">{it.desc}</div>
              </div>
              {isActive && <span className="active-dot" />}
            </button>
          );
        })}
      </nav>

      {/* ── Settings & System Info ── */}
      <div style={{ marginTop: "auto", display: "grid", gap: 10, paddingTop: 16 }}>
        <button
          onClick={() => onChange("/settings")}
          className={`sidebar-nav-item ${location.pathname === "/settings" ? "active" : ""}`}
        >
          <div className="nav-icon-wrap">
            <Settings size={18} />
          </div>
          <div style={{ textAlign: "right", flex: 1 }}>
            <div className="nav-title">تنظیمات سیستم</div>
            <div className="nav-desc">ساعت کاری، قرارداد و پشتیبان</div>
          </div>
        </button>

        {/* User Mini Profile Card */}
        <div className="sidebar-profile-card">
          {photo ? (
            <img
              src={photo}
              alt={dn}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                border: "2px solid #000",
                boxShadow: "2px 2px 0 #000",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                border: "2px solid #000",
                background: "linear-gradient(135deg, var(--amber), var(--amber-2))",
                color: "#0F172A",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                fontSize: 14,
                boxShadow: "2px 2px 0 #000",
              }}
            >
              {initials}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {dn}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", direction: "ltr", textAlign: "right" }}>
              {username}
            </div>
          </div>

          <button
            className="theme-btn"
            style={{ padding: "6px", width: 32, height: 32, flexShrink: 0, boxShadow: "2px 2px 0 #000" }}
            onClick={onToggleTheme}
            title={theme === "dark" ? "تغییر به تم روشن" : "تغییر به تم تاریک"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

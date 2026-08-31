import { useState } from "react";
import { User as UserIcon, LogOut, Save, CheckCircle2, ShieldCheck } from "lucide-react";
import { API } from "../../shared/lib/api";
import { useAuth } from "../../shared/lib/auth";
import { useToast } from "../../shared/ui/Toast";

function displayNameOf(u: any): string {
  if (!u) return "";
  return (
    u.display_name ||
    u.displayName ||
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    (u.username ? `@${u.username}` : "") ||
    "کاربر"
  );
}

export function ProfileCard() {
  const { user, setUser, logout } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState(() => (user as any)?.display_name || (user as any)?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const dn = displayNameOf(user);
  const photo = (user as any)?.photo_url || (user as any)?.photoUrl || "";
  const username = (user as any)?.username ? `@${(user as any).username}` : "—";
  const initials = dn.slice(0, 2).toUpperCase();

  const onSave = async () => {
    const v = name.trim();
    if (v.length < 2 || v.length > 30) {
      push("❌ نام نمایشی باید ۲ تا ۳۰ کاراکتر باشد", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await API.authUpdateMe(v);
      const updated = res.user || res;
      setUser((prev: any) => ({ ...(prev || {}), ...updated, display_name: updated.display_name || v }));
      push("✅ نام نمایشی ذخیره شد");
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await API.authLogout();
    } catch {}
    try {
      localStorage.removeItem("wt-token");
    } catch {}
    API.setToken(null);
    setUser(null);
    await logout();
    push("خارج شدید — دوباره وارد شوید");
    window.location.href = "/";
  };

  return (
    <div className="card" style={{ display: "grid", gap: 16 }}>
      {/* ── Header ── */}
      <div className="section-head" style={{ margin: 0 }}>
        <div>
          <div className="kicker">ACCOUNT & PROFILE</div>
          <h2 className="display" style={{ fontSize: 18, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
            <UserIcon size={18} /> اطلاعات کاربری
          </h2>
        </div>
        <span className="badge badge-ok" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10 }}>
          <ShieldCheck size={12} /> احراز هویت شده
        </span>
      </div>

      {/* ── Avatar & Identity Overview ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 12px",
          background: "var(--surface-2)",
          border: "2px solid var(--border-strong)",
          borderRadius: 16,
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={dn}
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              border: "2.5px solid #000",
              boxShadow: "3px 3px 0 #000",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              border: "2.5px solid #000",
              boxShadow: "3px 3px 0 #000",
              background: "linear-gradient(135deg, var(--amber), var(--amber-2))",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 18,
              color: "#0F172A",
            }}
          >
            {initials}
          </div>
        )}

        <div style={{ flex: 1, display: "grid", gap: 3 }}>
          <div style={{ fontWeight: 900, fontSize: 15, display: "flex", alignItems: "center", gap: 6, color: "var(--text)" }}>
            <span>{dn}</span>
            <span
              style={{
                background: "#22C55E",
                color: "#052e0b",
                border: "1.5px solid #000",
                borderRadius: 999,
                padding: "1px 6px",
                fontSize: 9,
                fontWeight: 900,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <CheckCircle2 size={10} /> فعال
            </span>
          </div>

          <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, direction: "ltr", textAlign: "right" }}>
            {username}
          </div>
        </div>
      </div>

      {/* ── Edit Display Name Input Group ── */}
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontWeight: 800, fontSize: 12, color: "var(--text)" }}>نام نمایشی در سامانه</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً علی یا امیرحسین"
            maxLength={30}
            className="input"
            style={{ flex: 1 }}
          />
          <button
            onClick={onSave}
            disabled={saving}
            className="btn btn-primary"
            style={{
              width: "auto",
              padding: "10px 16px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "#0F172A" }} />
            ) : (
              <Save size={15} />
            )}
            ذخیره
          </button>
        </div>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          این نام در سربرگ گزارش‌ها و بالای پنل کاربری نمایش داده می‌شود.
        </span>
      </div>

      {/* ── Logout Action Button ── */}
      <button
        onClick={onLogout}
        disabled={loggingOut}
        className="btn"
        style={{
          background: "#EF4444",
          color: "#fff",
          border: "3px solid #000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: loggingOut ? 0.7 : 1,
          padding: "12px",
          fontWeight: 800,
        }}
      >
        {loggingOut ? (
          <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
        ) : (
          <LogOut size={16} />
        )}
        خروج از حساب کاربری
      </button>
    </div>
  );
}

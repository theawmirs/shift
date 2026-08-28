import { useEffect, useState } from "react";
import { User as UserIcon, LogOut, Save, CheckCircle2 } from "lucide-react";
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

  useEffect(() => {
    // keep input in sync when user loads
    if (user) setName((user as any).display_name || (user as any).displayName || "");
  }, [(user as any)?.display_name, (user as any)?.displayName]);

  // fetch fresh /me if user not yet loaded (e.g. hard refresh)
  useEffect(() => {
    if (!user) {
      API.authMe()
        .then((d) => {
          const u = d.user || d;
          setUser(u);
          setName(u.display_name || u.displayName || "");
        })
        .catch(() => {});
    }
  }, []);

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
    // force reload to LoginPage (App will render LoginPage when token is null)
    window.location.href = "/";
  };

  return (
    <div className="card" style={{ display: "grid", gap: 14 }}>
    
      <div className="section-head" style={{ margin: 0 }}>
        <h2 className="display" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UserIcon size={18} /> پروفایل
        </h2>
        <span className="kicker mono">حساب کاربری</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {photo ? (
          <img
            src={photo}
            alt={dn}
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              border: "3px solid #000",
              boxShadow: "4px 4px 0 #000",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              border: "3px solid #000",
              boxShadow: "4px 4px 0 #000",
              background: "linear-gradient(135deg,var(--amber),var(--amber-2))",
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
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
            {dn}{" "}
            <span
              style={{
                background: "#22C55E",
                color: "#052e0b",
                border: "2px solid #000",
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <CheckCircle2 size={12} /> متصل
            </span>
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700, direction: "ltr", textAlign: "right" }}>
            {username}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ fontWeight: 800, fontSize: 12 }}>نام نمایشی</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً علی"
            maxLength={30}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 14,
              border: "3px solid #000",
              background: "#fff",
              color: "#0F172A",
              fontWeight: 800,
              fontFamily: "YekanBakh, sans-serif",
              boxShadow: "3px 3px 0 #000",
              outline: "none",
            }}
          />
          <button
            onClick={onSave}
            disabled={saving}
            className="btn btn-primary"
            style={{
              width: "auto",
              padding: "10px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <span
                className="spinner"
                style={{
                  width: 16,
                  height: 16,
                  borderWidth: 2,
                  borderTopColor: "#0F172A",
                  borderColor: "rgba(15,23,42,.2)",
                }}
              />
            ) : (
              <Save size={16} />
            )}
            ذخیره
          </button>
        </div>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          ۲ تا ۳۰ کاراکتر — در همه‌جا به همین نام نمایش داده می‌شوید.
        </span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ fontWeight: 800, fontSize: 12 }}>نام کاربری تلگرام</label>
        <input
          value={username}
          readOnly
          disabled
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "2px solid var(--border-strong)",
            background: "rgba(255,255,255,.06)",
            color: "var(--muted)",
            fontWeight: 700,
            fontFamily: "YekanBakh, sans-serif",
          }}
        />
      </div>

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
        }}
      >
        {loggingOut ? (
          <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
        ) : (
          <LogOut size={18} />
        )}
        خروج از حساب
      </button>
    </div>
  );
}

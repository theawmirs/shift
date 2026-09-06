export function LoginBranding() {
  return (
    <div style={{ textAlign: "center", display: "grid", gap: 8, justifyItems: "center" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          border: "3px solid #000",
          boxShadow: "4px 4px 0 #000",
          background: "linear-gradient(135deg, var(--amber), var(--amber-2))",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        <img src="/logo.png" alt="SHIFT" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      <div>
        <h1 className="display" style={{ fontSize: 24, margin: 0, letterSpacing: "-0.01em" }}>
          سامانه حضور و تایم‌شیت شیفت
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
          ثبت هوشمند تردد، مدیریت شیفت‌ها و گزارش‌های کاری
        </p>
      </div>
    </div>
  );
}

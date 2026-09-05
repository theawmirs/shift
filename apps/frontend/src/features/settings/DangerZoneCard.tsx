import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { apiClient } from "../../shared/api/client";
import { authApi } from "../../shared/api/endpoints/auth";
import { useAuth } from "../../shared/lib/auth";
import { useToast } from "../../shared/ui/Toast";
import { Button } from "../../shared/ui/Button";
import { Drawer } from "../../shared/ui/Drawer";

export function DangerZoneCard() {
  const { setUser, logout } = useAuth();
  const { push } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await authApi.authDeleteMe();
      try {
        localStorage.removeItem("wt-token");
      } catch {}
      apiClient.setToken(null);
      setUser(null);
      await logout();
      push("حساب کاربری شما و کلیه اطلاعات با موفقیت و برای همیشه حذف شد", "success");
      window.location.href = "/";
    } catch (e: any) {
      push(`❌ ${e.message || "خطا در حذف حساب کاربری"}`, "error");
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        display: "grid",
        gap: 14,
        border: "2px solid #EF4444",
        background: "rgba(239, 68, 68, 0.03)",
      }}
    >
      <div className="section-head" style={{ margin: 0 }}>
        <div>
          <div className="kicker" style={{ color: "#EF4444" }}>DANGER ZONE</div>
          <h2 className="display" style={{ fontSize: 18, marginTop: 2, display: "flex", alignItems: "center", gap: 8, color: "#EF4444" }}>
            <AlertTriangle size={18} /> منطقه خطر
          </h2>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
        حذف حساب کاربری غیرقابل بازگشت است و تمام ساعت‌های کاری، مرخصی‌ها، وظایف و تنظیمات شما برای همیشه به صورت کامل پاک خواهد شد.
      </p>

      <Button
        onClick={() => setConfirmOpen(true)}
        variant="danger"
        style={{
          padding: "12px",
          fontWeight: 800,
        }}
        icon={<Trash2 size={16} />}
      >
        حذف دائمی حساب کاربری
      </Button>

      <Drawer
        open={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        title="تایید حذف دائمی حساب"
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1.5px solid #EF4444",
              color: "#EF4444",
              fontSize: 13,
              lineHeight: 1.6,
              fontWeight: 700,
            }}
          >
            ⚠️ توجه: این عملیات به هیچ عنوان قابل بازگشت نیست! با تایید این بخش، تمامی لاگ‌های تردد، رکوردهای مرخصی، وظایف و نشست‌های کاربری شما فوراً از سرور پاک می‌شوند.
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={deleting}
              loadingText="در حال پاکسازی و حذف کامل…"
              icon={<Trash2 size={16} />}
            >
              بله، حساب من را برای همیشه حذف کن
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              انصراف
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

import { useEffect, useState } from "react";
import { AlertTriangle, Download, ChevronDown, Sliders, FileSpreadsheet, Save, Home, Building2 } from "lucide-react";
import { API } from "../../shared/lib/api";
import { useToast } from "../../shared/ui/Toast";
import { CardSkeleton } from "../../shared/ui/Skeleton";
import { useSettingsQuery, useMonthsQuery, useUpdateSettingsMutation } from "../../shared/api/queries";

export function SettingsForm() {
  const { push } = useToast();
  const settingsQuery = useSettingsQuery();
  const monthsQuery = useMonthsQuery();
  const updateSettingsMutation = useUpdateSettingsMutation();

  const [values, setValues] = useState<Record<string, string>>({
    start_time: "07:00",
    start_time_end: "09:15",
    end_time: "15:00",
    end_time_end: "17:15",
    standard_hours: "8",
    leave_quota_hours: "208",
    default_work_mode: "office",
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [selMonth, setSelMonth] = useState("");
  const [dlLoading, setDlLoading] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      setValues((v) => ({ ...v, ...settingsQuery.data }));
    }
  }, [settingsQuery.data]);

  const months = monthsQuery.data?.months || [];

  useEffect(() => {
    if (!selMonth && months.length > 0) {
      setSelMonth(months[0].key);
    }
  }, [selMonth, months]);

  const onSave = async (k: string, directVal?: string) => {
    const v = String(directVal ?? values[k] ?? "").trim();
    if (!v) {
      push(`❌ فیلد نمی‌تواند خالی باشد`, "error");
      return;
    }
    setSaving(k);
    try {
      await updateSettingsMutation.mutateAsync({ key: k, value: v });
      if (directVal !== undefined) {
        setValues((s) => ({ ...s, [k]: directVal }));
      }
      push(`✅ تنظیم با موفقیت ذخیره شد`);
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    } finally {
      setSaving(null);
    }
  };

  const downloadExcel = async () => {
    if (!selMonth) {
      push("❌ ابتدا یک ماه را انتخاب کنید", "error");
      return;
    }
    setDlLoading(true);
    try {
      const blob = await API.excelBlob(selMonth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `گزارش-${selMonth}.xlsx`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      push("📤 فایل اکسل با موفقیت دانلود شد");
    } catch (e: any) {
      push(`❌ خطا در دانلود اکسل: ${e.message}`, "error");
    } finally {
      setDlLoading(false);
    }
  };

  if (settingsQuery.isLoading && !settingsQuery.data) return <CardSkeleton rows={4} />;

  const currentDefaultMode = values.default_work_mode || "office";

  return (
    <div className="card" style={{ display: "grid", gap: 16 }}>
      {/* ── Section Header ── */}
      <div className="section-head" style={{ margin: 0 }}>
        <div>
          <div className="kicker">SYSTEM CONFIGURATION</div>
          <h2 className="display" style={{ fontSize: 18, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
            <Sliders size={18} /> پارامترهای کاری
          </h2>
        </div>
        <span className="badge badge-muted mono" style={{ fontSize: 10 }}>
          قوانین تایم‌شیت
        </span>
      </div>

      {/* ── 1. Default Work Mode Selector (Office vs Remote) ── */}
      <div
        className="row"
        style={{
          padding: "12px",
          background: "var(--surface-2)",
          borderColor: "var(--border-strong)",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text)" }}>
              نوع پیش‌فرض قرارداد کاری
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              روزهای کاری به طور خودکار با این نوع شروع می‌شوند (قابل تغییر روزانه در صفحه امروز).
            </div>
          </div>
          <span className="badge badge-muted mono" style={{ fontSize: 10 }}>
            پیش‌فرض روزها
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: "10px",
              fontSize: 12,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: currentDefaultMode === "office" ? "#FEF3C7" : "transparent",
              color: currentDefaultMode === "office" ? "#92400E" : "var(--muted)",
              borderColor: currentDefaultMode === "office" ? "#000" : "var(--border-strong)",
              boxShadow: currentDefaultMode === "office" ? "3px 3px 0 #000" : "none",
              cursor: "pointer",
            }}
            onClick={() => onSave("default_work_mode", "office")}
            disabled={saving === "default_work_mode"}
          >
            <Building2 size={16} />
            <span>حضوری در شرکت</span>
          </button>

          <button
            type="button"
            className="btn"
            style={{
              padding: "10px",
              fontSize: 12,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: currentDefaultMode === "remote" ? "#DDD6FE" : "transparent",
              color: currentDefaultMode === "remote" ? "#4C1D95" : "var(--muted)",
              borderColor: currentDefaultMode === "remote" ? "#000" : "var(--border-strong)",
              boxShadow: currentDefaultMode === "remote" ? "3px 3px 0 #000" : "none",
              cursor: "pointer",
            }}
            onClick={() => onSave("default_work_mode", "remote")}
            disabled={saving === "default_work_mode"}
          >
            <Home size={16} />
            <span>کاملاً دورکار (ریموت)</span>
          </button>
        </div>
      </div>

      {/* ── 2. Setting Fields Grid ── */}
      <div style={{ display: "grid", gap: 8 }}>
        {[
          { k: "start_time", label: "آغاز پنجره ورود", ph: "07:00", type: "time" },
          { k: "start_time_end", label: "اتمام پنجره ورود (حداکثر زمان مجاز بدون تأخیر)", ph: "09:15", type: "time" },
          { k: "end_time", label: "آغاز پنجره خروج", ph: "15:00", type: "time" },
          { k: "end_time_end", label: "اتمام پنجره خروج", ph: "17:15", type: "time" },
          { k: "standard_hours", label: "ساعت موظفی روزانه (ساعت)", ph: "8", type: "number" },
          { k: "leave_quota_hours", label: "سهمیه کل مرخصی سالانه (ساعت)", ph: "208", type: "number" },
        ].map((f) => (
          <div
            key={f.k}
            className="row"
            style={{
              padding: "10px 12px",
              background: "var(--surface-2)",
              borderColor: "var(--border-strong)",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 12, color: "var(--text)", flex: 1, minWidth: 140 }}>
              {f.label}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type={f.type || "text"}
                value={values[f.k] || ""}
                onChange={(e) => setValues((s) => ({ ...s, [f.k]: e.target.value }))}
                placeholder={f.ph}
                className="mono input"
                style={{
                  width: f.type === "time" ? "120px" : "90px",
                  padding: "6px 8px",
                  fontSize: 13,
                  textAlign: "center",
                }}
              />
              <button
                className="btn btn-primary mono"
                style={{
                  width: "auto",
                  padding: "8px 12px",
                  fontSize: 11,
                  boxShadow: "2px 2px 0 #000",
                  opacity: saving === f.k ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                disabled={saving === f.k}
                onClick={() => onSave(f.k)}
                title="ذخیره این تنظیم"
              >
                {saving === f.k ? (
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                ) : (
                  <Save size={13} />
                )}
                <span>ذخیره</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Excel Export Card Component ── */}
      <div
        style={{
          padding: "12px 14px",
          background: "var(--surface-2)",
          border: "2px solid var(--border-strong)",
          borderRadius: 16,
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileSpreadsheet size={18} style={{ color: "var(--green)" }} />
            <b style={{ fontSize: 13, color: "var(--text)" }}>دریافت گزارش اکسل سوابق ماهانه</b>
          </div>
          <span className="badge badge-muted mono" style={{ fontSize: 10 }}>
            خروجی XLSX
          </span>
        </div>

        {months.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>هنوز اطلاعاتی برای ماه‌ها ثبت نشده است.</p>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
              <select
                value={selMonth}
                onChange={(e) => setSelMonth(e.target.value)}
                className="mono input"
                style={{
                  width: "100%",
                  padding: "8px 28px 8px 10px",
                  fontSize: 13,
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                {months.map((m: any) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "#0F172A",
                }}
              />
            </div>

            <button
              className="btn btn-ghost mono"
              onClick={downloadExcel}
              disabled={dlLoading || !selMonth}
              style={{
                width: "auto",
                flex: "0 0 auto",
                padding: "8px 14px",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                opacity: dlLoading ? 0.6 : 1,
              }}
            >
              {dlLoading ? (
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              ) : (
                <Download size={14} />
              )}
              <span>دانلود اکسل</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Retroactive Notice ── */}
      <div
        className="row"
        style={{
          background: "rgba(245, 158, 11, 0.08)",
          borderColor: "var(--amber)",
          padding: "10px 12px",
          gap: 8,
          alignItems: "center",
        }}
      >
        <AlertTriangle size={16} style={{ color: "var(--amber-2)", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
          توجه: تغییر این مقادیر روی محاسبات آماری و گزارش‌های قبلی نیز تأثیرگذار خواهد بود (Retroactive).
        </span>
      </div>
    </div>
  );
}

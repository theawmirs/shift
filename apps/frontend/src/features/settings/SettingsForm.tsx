import { useEffect, useState } from "react";
import { AlertTriangle, Download, ChevronDown } from "lucide-react";
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
    start_time_end: "09:15",
    standard_hours: "8",
    start_time: "07:00",
    leave_quota_hours: "208",
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

  const onSave = async (k: string) => {
    const v = String(values[k] || "").trim();
    if (!v) {
      push(`❌ ${k} خالیه`, "error");
      return;
    }
    setSaving(k);
    try {
      await updateSettingsMutation.mutateAsync({ key: k, value: v });
      push(`✅ ذخیره شد — ${k} = ${v}`);
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    } finally {
      setSaving(null);
    }
  };

  const downloadExcel = async () => {
    if (!selMonth) {
      push("❌ ماهی انتخاب نشده", "error");
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
      push("📤 اکسل دانلود شد");
    } catch (e: any) {
      push(`❌ اکسل: ${e.message}`, "error");
    } finally {
      setDlLoading(false);
    }
  };

  if (settingsQuery.isLoading && !settingsQuery.data) return <CardSkeleton rows={4} />;

  return (
    <div className="settings">
      <div className="card">
        <div className="section-head">
          <h2 className="display">تنظیمات</h2>
          <span className="kicker mono">LIVE • RETROACTIVE</span>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { k: "start_time_end", label: "ساعت تأخیر (بعدش تأخیر)", ph: "09:15" },
            { k: "standard_hours", label: "ساعت کاری روزانه", ph: "8" },
            { k: "start_time", label: "شروع پنجره ورود", ph: "07:00" },
            { k: "leave_quota_hours", label: "سهمیه مرخصی (ساعت)", ph: "208" },
          ].map((f) => (
            <label key={f.k} className="field">
              <span style={{ fontWeight: 800, fontSize: 12 }}>{f.label}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={values[f.k] || ""}
                  onChange={(e) => setValues((s) => ({ ...s, [f.k]: e.target.value }))}
                  placeholder={f.ph}
                  className="mono"
                />
                <button
                  className="btn btn-primary"
                  style={{ width: "auto", padding: "8px 12px", boxShadow: "3px 3px 0 #000", opacity: saving === f.k ? 0.6 : 1 }}
                  disabled={saving === f.k}
                  onClick={() => onSave(f.k)}
                >
                  {saving === f.k ? "…" : "ذخیره"}
                </button>
              </span>
            </label>
          ))}
        </div>

        {/* ── Excel Archive Section ── */}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "2px dashed var(--border-strong)" }}>
          <div className="section-head" style={{ margin: "0 0 10px" }}>
            <h2 className="display" style={{ fontSize: 14 }}>
              آرشیو اکسل
            </h2>
            <span className="kicker mono">HISTORY</span>
          </div>

          {months.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>هنوز رکوردی ثبت نشده</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <label className="field" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 12 }}>انتخاب ماه</span>
                <div style={{ position: "relative" }}>
                  <select
                    value={selMonth}
                    onChange={(e) => setSelMonth(e.target.value)}
                    className="mono"
                    style={{
                      width: "100%",
                      padding: "10px 36px 10px 12px",
                      borderRadius: 12,
                      border: "2px solid #000",
                      background: "#fff",
                      color: "#0F172A",
                      fontWeight: 700,
                      fontSize: 14,
                      fontFamily: "YekanBakh, sans-serif",
                      boxShadow: "3px 3px 0 #000",
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
                    size={16}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      color: "#0F172A",
                    }}
                  />
                </div>
              </label>

              <button
                className="btn btn-ghost"
                onClick={downloadExcel}
                disabled={dlLoading || !selMonth}
                style={{ opacity: dlLoading ? 0.6 : 1 }}
              >
                {dlLoading ? (
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                ) : (
                  <Download size={16} />
                )}
                دریافت اکسل {months.find((m: any) => m.key === selMonth)?.label || ""}
              </button>
            </div>
          )}
        </div>

        <p
          style={{
            color: "var(--muted)",
            fontSize: 11,
            margin: "14px 0 0",
            lineHeight: 1.6,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <AlertTriangle size={14} /> تغییر تنظیمات روی گزارش‌های قبلی هم اعمال می‌شود (retroactive).
        </p>
      </div>
    </div>
  );
}

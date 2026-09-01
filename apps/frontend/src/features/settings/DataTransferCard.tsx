import { useState } from "react";
import { Download, Upload, FileText, CheckCircle2, AlertCircle, ArrowUpRight, Database } from "lucide-react";
import { API } from "../../shared/lib/api";
import { useToast } from "../../shared/ui/Toast";
import { Drawer } from "../../shared/ui/Drawer";
import { Button } from "../../shared/ui/Button";

export function DataTransferCard({ onImportSuccess }: { onImportSuccess?: () => void }) {
  const { push } = useToast();
  const [exportLoading, setExportLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const blob = await API.csvExportBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `worktime-attendance-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      push("📥 خروجی CSV کامل دانلود شد");
    } catch (e: any) {
      push(`❌ خطا در خروجی CSV: ${e.message}`, "error");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadSample = async () => {
    setSampleLoading(true);
    try {
      const blob = await API.csvSampleBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = "worktime-sample-template.csv";
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      push("📄 فایل نمونه تمپلیت CSV دانلود شد");
    } catch (e: any) {
      push(`❌ خطا: ${e.message}`, "error");
    } finally {
      setSampleLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      push("❌ فقط فایل با پسوند CSV مجاز است", "error");
      return;
    }

    setImportLoading(true);
    try {
      const res = await API.csvImport(file, "upsert");
      setImportResult(res);
      push(`✅ واردسازی انجام شد: ${res.inserted || 0} ثبت جدید، ${res.updated || 0} ویرایش`);
      onImportSuccess?.();
    } catch (e: any) {
      push(`❌ خطا در ورود اطلاعات: ${e.message}`, "error");
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="card" style={{ display: "grid", gap: 16 }}>
      {/* ── Section Header ── */}
      <div className="section-head" style={{ margin: 0 }}>
        <div>
          <div className="kicker">BACKUP & DATA SYNC</div>
          <h2 className="display" style={{ fontSize: 18, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
            <Database size={18} /> پشتیبان‌گیری و انتقال داده‌ها
          </h2>
        </div>
        <span className="badge badge-muted mono" style={{ fontSize: 10 }}>
          CSV SYNC
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {/* Export Action Card */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text)", fontWeight: 800, fontSize: 13 }}>
            <Download size={16} style={{ color: "var(--amber-2)" }} />
            <span>پشتیبان‌گیری کامل</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
            دریافت فایل متنی CSV شامل تمام لاگ‌های ورود، خروج و مرخصی‌ها.
          </p>
          <Button
            variant="primary"
            style={{ padding: "8px 10px", fontSize: 11, fontWeight: 800, marginTop: "auto" }}
            onClick={handleExportCSV}
            loading={exportLoading}
            loadingText="در حال دریافت…"
          >
            دانلود کل داده‌ها
          </Button>
        </div>

        {/* Import Action Card */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text)", fontWeight: 800, fontSize: 13 }}>
            <Upload size={16} style={{ color: "var(--green)" }} />
            <span>واردسازی از فایل</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
            بارگذاری دسته‌ای ساعات کاری با حفظ داده‌های قبلی (Upsert).
          </p>
          <label
            className="btn btn-ghost"
            style={{
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 800,
              textAlign: "center",
              cursor: importLoading ? "not-allowed" : "pointer",
              opacity: importLoading ? 0.6 : 1,
              marginTop: "auto",
              display: "block",
            }}
          >
            {importLoading ? "در حال بارگذاری…" : "انتخاب فایل CSV"}
            <input
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleFileChange}
              disabled={importLoading}
            />
          </label>
        </div>
      </div>

      {/* ── Sample Template Link Row ── */}
      <div
        className="row"
        style={{
          padding: "10px 12px",
          background: "var(--surface-2)",
          borderColor: "var(--border-strong)",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={16} style={{ color: "var(--muted)" }} />
          <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 700 }}>قالب استاندارد فایل جهت ورود داده</span>
        </div>
        <button
          className="link"
          style={{
            background: "transparent",
            border: "none",
            fontSize: 11,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: 0,
          }}
          onClick={handleDownloadSample}
          disabled={sampleLoading}
        >
          <span>دانلود فایل نمونه</span>
          <ArrowUpRight size={13} />
        </button>
      </div>

      {/* ── Import Result Drawer ── */}
      <Drawer
        open={Boolean(importResult)}
        onClose={() => setImportResult(null)}
        title="نتیجه واردسازی اطلاعات (CSV)"
        height="auto"
      >
        {importResult && (
          <div style={{ display: "grid", gap: 12, padding: "6px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)" }}>
              <CheckCircle2 size={20} />
              <b style={{ fontSize: 14 }}>پردازش فایل با موفقیت انجام شد</b>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className="row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "8px 10px" }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>تعداد ردیف‌های فایل</span>
                <b className="mono" style={{ fontSize: 15 }}>
                  {importResult.total_rows || 0}
                </b>
              </div>
              <div className="row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "8px 10px" }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>رکوردهای افزوده شده</span>
                <b className="mono" style={{ fontSize: 15, color: "var(--green)" }}>
                  {importResult.inserted || 0}
                </b>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div
                className="row"
                style={{
                  borderColor: "var(--red)",
                  background: "rgba(239, 68, 68, 0.08)",
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--red)", fontSize: 12, fontWeight: 800 }}>
                  <AlertCircle size={15} />
                  <span>خطاهای ساختاری گزارش‌شده:</span>
                </div>
                <ul style={{ margin: 0, paddingRight: 16, fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
                  {importResult.errors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              variant="primary"
              style={{ width: "100%", padding: "10px", fontWeight: 800, marginTop: 6 }}
              onClick={() => setImportResult(null)}
            >
              متوجه شدم
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

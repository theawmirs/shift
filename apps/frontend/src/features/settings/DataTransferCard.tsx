import { useState, useRef } from "react";
import { Download, Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { API } from "../../shared/lib/api";
import { useToast } from "../../shared/ui/Toast";
import { Drawer } from "../../shared/ui/Drawer";

export function DataTransferCard({ onImportSuccess }: { onImportSuccess?: () => void }) {
  const { push } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [exportLoading, setExportLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMode, setImportMode] = useState<"upsert" | "skip">("upsert");
  const [importResult, setImportResult] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExportAll = async () => {
    setExportLoading(true);
    try {
      const blob = await API.csvExportBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `shift-attendance-full-backup.csv`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      push("📤 فایل پشتیبان CSV با موفقیت دانلود شد");
    } catch (e: any) {
      push(`❌ خطا در خروجی CSV: ${e.message}`, "error");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadSample = async () => {
    setTemplateLoading(true);
    try {
      const blob = await API.csvSampleBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `shift-sample-template.csv`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      push("📄 قالب نمونه CSV دانلود شد");
    } catch (e: any) {
      push(`❌ خطا در دانلود قالب: ${e.message}`, "error");
    } finally {
      setTemplateLoading(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      push("❌ لطفاً یک فایل CSV انتخاب کنید", "error");
      return;
    }
    setImportLoading(true);
    try {
      const res = await API.csvImport(selectedFile, importMode);
      setImportResult(res);
      push(`✅ ${res.imported} سطر با موفقیت درون‌ریزی شد!`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onImportSuccess?.();
    } catch (e: any) {
      push(`❌ خطا در درون‌ریزی: ${e.message}`, "error");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="section-head" style={{ margin: "0 0 10px" }}>
        <h2 className="display" style={{ fontSize: 15 }}>
          پشتیبان‌گیری و انتقال داده (CSV)
        </h2>
        <span className="kicker mono">IMPORT • EXPORT</span>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 14px", lineHeight: 1.6 }}>
        می‌توانید تمام اطلاعات تردد و ساعات کاری خود را به صورت فایل CSV دانلود کنید یا رکوردهای قبلی را به صورت فله‌ای وارد سیستم نمایید.
      </p>

      {/* Export & Sample Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <button
          className="btn btn-ghost"
          style={{ padding: "10px 12px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={handleExportAll}
          disabled={exportLoading}
        >
          {exportLoading ? (
            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          ) : (
            <Download size={15} />
          )}
          <span>خروجی کامل CSV</span>
        </button>

        <button
          className="btn btn-ghost"
          style={{ padding: "10px 12px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={handleDownloadSample}
          disabled={templateLoading}
        >
          {templateLoading ? (
            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          ) : (
            <FileSpreadsheet size={15} />
          )}
          <span>قالب نمونه CSV</span>
        </button>
      </div>

      {/* Import Form Box */}
      <div
        style={{
          border: "2px dashed var(--border-strong)",
          borderRadius: 14,
          padding: 12,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Upload size={16} style={{ color: "var(--amber-2)" }} />
          <b style={{ fontSize: 13 }}>درون‌ریزی فایل (Import)</b>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,text/csv"
          onChange={onFileSelect}
          style={{ display: "none" }}
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ width: "auto", padding: "8px 14px", fontSize: 12 }}
            onClick={() => fileInputRef.current?.click()}
          >
            انتخاب فایل CSV
          </button>
          <span className="mono" style={{ fontSize: 12, color: selectedFile ? "var(--text)" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedFile ? selectedFile.name : "هیچ فایلی انتخاب نشده"}
          </span>
        </div>

        {selectedFile && (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>نحوه برخورد با روزهای تکراری:</span>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="import_mode"
                  checked={importMode === "upsert"}
                  onChange={() => setImportMode("upsert")}
                />
                به‌روزرسانی (Overwrite)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="import_mode"
                  checked={importMode === "skip"}
                  onChange={() => setImportMode("skip")}
                />
                نادیده‌گرفتن (Skip)
              </label>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", padding: "10px", fontWeight: 800, fontSize: 13 }}
              onClick={handleImportSubmit}
              disabled={importLoading}
            >
              {importLoading ? "در حال درون‌ریزی..." : "شروع بارگذاری و ثبت رکوردها"}
            </button>
          </div>
        )}
      </div>

      {/* Import Result Drawer */}
      <Drawer
        open={Boolean(importResult)}
        onClose={() => setImportResult(null)}
        title="نتیجه درون‌ریزی داده‌ها"
        height="auto"
      >
        {importResult && (
          <div style={{ display: "grid", gap: 12, padding: "8px 0" }}>
            <div className="row" style={{ borderColor: "var(--green)", background: "rgba(34,197,94,0.08)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} style={{ color: "var(--green)" }} />
                <b>سطرهای با موفقیت ثبت‌شده:</b>
              </span>
              <b className="mono" style={{ fontSize: 15, color: "var(--green)" }}>
                {importResult.imported} سطر
              </b>
            </div>

            {importResult.skipped > 0 && (
              <div className="row">
                <b>سطرهای نادیده‌گرفته‌شده (تکراری):</b>
                <span className="mono">{importResult.skipped} سطر</span>
              </div>
            )}

            {importResult.errors?.length > 0 && (
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--red)", fontSize: 12, fontWeight: 800 }}>
                  <AlertCircle size={14} /> خطاها ({importResult.errors.length}):
                </div>
                <div
                  style={{
                    maxHeight: 140,
                    overflowY: "auto",
                    padding: 8,
                    borderRadius: 10,
                    background: "#FEF2F2",
                    border: "1px solid #EF4444",
                    fontSize: 11,
                    color: "#B91C1C",
                  }}
                >
                  {importResult.errors.map((err: string, i: number) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ marginTop: 6 }}
              onClick={() => setImportResult(null)}
            >
              متوجه شدم
            </button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

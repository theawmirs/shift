import { useState, useMemo, useEffect } from "react";
import { Plane, Trash2, CalendarDays } from "lucide-react";
import { useToast } from "../../shared/ui/Toast";
import { Drawer } from "../../shared/ui/Drawer";
import { ShamsiCalendar } from "../../shared/ui/ShamsiCalendar";
import { useLeavesQuery, useDailyLeaveMutation, useDeleteLeaveMutation } from "../../shared/api/queries";
import { formatShamsiDateText } from "../../shared/lib/format";

const TYPES = [
  { v: "annual", label: "استحقاقی" },
  { v: "sick", label: "استعلاجی" },
  { v: "unpaid", label: "بدون‌حقوق" },
  { v: "casual", label: "ضروری" },
];

// ── Jalali helpers for min/max window (today .. +30d) ──
const _JD = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29],
  _GD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function _g2j(gy: number, gm: number, gd: number): [number, number, number] {
  let _gy = gy - 1600,
    _gm = gm - 1,
    _gd = gd - 1;
  let gDayNo =
    365 * _gy + Math.floor((_gy + 3) / 4) - Math.floor((_gy + 99) / 100) + Math.floor((_gy + 399) / 400);
  for (let i = 0; i < _gm; i++) gDayNo += _GD[i];
  if (_gm > 1 && ((_gy % 4 === 0 && _gy % 100 !== 0) || _gy % 400 === 0)) gDayNo += 1;
  gDayNo += _gd;
  let jDayNo = gDayNo - 79;
  let jNp = Math.floor(jDayNo / 12053);
  jDayNo %= 12053;
  let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
  jDayNo %= 1461;
  if (jDayNo >= 366) {
    jy += Math.floor((jDayNo - 1) / 365);
    jDayNo = (jDayNo - 1) % 365;
  }
  let i = 0;
  for (let k = 0; k < 11; k++) {
    if (jDayNo < _JD[k]) {
      i = k;
      break;
    }
    jDayNo -= _JD[k];
    i = k + 1;
  }
  return [jy, i + 1, jDayNo + 1];
}
function _j2g(jy: number, jm: number, jd: number): [number, number, number] {
  let _jy = jy - 979,
    _jm = jm - 1,
    _jd = jd - 1;
  let jDayNo = 365 * _jy + Math.floor(_jy / 33) * 8 + Math.floor(((_jy % 33) + 3) / 4);
  for (let i = 0; i < _jm; i++) jDayNo += _JD[i];
  jDayNo += _jd;
  let gDayNo = jDayNo + 79;
  let gy = 1600 + 400 * Math.floor(gDayNo / 146097);
  gDayNo %= 146097;
  let leap = 1;
  if (gDayNo >= 36525) {
    gDayNo -= 1;
    gy += 100 * Math.floor(gDayNo / 36524);
    gDayNo %= 36524;
    if (gDayNo >= 365) gDayNo += 1;
    else leap = 0;
  }
  gy += 4 * Math.floor(gDayNo / 1461);
  gDayNo %= 1461;
  if (gDayNo >= 366) {
    leap = 0;
    gDayNo -= 1;
    gy += Math.floor(gDayNo / 365);
    gDayNo %= 365;
  }
  let i = 0;
  while (gDayNo >= _GD[i] + (i === 1 && leap ? 1 : 0)) {
    gDayNo -= _GD[i] + (i === 1 && leap ? 1 : 0);
    i++;
  }
  return [gy, i + 1, gDayNo + 1];
}
function _pad(n: number): string {
  return String(n).padStart(2, "0");
}
function _todayJalali(): [number, number, number] {
  const d = new Date();
  return _g2j(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
function _todayStr(): string {
  const [y, m, dd] = _todayJalali();
  return `${y}-${_pad(m)}-${_pad(dd)}`;
}
function _plusDays(jy: number, jm: number, jd: number, add: number): string {
  const [gy, gm, gd] = _j2g(jy, jm, jd);
  const d = new Date(gy, gm - 1, gd);
  d.setDate(d.getDate() + add);
  const [ny, nm, nd] = _g2j(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${ny}-${_pad(nm)}-${_pad(nd)}`;
}

export function DailyLeaveCard({ onChanged }: { onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="btn btn-ghost"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderStyle: "dashed",
          padding: "14px 12px",
          fontWeight: 800,
        }}
        onClick={() => setOpen(true)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Plane size={16} /> درخواست مرخصی روزانه
        </span>
        <span className="pill mono" style={{ fontSize: 10, background: "#0F172A", color: "#fff" }}>
          تقویم
        </span>
      </button>
      <DailyLeaveDrawer
        open={open}
        onClose={() => setOpen(false)}
        onChanged={() => {
          onChanged?.();
        }}
      />
    </>
  );
}

export function DailyLeaveDrawer({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose?: () => void;
  onChanged?: () => void;
}) {
  const { push } = useToast();
  const todayStr = useMemo(() => _todayStr(), [open]);
  const maxStr = useMemo(() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    return _plusDays(y, m, d, 30);
  }, [todayStr]);

  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typ, setTyp] = useState("annual");
  const [reason, setReason] = useState("");
  const [picker, setPicker] = useState<"from" | "to" | null>(null);

  const leavesQuery = useLeavesQuery();
  const items = leavesQuery.data?.items || [];
  const createMutation = useDailyLeaveMutation();
  const deleteMutation = useDeleteLeaveMutation();

  // when drawer opens, default date to today
  useEffect(() => {
    if (open && !date) setDate(todayStr);
  }, [open, todayStr]);

  const submit = async () => {
    if (!date) {
      push("❌ تاریخ شروع را انتخاب کن", "error");
      return;
    }
    try {
      const r = await createMutation.mutateAsync({
        date: date.trim(),
        end_date: endDate.trim() || undefined,
        type: typ,
        reason: reason.trim() || undefined,
      });
      push(
        `✅ مرخصی ثبت شد — ${r.start_date}${r.end_date !== r.start_date ? ` تا ${r.end_date}` : ""} · ${
          r.hours
        } ساعت`
      );
      setEndDate("");
      setReason("");
      onChanged?.();
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    }
  };

  const cancel = async (id: number | string) => {
    try {
      await deleteMutation.mutateAsync(id);
      push("🗑 مرخصی لغو شد");
      onChanged?.();
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    }
  };

  const fromLabel = date ? formatShamsiDateText(date) : "انتخاب تاریخ";
  const toLabel = endDate ? formatShamsiDateText(endDate) : "— (تک‌روزه)";

  return (
    <Drawer open={open} onClose={onClose} title="مرخصی روزانه" height="82vh"> {/* uses reusable Drawer — same anim as all sheets */}
      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
          تمام‌روز · بازه مجاز <b className="mono">{formatShamsiDateText(todayStr)}</b> تا <b className="mono">{formatShamsiDateText(maxStr)}</b> · هر روز کاری
          8 ساعت · استحقاقی از 208 ساعت کم می‌شود.
        </p>

        {/* ── Date pickers ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "10px 8px",
              background: picker === "from" ? "#0F172A" : "#fff",
              color: picker === "from" ? "#fff" : "#0F172A",
              border: "2px solid #000",
              borderRadius: 12,
              boxShadow: "3px 3px 0 #000",
              textAlign: "center",
            }}
            onClick={() => setPicker((p) => (p === "from" ? null : "from"))}
          >
            <span style={{ fontSize: 11, opacity: 0.75, textAlign: "center", fontWeight: 700 }}>از تاریخ</span>
            <span
              className="mono"
              style={{ fontWeight: 800, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, textAlign: "center" }}
            >
              <CalendarDays size={14} style={{ flexShrink: 0 }} />
              <span>{fromLabel}</span>
            </span>
          </button>
          <button
            className="btn btn-ghost"
            style={{
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "10px 8px",
              background: picker === "to" ? "#0F172A" : "#fff",
              color: picker === "to" ? "#fff" : "#0F172A",
              border: "2px solid #000",
              borderRadius: 12,
              boxShadow: "3px 3px 0 #000",
              textAlign: "center",
            }}
            onClick={() => setPicker((p) => (p === "to" ? null : "to"))}
          >
            <span style={{ fontSize: 11, opacity: 0.75, textAlign: "center", fontWeight: 700 }}>تا تاریخ</span>
            <span
              className="mono"
              style={{ fontWeight: 800, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, textAlign: "center" }}
            >
              <CalendarDays size={14} style={{ flexShrink: 0 }} />
              <span>{toLabel}</span>
            </span>
          </button>
        </div>

        {picker && (
          <div>
            <ShamsiCalendar
              value={picker === "from" ? date : endDate}
              minDate={picker === "to" && date ? date : todayStr}
              maxDate={maxStr}
              onPick={(v) => {
                if (picker === "from") {
                  setDate(v);
                  if (endDate && endDate < v) setEndDate("");
                } else setEndDate(v);
                setPicker(null);
              }}
            />
            {picker === "to" && (
              <button
                className="btn btn-ghost mono"
                style={{ width: "100%", marginTop: 8, fontSize: 12 }}
                onClick={() => {
                  setEndDate("");
                  setPicker(null);
                }}
              >
                تک‌روزه (حذف تا)
              </button>
            )}
          </div>
        )}

        {/* ── Type + reason ── */}
        <label className="field" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>نوع مرخصی</span>
          <select
            value={typ}
            onChange={(e) => setTyp(e.target.value)}
            className="input mono"
            style={{ padding: "10px 12px", borderRadius: 12, cursor: "pointer" }}
          >
            {TYPES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>دلیل (اختیاری، تا 200)</span>
          <input
            className="input"
            placeholder="مثلاً: کار اداری"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
          />
        </label>

        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={createMutation.isPending}
          style={{ opacity: createMutation.isPending ? 0.6 : 1, fontWeight: 800 }}
        >
          {createMutation.isPending ? "در حال ثبت…" : "ثبت مرخصی روزانه"}
        </button>
        <small className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>
          لغو فقط قبل از شروع · جمعه/تعطیل از محاسبه حذف می‌شود
        </small>

        {/* ── Existing leaves ── */}
        <div style={{ marginTop: 4, borderTop: "1px solid rgba(0,0,0,.08)", paddingTop: 10 }}>
          <small
            className="mono"
            style={{ fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            <CalendarDays size={14} /> مرخصی‌های ثبت‌شده ({items.length})
          </small>
          {items.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 12, margin: "8px 0 0" }}>
              هنوز مرخصی روزانه‌ای ثبت نکردی.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              {items.map((it: any) => (
                <div key={it.id} className="row" style={{ padding: "8px 10px" }}>
                  <small className="mono" style={{ fontSize: 11 }}>
                    {it.start_date}
                    {it.end_date !== it.start_date ? ` → ${it.end_date}` : ""} · {it.label} · {it.hours} ساعت
                    {it.reason ? ` · ${it.reason}` : ""}
                  </small>
                  <button
                    className="btn btn-ghost mono"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => cancel(it.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={12} /> لغو
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export function DailyLeaveList({ month }: { month?: string }) {
  const { push } = useToast();
  const leavesQuery = useLeavesQuery(month ? { month } : {});
  const deleteMutation = useDeleteLeaveMutation();
  const items = leavesQuery.data?.items || [];
  const err = leavesQuery.error ? String((leavesQuery.error as any).message || leavesQuery.error) : null;

  const del = async (id: number | string) => {
    try {
      await deleteMutation.mutateAsync(id);
      push("🗑 مرخصی لغو شد");
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
    }
  };

  if (err) return <p style={{ color: "var(--muted)", fontSize: 12 }}>مرخصی روزانه: {err}</p>;
  if (!items.length)
    return <p style={{ color: "var(--muted)", fontSize: 12 }}>مرخصی روزانه ثبت‌شده‌ای برای این بازه نیست.</p>;
  return (
    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
      {items.map((it: any) => (
        <div key={it.id} className="row" style={{ padding: "8px 10px" }}>
          <small className="mono">
            {it.start_date}
            {it.end_date !== it.start_date ? ` → ${it.end_date}` : ""} · {it.label} · {it.hours} ساعت{" "}
            {it.reason ? `· ${it.reason}` : ""}
          </small>
          <button
            className="btn btn-ghost mono"
            style={{ fontSize: 11, padding: "4px 8px" }}
            onClick={() => del(it.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={12} /> لغو
          </button>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { API } from "../../shared/lib/api";

export function useMonthReport({ onExcel }: { onExcel?: (msg: string, variant?: "success" | "error") => void } = {}) {
  const [months, setMonths] = useState<any[]>([]);
  const [selMonth, setSelMonth] = useState("");
  const [m, setM] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<any[]>([]);

  // Load months list once
  useEffect(() => {
    let active = true;
    setLoading(true);
    API.months()
      .then((d) => {
        if (!active) return;
        const list = d.months || [];
        setMonths(list);
        if (list.length > 0) {
          setSelMonth(list[0].key);
        } else {
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!active) return;
        setMonths([]);
        setErr(String(e.message || e));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch report when selected month changes
  useEffect(() => {
    if (!selMonth) return;
    let active = true;
    setErr(null);
    setM(null);
    setLoading(true);

    Promise.all([
      API.reportMonth(selMonth).then((data) => {
        if (active) setM(data);
      }),
      API.listDailyLeaves({ month: selMonth })
        .then((r) => {
          if (active) setLeaves(r.items || []);
        })
        .catch(() => {
          if (active) setLeaves([]);
        }),
    ])
      .catch((e) => {
        if (active) setErr(String(e.message || e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selMonth]);

  const cancelLeave = useCallback(async (id: number | string) => {
    try {
      await API.deleteDailyLeave(id);
      setLeaves((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setErr(String(e.message || e));
    }
  }, []);

  const downloadExcel = useCallback(async () => {
    if (!selMonth) return;
    try {
      const blob = await API.excelBlob(selMonth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `گزارش-${selMonth}.xlsx`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      onExcel?.("📤 اکسل دانلود شد");
    } catch (e: any) {
      onExcel?.(`❌ اکسل: ${e.message}`, "error");
    }
  }, [selMonth, onExcel]);

  return {
    months,
    selMonth,
    setSelMonth,
    report: m,
    err,
    loading,
    leaves,
    cancelLeave,
    downloadExcel,
  };
}

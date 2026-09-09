import { useState, useCallback, useEffect } from "react";
import { API } from "../../shared/lib/api";
import {
  useMonthsQuery,
  useMonthReportQuery,
  useLeavesQuery,
  useDeleteLeaveMutation,
} from "../../shared/api/queries";

export function useMonthReport({ onExcel }: { onExcel?: (msg: string, variant?: "success" | "error") => void } = {}) {
  const [selMonth, setSelMonth] = useState("");

  const monthsQuery = useMonthsQuery();
  const months = monthsQuery.data?.months || [];

  // Auto-select first month once months load if none selected
  useEffect(() => {
    if (!selMonth && months.length > 0) {
      setSelMonth(months[0].key);
    }
  }, [selMonth, months]);

  const reportQuery = useMonthReportQuery(selMonth);
  const leavesQuery = useLeavesQuery(selMonth ? { month: selMonth } : {});
  const deleteLeaveMutation = useDeleteLeaveMutation();

  const cancelLeave = useCallback(async (id: number | string) => {
    try {
      await deleteLeaveMutation.mutateAsync(id);
    } catch (e: any) {
      // Error handled by caller / displayed via toast
      throw e;
    }
  }, [deleteLeaveMutation]);

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

  const loading = monthsQuery.isLoading || (!!selMonth && reportQuery.isLoading);
  const err = monthsQuery.error
    ? String((monthsQuery.error as any).message || monthsQuery.error)
    : reportQuery.error
    ? String((reportQuery.error as any).message || reportQuery.error)
    : null;

  return {
    months,
    selMonth,
    setSelMonth,
    report: reportQuery.data || null,
    err,
    loading,
    leaves: leavesQuery.data?.items || [],
    cancelLeave,
    downloadExcel,
  };
}

import { useLeavesQuery, useDailyLeaveMutation, useDeleteLeaveMutation } from "@/shared/api/queries";
import { useToast } from "@/shared/ui/Toast";

export interface DailyLeaveItem {
  id: number | string;
  start_date: string;
  end_date: string;
  type: string;
  label?: string;
  hours: number;
  reason?: string | null;
}

export function useLeaves(month?: string) {
  const { push } = useToast();
  const leavesQuery = useLeavesQuery(month ? { month } : {});
  const createMutation = useDailyLeaveMutation();
  const deleteMutation = useDeleteLeaveMutation();

  const items: DailyLeaveItem[] = leavesQuery.data?.items || [];
  const isLoading = leavesQuery.isLoading;
  const error = leavesQuery.error ? String((leavesQuery.error as any).message || leavesQuery.error) : null;

  const createLeave = async (params: {
    date: string;
    end_date?: string;
    type: string;
    reason?: string;
  }) => {
    try {
      const r = await createMutation.mutateAsync({
        date: params.date.trim(),
        end_date: params.end_date?.trim() || undefined,
        type: params.type,
        reason: params.reason?.trim() || undefined,
      });
      push(
        `✅ مرخصی ثبت شد — ${r.start_date}${r.end_date !== r.start_date ? ` تا ${r.end_date}` : ""} · ${
          r.hours
        } ساعت`
      );
      return r;
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
      throw e;
    }
  };

  const deleteLeave = async (id: number | string) => {
    try {
      await deleteMutation.mutateAsync(id);
      push("🗑 مرخصی لغو شد");
    } catch (e: any) {
      push(`❌ ${e.message}`, "error");
      throw e;
    }
  };

  return {
    items,
    isLoading,
    error,
    refetch: leavesQuery.refetch,
    createLeave,
    deleteLeave,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    deletingId: deleteMutation.variables as number | string | undefined,
  };
}

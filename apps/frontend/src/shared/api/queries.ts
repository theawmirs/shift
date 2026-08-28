import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API } from "../lib/api";

export const queryKeys = {
  today: ["today"] as const,
  month: (key: string) => ["month", key] as const,
  months: ["months"] as const,
  leaves: ["leaves"] as const,
  settings: ["settings"] as const,
  holidays: (year?: number) => ["holidays", year ?? "all"] as const,
  me: ["me"] as const,
};

export function useTodayQuery() {
  return useQuery({
    queryKey: queryKeys.today,
    queryFn: () => API.status(),
    refetchInterval: 30000,
  });
}

export function useMonthReportQuery(monthKey: string) {
  return useQuery({
    queryKey: queryKeys.month(monthKey),
    queryFn: () => API.reportMonth(monthKey),
    enabled: !!monthKey,
  });
}

export function useMonthsQuery() {
  return useQuery({
    queryKey: queryKeys.months,
    queryFn: () => API.months(),
  });
}

export function useLeavesQuery(opts: { month?: string; date?: string } = {}) {
  return useQuery({
    queryKey: opts.month ? [...queryKeys.leaves, opts.month] : queryKeys.leaves,
    queryFn: () => API.listDailyLeaves(opts),
  });
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => API.getSettings(),
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => API.putSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: ["month"] });
    },
  });
}

export function useHolidaysQuery(year?: number) {
  return useQuery({
    queryKey: queryKeys.holidays(year),
    queryFn: () => API.getHolidays(year),
  });
}

export function useRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ event_type, at, date, allow_holiday }: { event_type: string; at?: string; date?: string; allow_holiday?: boolean }) =>
      API.record(event_type, at, date, allow_holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: ["month"] });
    },
  });
}

export function useDailyLeaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { date: string; end_date?: string; type?: string; reason?: string }) =>
      API.createDailyLeave(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: ["month"] });
    },
  });
}

export function useHourlyLeaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ at, date }: { at?: string; date?: string } = {}) =>
      API.record("leave_start", at, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: ["month"] });
    },
  });
}

export function useDeleteLeaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => API.deleteDailyLeave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: ["month"] });
    },
  });
}

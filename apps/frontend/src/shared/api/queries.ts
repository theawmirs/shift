import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "./endpoints/attendance";
import { tasksApi } from "./endpoints/tasks";
import { leavesApi } from "./endpoints/leaves";
import { reportsApi } from "./endpoints/reports";
import { settingsApi } from "./endpoints/settings";

export const queryKeys = {
  today: ["today"] as const,
  week: ["week"] as const,
  month: (key: string) => ["month", key] as const,
  months: ["months"] as const,
  tasks: (date?: string) => ["tasks", date ?? "all"] as const,
  leaves: ["leaves"] as const,
  settings: ["settings"] as const,
  holidays: (year?: number) => ["holidays", year ?? "all"] as const,
  me: ["me"] as const,
};

export function useTodayQuery() {
  return useQuery({
    queryKey: queryKeys.today,
    queryFn: () => attendanceApi.status(),
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useTasksQuery(date?: string) {
  return useQuery({
    queryKey: queryKeys.tasks(date),
    queryFn: () => tasksApi.tasks(date),
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useAddTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string; priority?: string; due_date?: string; date?: string }) =>
      tasksApi.addTask(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
    },
  });
}

export function usePatchTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | string; body: { title?: string; description?: string; priority?: string; due_date?: string; done?: boolean } }) =>
      tasksApi.patchTask(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => tasksApi.delTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
    },
  });
}

export function useWeekReportQuery() {
  return useQuery({
    queryKey: queryKeys.week,
    queryFn: () => reportsApi.reportWeek(),
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useMonthReportQuery(monthKey: string) {
  return useQuery({
    queryKey: queryKeys.month(monthKey),
    queryFn: () => reportsApi.reportMonth(monthKey),
    enabled: !!monthKey,
    staleTime: 60000,
  });
}

export function useMonthsQuery() {
  return useQuery({
    queryKey: queryKeys.months,
    queryFn: () => reportsApi.months(),
    staleTime: 300000,
  });
}

export function useLeavesQuery(opts: { month?: string; date?: string } = {}) {
  return useQuery({
    queryKey: opts.month ? [...queryKeys.leaves, opts.month] : queryKeys.leaves,
    queryFn: () => leavesApi.listDailyLeaves(opts),
    staleTime: 30000,
  });
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.getSettings(),
    staleTime: 60000,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => settingsApi.putSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.week });
      queryClient.invalidateQueries({ queryKey: ["month"] });
    },
  });
}

export function useHolidaysQuery(year?: number) {
  return useQuery({
    queryKey: queryKeys.holidays(year),
    queryFn: () => reportsApi.getHolidays(year),
    staleTime: 3600000,
  });
}

export function useRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ event_type, at, date, allow_holiday }: { event_type: string; at?: string; date?: string; allow_holiday?: boolean }) =>
      attendanceApi.record(event_type, at, date, allow_holiday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.week });
      queryClient.invalidateQueries({ queryKey: ["month"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDailyLeaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { date: string; end_date?: string; type?: string; reason?: string }) =>
      leavesApi.createDailyLeave(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.week });
      queryClient.invalidateQueries({ queryKey: ["month"] });
    },
  });
}

export function useHourlyLeaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ at, date }: { at?: string; date?: string } = {}) =>
      attendanceApi.record("leave_start", at, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.week });
      queryClient.invalidateQueries({ queryKey: ["month"] });
    },
  });
}

export function useDeleteLeaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => leavesApi.deleteDailyLeave(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves });
      queryClient.invalidateQueries({ queryKey: queryKeys.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.week });
      queryClient.invalidateQueries({ queryKey: ["month"] });
    },
  });
}

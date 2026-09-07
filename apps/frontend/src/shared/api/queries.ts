import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API } from "../lib/api";
import { enqueueOutboxItem } from "../lib/offlineSync";

function isCurrentlyOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

function getCurrentTimeHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

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
    queryFn: () => API.status(),
    refetchInterval: () => {
      if (isCurrentlyOffline()) return false;
      return 30000;
    },
    staleTime: 10000,
  });
}

export function useTasksQuery(date?: string) {
  return useQuery({
    queryKey: queryKeys.tasks(date),
    queryFn: () => API.tasks(date),
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useAddTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { title: string; description?: string; priority?: string; due_date?: string; date?: string }) => {
      if (isCurrentlyOffline()) {
        await enqueueOutboxItem("addTask", body, `افزودن تسک: ${body.title}`);
        const tempTask = {
          id: `temp-${Date.now()}`,
          title: body.title,
          description: body.description || null,
          priority: body.priority || "medium",
          due_date: body.due_date || null,
          done: false,
          created_at: new Date().toISOString(),
          isOfflinePending: true,
        };
        return { ok: true, offline: true, task: tempTask };
      }
      return API.addTask(body);
    },
    onSuccess: async (res) => {
      if (res?.task) {
        queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) => {
          if (!old || !Array.isArray(old.tasks)) return old;
          return { ...old, tasks: [res.task, ...old.tasks] };
        });
      }
      if (!res?.offline) {
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tasks"] }),
          queryClient.invalidateQueries({ queryKey: queryKeys.today }),
        ]);
      }
    },
  });
}

export function usePatchTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number | string; body: { title?: string; description?: string; priority?: string; due_date?: string; done?: boolean } }) => {
      if (isCurrentlyOffline()) {
        await enqueueOutboxItem("patchTask", { id, body }, `ویرایش تسک #${id}`);
        return { ok: true, offline: true, task: { id, ...body } };
      }
      return API.patchTask(id, body);
    },
    onSuccess: async (res) => {
      if (res?.task) {
        queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) => {
          if (!old || !Array.isArray(old.tasks)) return old;
          return {
            ...old,
            tasks: old.tasks.map((task: any) => (String(task.id) === String(res.task.id) ? { ...task, ...res.task } : task)),
          };
        });
      }
      if (!res?.offline) {
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tasks"] }),
          queryClient.invalidateQueries({ queryKey: queryKeys.today }),
        ]);
      }
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      if (isCurrentlyOffline()) {
        await enqueueOutboxItem("delTask", { id }, `حذف تسک #${id}`);
        return { ok: true, offline: true };
      }
      return API.delTask(id);
    },
    onSuccess: async (_res, id) => {
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) => {
        if (!old || !Array.isArray(old.tasks)) return old;
        return {
          ...old,
          tasks: old.tasks.filter((task: any) => String(task.id) !== String(id)),
        };
      });
      if (!_res?.offline) {
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tasks"] }),
          queryClient.invalidateQueries({ queryKey: queryKeys.today }),
        ]);
      }
    },
  });
}

export function useWeekReportQuery() {
  return useQuery({
    queryKey: queryKeys.week,
    queryFn: () => API.reportWeek(),
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useMonthReportQuery(monthKey: string) {
  return useQuery({
    queryKey: queryKeys.month(monthKey),
    queryFn: () => API.reportMonth(monthKey),
    enabled: !!monthKey,
    staleTime: 60000,
  });
}

export function useMonthsQuery() {
  return useQuery({
    queryKey: queryKeys.months,
    queryFn: () => API.months(),
    staleTime: 300000,
  });
}

export function useLeavesQuery(opts: { month?: string; date?: string } = {}) {
  return useQuery({
    queryKey: opts.month ? [...queryKeys.leaves, opts.month] : queryKeys.leaves,
    queryFn: () => API.listDailyLeaves(opts),
    staleTime: 30000,
  });
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => API.getSettings(),
    staleTime: 60000,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => API.putSetting(key, value),
    onSuccess: async () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.today }),
        queryClient.invalidateQueries({ queryKey: queryKeys.week }),
        queryClient.invalidateQueries({ queryKey: ["month"] }),
      ]);
    },
  });
}

export function useHolidaysQuery(year?: number) {
  return useQuery({
    queryKey: queryKeys.holidays(year),
    queryFn: () => API.getHolidays(year),
    staleTime: 3600000,
  });
}

export function useRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ event_type, at, date, allow_holiday }: { event_type: string; at?: string; date?: string; allow_holiday?: boolean }) => {
      if (isCurrentlyOffline()) {
        const punchTime = at || getCurrentTimeHHMM();
        const desc = event_type === "in" ? `ورود (${punchTime})` : event_type === "out" ? `خروج (${punchTime})` : `مرخصی (${punchTime})`;
        await enqueueOutboxItem("record", { event_type, at: punchTime, date, allow_holiday }, `ثبت ${desc}`);

        const currentData: any = queryClient.getQueryData(queryKeys.today);
        const day = currentData?.day ? { ...currentData.day } : {};
        let day_status = currentData?.day_status || "working";
        let day_status_label = currentData?.day_status_label || "مشغول";

        if (event_type === "in") {
          day.in = punchTime;
          day_status = "working";
          day_status_label = "مشغول (آفلاین)";
        } else if (event_type === "out") {
          day.out = punchTime;
          day_status = "done";
          day_status_label = "تمام‌شده (آفلاین)";
        } else if (event_type === "leave_start") {
          day.leave_open = true;
          day_status = "on_leave";
          day_status_label = "مرخصی (آفلاین)";
        } else if (event_type === "leave_end") {
          day.leave_open = false;
          day_status = "working";
          day_status_label = "مشغول (آفلاین)";
        }

        return {
          ok: true,
          offline: true,
          message: `⏳ ثبت ${desc} در حافظه محلی ذخیره شد (پس از اتصال همگام می‌شود)`,
          day_payload: day,
          day_status,
          day_status_label,
        };
      }
      return API.record(event_type, at, date, allow_holiday);
    },
    onSuccess: async (res) => {
      if (res?.day_payload) {
        queryClient.setQueryData(queryKeys.today, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            day: res.day_payload,
            day_status: res.day_status ?? res.day_payload?.day_status ?? old.day_status,
            day_status_label: res.day_status_label ?? res.day_payload?.day_status_label ?? old.day_status_label,
            day_status_reason: res.day_payload?.day_status_reason ?? old.day_status_reason,
          };
        });
      }
      if (!res?.offline) {
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.today }),
          queryClient.invalidateQueries({ queryKey: queryKeys.week }),
          queryClient.invalidateQueries({ queryKey: ["month"] }),
          queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        ]);
      }
    },
  });
}

export function useEditCheckinMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ at, date }: { at: string; date?: string }) => {
      if (isCurrentlyOffline()) {
        await enqueueOutboxItem("editCheckin", { at, date }, `اصلاح ساعت ورود به ${at}`);
        const currentData: any = queryClient.getQueryData(queryKeys.today);
        const day = currentData?.day ? { ...currentData.day, in: at } : { in: at };
        return {
          ok: true,
          offline: true,
          message: `ساعت ورود در حالت آفلاین به ${at} ویرایش شد`,
          day,
        };
      }
      return API.editCheckin(at, date);
    },
    onSuccess: async (res) => {
      if (res?.day) {
        queryClient.setQueryData(queryKeys.today, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            day: res.day,
            day_status: res.day?.day_status ?? old.day_status,
            day_status_label: res.day?.day_status_label ?? old.day_status_label,
            day_status_reason: res.day?.day_status_reason ?? old.day_status_reason,
          };
        });
      }
      if (!res?.offline) {
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.today }),
          queryClient.invalidateQueries({ queryKey: queryKeys.week }),
          queryClient.invalidateQueries({ queryKey: ["month"] }),
        ]);
      }
    },
  });
}

export function useDailyLeaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { date: string; end_date?: string; type?: string; reason?: string }) =>
      API.createDailyLeave(params),
    onSuccess: async () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leaves }),
        queryClient.invalidateQueries({ queryKey: queryKeys.today }),
        queryClient.invalidateQueries({ queryKey: queryKeys.week }),
        queryClient.invalidateQueries({ queryKey: ["month"] }),
      ]);
    },
  });
}

export function useHourlyLeaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ at, date }: { at?: string; date?: string } = {}) =>
      API.record("leave_start", at, date),
    onSuccess: async () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leaves }),
        queryClient.invalidateQueries({ queryKey: queryKeys.today }),
        queryClient.invalidateQueries({ queryKey: queryKeys.week }),
        queryClient.invalidateQueries({ queryKey: ["month"] }),
      ]);
    },
  });
}

export function useDeleteLeaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => API.deleteDailyLeave(Number(id)),
    onSuccess: async () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leaves }),
        queryClient.invalidateQueries({ queryKey: queryKeys.today }),
        queryClient.invalidateQueries({ queryKey: queryKeys.week }),
        queryClient.invalidateQueries({ queryKey: ["month"] }),
      ]);
    },
  });
}

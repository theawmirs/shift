import { apiClient } from "../client";

export const leavesApi = {
  listDailyLeaves(opts: { month?: string; date?: string } = {}): Promise<any> {
    const qs = new URLSearchParams();
    if (opts.month) qs.set("month", opts.month);
    if (opts.date) qs.set("date", opts.date);
    const q = qs.toString() ? `?${qs}` : "";
    return apiClient.jget(`/api/daily-leaves${q}`);
  },
  createDailyLeave({
    date,
    end_date,
    type,
    reason,
  }: {
    date: string;
    end_date?: string;
    type?: string;
    reason?: string;
  }): Promise<any> {
    return apiClient.jpost("/api/daily-leaves", { date, end_date, type, reason });
  },
  deleteDailyLeave(id: number | string): Promise<any> {
    return apiClient.jdel(`/api/daily-leaves/${id}`);
  },
};

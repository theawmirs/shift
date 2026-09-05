import { apiClient } from "../client";

export const attendanceApi = {
  status(): Promise<any> {
    return apiClient.jget("/api/status");
  },
  dayStatus(s: any): { day_status: string | null; day_status_label: string | null; day_status_reason: string | null } {
    if (!s) return { day_status: null, day_status_label: null, day_status_reason: null };
    return {
      day_status: s.day_status ?? s.day?.day_status ?? null,
      day_status_label: s.day_status_label ?? s.day?.day_status_label ?? null,
      day_status_reason: s.day_status_reason ?? s.day?.day_status_reason ?? null,
    };
  },
  toggleWorkMode(date?: string): Promise<any> {
    return apiClient.jpost("/api/work-mode/toggle", date ? { date } : {});
  },
  record(event_type: string, at?: string, date?: string, allow_holiday?: boolean): Promise<any> {
    return apiClient.jpost("/api/record", { event_type, at, date, allow_holiday: !!allow_holiday });
  },
  editDay(body: {
    date: string;
    in_time?: string | null;
    out_time?: string | null;
    leave_hours?: number;
    overtime_hours?: number;
    work_mode?: string;
    notes?: string | null;
  }): Promise<any> {
    return apiClient.jpost("/api/day/edit", body);
  },
  ot(hours: number | string, date?: string): Promise<any> {
    return apiClient.jpost(
      `/api/ot?hours=${encodeURIComponent(hours)}${date ? `&date=${encodeURIComponent(date)}` : ""}`,
      {}
    );
  },
};

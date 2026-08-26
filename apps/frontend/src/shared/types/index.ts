export type WorkMode = "present" | "remote" | "leave" | "off";

export interface User {
  id?: number | string;
  name: string;
  telegram_id?: number | string;
  phone?: string;
  hourly_rate?: number;
  monthly_norm_hours?: number;
  work_mode?: WorkMode;
}

export interface AuthSession {
  token: string | null;
  user: User | null;
  authenticated: boolean;
}

export interface AttendanceRecord {
  id: number | string;
  date: string; // YYYY-MM-DD or Jalali string
  entry_time?: string | null;
  exit_time?: string | null;
  duration_minutes?: number;
  work_mode?: WorkMode;
  notes?: string;
}

export interface DailyLeave {
  id?: number | string;
  date: string;
  type: "hourly" | "daily";
  minutes?: number;
  reason?: string;
  approved?: boolean;
}

export interface Task {
  id: number | string;
  title: string;
  completed: boolean;
  priority?: "low" | "medium" | "high";
  due_date?: string | null;
}

export interface DaySummary {
  date: string;
  day_name?: string;
  duration_minutes: number;
  is_holiday?: boolean;
  work_mode?: WorkMode;
}

export interface WeekReport {
  week_number?: number;
  start_date: string;
  end_date: string;
  total_minutes: number;
  days: DaySummary[];
}

export interface MonthReport {
  year: number;
  month: number;
  total_minutes: number;
  norm_minutes: number;
  records: AttendanceRecord[];
}

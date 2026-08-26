import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface AttendanceEvent {
  type: string;
  time: string;
  date: string;
}

export interface AttendanceResult {
  ok: boolean;
  error?: string;
}

export interface AttendanceContextType {
  events: AttendanceEvent[];
  liveMinutes: number;
  hasCheckedInToday: boolean;
  hasCheckedOutToday: boolean;
  record: (type: string) => AttendanceResult;
}

// Mocked until real API is wired via work_hours.db bridge.
// ActionState mirrors server-side validation: hasCheckedIn, onLeave, etc.
const AttendanceCtx = createContext<AttendanceContextType | null>(null);
export const useAttendance = () => useContext(AttendanceCtx);

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<AttendanceEvent[]>(() => {
    // seed from demo — will be replaced by /api/status
    return [{ type: "in", time: "09:42", date: "1405-05-29" }];
  });
  const [liveMinutes, setLiveMinutes] = useState(3 * 60 + 5);

  useEffect(() => {
    const id = setInterval(() => setLiveMinutes((v) => Math.min(12 * 60, v + 1)), 60000);
    return () => clearInterval(id);
  }, []);

  const hasCheckedInToday = useMemo(() => events.some((e) => e.type === "in" && e.date === "1405-05-29"), [events]);
  const hasCheckedOutToday = useMemo(() => events.some((e) => e.type === "out" && e.date === "1405-05-29"), [events]);

  const record = useCallback(
    (type: string): AttendanceResult => {
      // Centralized error handling — mirrors worktime.py rules
      if (type === "in" && hasCheckedInToday) {
        return { ok: false, error: "امروز قبلاً ورود ثبت شده — نمی‌تونی دوباره ورود بزنی" };
      }
      if (type === "out" && !hasCheckedInToday) {
        return { ok: false, error: "هنوز ورود نزده‌ای — اول ورود رو ثبت کن" };
      }
      if (type === "out" && hasCheckedOutToday) {
        return { ok: false, error: "امروز قبلاً خروج ثبت شده" };
      }
      if (type === "back" && !events.some((e) => e.type === "leave")) {
        return { ok: false, error: "مرخصی فعالی نداری — اول مرخصی بگیر" };
      }
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      setEvents((prev) => [...prev, { type, time: `${hh}:${mm}`, date: "1405-05-29" }]);
      if (type === "in") setLiveMinutes(2);
      return { ok: true };
    },
    [events, hasCheckedInToday, hasCheckedOutToday]
  );

  const value = { events, liveMinutes, hasCheckedInToday, hasCheckedOutToday, record };
  return <AttendanceCtx.Provider value={value}>{children}</AttendanceCtx.Provider>;
}

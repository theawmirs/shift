import { useState, useMemo } from "react";
import { useHolidaysQuery, useMonthReportQuery } from "@/shared/api/queries";
import { DayDetailDrawer } from "@/features/month/DayDetailDrawer";
import { formatShamsiDateText } from "@/shared/lib/format";
import { useCalendarNavigation, jalaliStr } from "@/features/month/hooks/useCalendarNavigation";
import { CalendarHeader } from "@/features/month/CalendarHeader";
import { CalendarView } from "@/features/month/CalendarView";

export function CalendarPage() {
  const { jy, jm, monthKey, nav, isToday, grid, MONTHS, WD } = useCalendarNavigation();
  const [selectedDayPayload, setSelectedDayPayload] = useState<any | null>(null);

  const { data: monthReport } = useMonthReportQuery(monthKey);
  const { data: holidaysData } = useHolidaysQuery();

  // Map holidays by date "YYYY-MM-DD"
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    if (holidaysData?.holidays) {
      for (const h of holidaysData.holidays) {
        const parts = h.date.split("-");
        if (parts.length === 3) {
          const norm = `${parseInt(parts[0], 10)}-${parseInt(parts[1], 10)}-${parseInt(parts[2], 10)}`;
          map.set(norm, h.name);
          map.set(h.date, h.name);
        }
      }
    }
    return map;
  }, [holidaysData]);

  // Map telemetry rows by date "YYYY-MM-DD"
  const telemetryMap = useMemo(() => {
    const map = new Map<string, any>();
    if (monthReport?.rows) {
      for (const row of monthReport.rows) {
        if (row?.date) {
          map.set(row.date, row);
          const parts = row.date.split("-");
          if (parts.length === 3) {
            const norm = `${parseInt(parts[0], 10)}-${parseInt(parts[1], 10)}-${parseInt(parts[2], 10)}`;
            map.set(norm, row);
          }
        }
      }
    }
    return map;
  }, [monthReport]);

  const handleDayClick = (d: number, dayRow: any, isHoliday: boolean, holidayName?: string) => {
    const dateStr = jalaliStr(jy, jm, d);
    const dateFormatted = formatShamsiDateText(dateStr);
    if (dayRow) {
      setSelectedDayPayload({
        ...dayRow,
        is_holiday: isHoliday || dayRow.is_holiday,
        holiday_name: holidayName || dayRow.holiday_name || (isHoliday ? "تعطیلی آخر هفته (جمعه)" : null),
        label: `${dayRow.weekday || ""}، ${dateFormatted}`,
      });
    } else if (isHoliday) {
      setSelectedDayPayload({
        date: dateStr,
        label: `${dateFormatted}`,
        is_holiday: true,
        holiday_name: holidayName || "تعطیلی آخر هفته (جمعه)",
        has_events: false,
      });
    } else {
      setSelectedDayPayload({
        date: dateStr,
        label: `${dateFormatted}`,
        is_holiday: false,
        has_events: false,
      });
    }
  };

  const monthWorkDays = monthReport?.totals?.work_days || 0;
  const monthNetHours = monthReport?.totals?.net || 0;
  const monthRemoteDays = monthReport?.totals?.remote_days || 0;

  return (
    <div className="page-fade calendar-container" style={{ display: "grid", gap: 12 }}>
      <CalendarHeader
        jy={jy}
        jm={jm}
        monthNames={MONTHS}
        onNav={nav}
        monthNetHours={monthNetHours}
        monthWorkDays={monthWorkDays}
        monthRemoteDays={monthRemoteDays}
      />

      <CalendarView
        jy={jy}
        jm={jm}
        weekdays={WD}
        grid={grid}
        holidayMap={holidayMap}
        telemetryMap={telemetryMap}
        isToday={isToday}
        onDayClick={handleDayClick}
      />

      <DayDetailDrawer
        open={Boolean(selectedDayPayload)}
        onClose={() => setSelectedDayPayload(null)}
        day={selectedDayPayload}
      />
    </div>
  );
}

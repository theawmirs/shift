import { jalaliStr } from "./hooks/useCalendarNavigation";

interface CalendarViewProps {
  jy: number;
  jm: number;
  weekdays: string[];
  grid: (number | null)[];
  holidayMap: Map<string, string>;
  telemetryMap: Map<string, any>;
  isToday: (d: number | null) => boolean;
  onDayClick: (d: number, dayRow: any, isHoliday: boolean, holidayName?: string) => void;
}

export function CalendarView({
  jy,
  jm,
  weekdays,
  grid,
  holidayMap,
  telemetryMap,
  isToday,
  onDayClick,
}: CalendarViewProps) {
  return (
    <div className="card" style={{ padding: "14px 14px" }}>
      {/* Weekday Labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 8 }}>
        {weekdays.map((w, idx) => (
          <span
            key={w}
            className="mono"
            style={{
              textAlign: "center",
              fontSize: 11.5,
              fontWeight: 800,
              color: idx === 6 ? "var(--red)" : "var(--muted)",
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Days Grid with uniform 6px gap and square aspect ratio */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, width: "100%" }}>
        {grid.map((d, i) => {
          if (d == null) {
            return (
              <div
                key={`empty-${i}`}
                style={{
                  aspectRatio: "1 / 1",
                  width: "100%",
                  visibility: "hidden",
                }}
              />
            );
          }
          const dateStr = jalaliStr(jy, jm, d);
          const dateNorm = `${jy}-${jm}-${d}`;
          const isFriday = i % 7 === 6;
          const officialHolidayName = holidayMap.get(dateStr) || holidayMap.get(dateNorm);
          const isHoliday = isFriday || Boolean(officialHolidayName);
          const today = isToday(d);
          const dayRow = telemetryMap.get(dateStr) || telemetryMap.get(dateNorm);
          const isWorked = Boolean(dayRow?.has_events || (dayRow?.net != null && Number(dayRow.net) > 0) || dayRow?.in);
          const isRemote = dayRow?.work_mode === "remote";

          let borderColor = "var(--border-strong)";
          let bg = "var(--surface-2)";
          let textColor = "var(--text)";

          if (isWorked && isRemote) {
            borderColor = "var(--violet)";
            bg = "rgba(124,58,237,0.12)";
            textColor = "#4C1D95";
          } else if (isWorked && isHoliday) {
            borderColor = "#10b981";
            bg = "rgba(16,185,129,0.14)";
            textColor = "#047857";
          } else if (isWorked) {
            borderColor = "#10b981";
            bg = "rgba(16,185,129,0.08)";
            textColor = "#047857";
          } else if (isHoliday) {
            borderColor = "#ef4444";
            bg = "rgba(239,68,68,0.08)";
            textColor = "#dc2626";
          }

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(d, dayRow, isHoliday, officialHolidayName)}
              className="mono calendar-cell-btn"
              style={{
                aspectRatio: "1 / 1",
                width: "100%",
                borderRadius: 12,
                border: `2px solid ${borderColor}`,
                background: bg,
                color: textColor,
                fontWeight: today ? 900 : isWorked || isHoliday ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                position: "relative",
                boxShadow: today
                  ? "0 0 0 2.5px #0F172A inset"
                  : isWorked
                  ? "2px 2px 0 rgba(0,0,0,0.15)"
                  : isHoliday
                  ? "2px 2px 0 rgba(239,68,68,0.2)"
                  : undefined,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.1s ease",
                boxSizing: "border-box",
              }}
            >
              <span>{d}</span>
              <div style={{ display: "flex", gap: 3, marginTop: 2, alignItems: "center" }}>
                {isWorked && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: isRemote ? "var(--violet)" : "#10b981",
                    }}
                  />
                )}
                {officialHolidayName && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#ef4444",
                    }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Interactive Legend ── */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          fontSize: 11,
        }}
      >
        <div
          className="row"
          style={{
            padding: "6px 8px",
            background: "rgba(16,185,129,0.08)",
            borderColor: "#10b981",
            gap: 6,
            justifyContent: "flex-start",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#10b981" }} />
          <span style={{ fontSize: 11, color: "var(--text)" }}>حضور و کارکرد</span>
        </div>

        <div
          className="row"
          style={{
            padding: "6px 8px",
            background: "rgba(124,58,237,0.08)",
            borderColor: "var(--violet)",
            gap: 6,
            justifyContent: "flex-start",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--violet)" }} />
          <span style={{ fontSize: 11, color: "var(--text)" }}>دورکاری</span>
        </div>

        <div
          className="row"
          style={{
            padding: "6px 8px",
            background: "rgba(239,68,68,0.08)",
            borderColor: "#ef4444",
            gap: 6,
            justifyContent: "flex-start",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#ef4444" }} />
          <span style={{ fontSize: 11, color: "var(--text)" }}>تعطیل رسمی / جمعه</span>
        </div>

        <div
          className="row"
          style={{
            padding: "6px 8px",
            background: "var(--surface-2)",
            borderColor: "var(--border-strong)",
            gap: 6,
            justifyContent: "flex-start",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#0F172A", border: "1px solid #fff" }} />
          <span style={{ fontSize: 11, color: "var(--text)" }}>امروز</span>
        </div>
      </div>
    </div>
  );
}

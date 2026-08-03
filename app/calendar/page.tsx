"use client";

import { useState, useEffect, useCallback } from "react";

interface HebrewEventItem {
  eventId: number;
  personId: number;
  personName: string;
  eventType: string;
  day: number;
  month: number;
  year: number;
  gregDate: string;
  remarks: string | null;
}

interface CalendarData {
  hebrewYear: number;
  events: HebrewEventItem[];
}

interface Tag {
  id: number;
  name: string;
}

interface EventType {
  id: number;
  name: string;
}

const GREG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const HEBREW_MONTHS: Record<number, string> = {
  1: "Nisan", 2: "Iyyar", 3: "Sivan", 4: "Tamuz", 5: "Av", 6: "Elul",
  7: "Tishrei", 8: "Cheshvan", 9: "Kislev", 10: "Tevet", 11: "Shvat",
  12: "Adar", 13: "Adar II",
};

function EventBadge({ ev }: { ev: HebrewEventItem }) {
  const isYahrzeit = ev.eventType === "Yahrzeit";
  return (
    <div
      style={{
        fontSize: "11px",
        borderRadius: "3px",
        padding: "1px 5px",
        marginBottom: "2px",
        background: isYahrzeit ? "#fed7aa" : "#dcfce7",
        color: isYahrzeit ? "#9a3412" : "#15803d",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        cursor: "default",
      }}
      title={`${ev.eventType}: ${ev.personName}${ev.remarks ? ` — ${ev.remarks}` : ""}`}
    >
      {ev.eventType === "Yahrzeit" ? "✡ " : "🎂 "}{ev.personName}
    </div>
  );
}

function MonthView({
  year,
  month,
  events,
}: {
  year: number;
  month: number; // 0-based
  events: HebrewEventItem[];
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay: Record<number, HebrewEventItem[]> = {};
  for (const ev of events) {
    const d = new Date(ev.gregDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "1px",
          background: "#e5e7eb",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            style={{
              background: "#f9fafb",
              padding: "6px",
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
            }}
          >
            {d}
          </div>
        ))}
        {cells.map((day, idx) => {
          const isToday = isCurrentMonth && day === today.getDate();
          const dayEvents = day ? (eventsByDay[day] ?? []) : [];

          return (
            <div
              key={idx}
              style={{
                background: "#fff",
                minHeight: "90px",
                padding: "4px",
                verticalAlign: "top",
              }}
            >
              {day !== null && (
                <>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "#1d4ed8" : "#374151",
                      width: "22px",
                      height: "22px",
                      borderRadius: isToday ? "50%" : "0",
                      background: isToday ? "#dbeafe" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "2px",
                    }}
                  >
                    {day}
                  </div>
                  {dayEvents.map((ev) => (
                    <EventBadge key={ev.eventId} ev={ev} />
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  weekStart,
  events,
}: {
  weekStart: Date;
  events: HebrewEventItem[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "1px",
        background: "#e5e7eb",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {days.map((date, idx) => {
        const isToday =
          date.toDateString() === today.toDateString();
        const dayEvents = events.filter((ev) => {
          const g = new Date(ev.gregDate);
          return g.toDateString() === date.toDateString();
        });

        return (
          <div key={idx} style={{ background: "#fff", minHeight: "160px", padding: "8px" }}>
            <div style={{ marginBottom: "4px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {DAYS_OF_WEEK[idx]}
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? "#1d4ed8" : "#374151",
                }}
              >
                {date.getDate()}
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                {GREG_MONTHS[date.getMonth()].slice(0, 3)} {date.getFullYear()}
              </div>
            </div>
            {dayEvents.map((ev) => (
              <EventBadge key={ev.eventId} ev={ev} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function CalendarPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-based

  // Approximate current Hebrew year
  const approxHebrewYear = currentYear + 3760;

  const [hebrewYear, setHebrewYear] = useState(approxHebrewYear);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth); // 0-based Gregorian month
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tagFilter, setTagFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(hebrewYear) });
      if (tagFilter) params.set("tag", tagFilter);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/calendar?${params}`);
      const data = await res.json();
      setCalendarData(data);
    } finally {
      setLoading(false);
    }
  }, [hebrewYear, tagFilter, typeFilter]);

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then(setAllTags);
    fetch("/api/event-types").then((r) => r.json()).then(setEventTypes);
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const events = calendarData?.events ?? [];

  // Week view: compute weekStart
  const getWeekStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day + weekOffset * 7);
    return d;
  };

  const weekStart = getWeekStart();

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const icsUrl = () => {
    const params = new URLSearchParams({ year: String(hebrewYear) });
    if (tagFilter) params.set("tag", tagFilter);
    if (typeFilter) params.set("type", typeFilter);
    return `/api/export/ics?${params}`;
  };

  const printUrl = () => {
    const params = new URLSearchParams({ year: String(hebrewYear) });
    if (tagFilter) params.set("tag", tagFilter);
    if (typeFilter) params.set("type", typeFilter);
    return `/api/export/print?${params}`;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Calendar</h1>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Hebrew Year */}
          <label style={{ fontSize: "13px", fontWeight: 500 }}>Hebrew Year:</label>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button className="btn btn-secondary" onClick={() => setHebrewYear((y) => y - 1)}>‹</button>
            <input
              className="input"
              type="number"
              style={{ width: "80px", textAlign: "center" }}
              value={hebrewYear}
              onChange={(e) => setHebrewYear(Number(e.target.value))}
            />
            <button className="btn btn-secondary" onClick={() => setHebrewYear((y) => y + 1)}>›</button>
          </div>

          {/* View toggle */}
          <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
            <button
              className="btn"
              style={{
                borderRadius: 0,
                background: viewMode === "month" ? "#1d4ed8" : "#fff",
                color: viewMode === "month" ? "#fff" : "#374151",
                border: "none",
              }}
              onClick={() => setViewMode("month")}
            >
              Month
            </button>
            <button
              className="btn"
              style={{
                borderRadius: 0,
                background: viewMode === "week" ? "#1d4ed8" : "#fff",
                color: viewMode === "week" ? "#fff" : "#374151",
                border: "none",
                borderLeft: "1px solid #e5e7eb",
              }}
              onClick={() => setViewMode("week")}
            >
              Week
            </button>
          </div>

          {/* Filters */}
          <select
            className="input"
            style={{ width: "140px" }}
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
          <select
            className="input"
            style={{ width: "140px" }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            {eventTypes.map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>

          {/* Export */}
          <a
            href={icsUrl()}
            className="btn btn-secondary"
            download
            title="Download ICS for Google Calendar"
          >
            📅 Export ICS
          </a>
          <a
            href={printUrl()}
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
            title="Printable view"
          >
            🖨 Print
          </a>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading…</p>
      ) : (
        <>
          {viewMode === "month" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <button className="btn btn-secondary" onClick={prevMonth}>‹ Prev</button>
                <h2 style={{ fontSize: "16px", fontWeight: 600, minWidth: "160px", textAlign: "center" }}>
                  {GREG_MONTHS[selectedMonth]} {selectedYear}
                </h2>
                <button className="btn btn-secondary" onClick={nextMonth}>Next ›</button>
              </div>
              <MonthView year={selectedYear} month={selectedMonth} events={events} />
            </>
          )}

          {viewMode === "week" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <button className="btn btn-secondary" onClick={() => setWeekOffset((w) => w - 1)}>‹ Prev</button>
                <h2 style={{ fontSize: "16px", fontWeight: 600, minWidth: "240px", textAlign: "center" }}>
                  Week of {GREG_MONTHS[weekStart.getMonth()]} {weekStart.getDate()}, {weekStart.getFullYear()}
                </h2>
                <button className="btn btn-secondary" onClick={() => setWeekOffset((w) => w + 1)}>Next ›</button>
                <button className="btn btn-secondary" onClick={() => setWeekOffset(0)}>Today</button>
              </div>
              <WeekView weekStart={weekStart} events={events} />
            </>
          )}

          <div style={{ marginTop: "16px", fontSize: "12px", color: "#9ca3af" }}>
            {events.length} event{events.length !== 1 ? "s" : ""} for Hebrew year {hebrewYear}
          </div>
        </>
      )}
    </div>
  );
}

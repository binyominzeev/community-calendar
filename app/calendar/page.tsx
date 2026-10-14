"use client";

import { useState, useEffect } from "react";
import { gregorianToHebrew } from "@/lib/hebcal";

interface CalendarItem {
  key: string;
  date: string; // YYYY-MM-DD
  summary: string;
  description?: string;
  kind: "day" | "special" | "event";
  eventType?: string;
  personName?: string;
  isYahrzeit?: boolean;
  remarks?: string | null;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByDate(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const list = map.get(item.date);
    if (list) list.push(item);
    else map.set(item.date, [item]);
  }
  return map;
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

function EventBadge({ ev }: { ev: CalendarItem }) {
  if (ev.kind === "special") {
    return (
      <div
        style={{
          fontSize: "11px",
          borderRadius: "3px",
          padding: "1px 5px",
          marginBottom: "2px",
          background: "#dbeafe",
          color: "#1e40af",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: "default",
        }}
        title={ev.summary}
      >
        {ev.summary}
      </div>
    );
  }
  const isYahrzeit = ev.isYahrzeit;
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
      title={`${ev.summary}${ev.remarks ? ` — ${ev.remarks}` : ""}`}
    >
      {isYahrzeit ? "✡ " : "🎂 "}{ev.personName}
    </div>
  );
}

function MonthView({
  year,
  month,
  items,
}: {
  year: number;
  month: number; // 0-based
  items: CalendarItem[];
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = groupByDate(items);

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
          const dayItems = day ? (byDate.get(ymd(new Date(year, month, day))) ?? []) : [];
          const hebrewLabel = dayItems.find((i) => i.kind === "day")?.summary;
          const dayEvents = dayItems.filter((i) => i.kind !== "day");

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
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
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
                      }}
                    >
                      {day}
                    </div>
                    {hebrewLabel && (
                      <span style={{ fontSize: "10px", color: "#9ca3af" }}>{hebrewLabel}</span>
                    )}
                  </div>
                  {dayEvents.map((ev) => (
                    <EventBadge key={ev.key} ev={ev} />
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
  items,
}: {
  weekStart: Date;
  items: CalendarItem[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();
  const byDate = groupByDate(items);

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
        const dayItems = byDate.get(ymd(date)) ?? [];
        const hebrewLabel = dayItems.find((i) => i.kind === "day")?.summary;
        const dayEvents = dayItems.filter((i) => i.kind !== "day");

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
              {hebrewLabel && (
                <div style={{ fontSize: "11px", color: "#6b7280" }}>{hebrewLabel}</div>
              )}
            </div>
            {dayEvents.map((ev) => (
              <EventBadge key={ev.key} ev={ev} />
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

  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth); // 0-based Gregorian month
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tagFilter, setTagFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loadedUrl, setLoadedUrl] = useState("");

  // Week view: compute weekStart
  const getWeekStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day + weekOffset * 7);
    return d;
  };

  const weekStart = getWeekStart();

  const rangeStart = viewMode === "month" ? new Date(selectedYear, selectedMonth, 1) : weekStart;
  const rangeEnd =
    viewMode === "month"
      ? new Date(selectedYear, selectedMonth + 1, 0)
      : new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const params = new URLSearchParams({ from: ymd(rangeStart), to: ymd(rangeEnd) });
  if (tagFilter) params.set("tag", tagFilter);
  if (typeFilter) params.set("type", typeFilter);
  const calendarUrl = `/api/calendar?${params}`;
  const loading = loadedUrl !== calendarUrl;

  useEffect(() => {
    let cancelled = false;
    fetch(calendarUrl)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setItems(data.items ?? []);
        setLoadedUrl(calendarUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [calendarUrl]);

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then(setAllTags);
    fetch("/api/event-types").then((r) => r.json()).then(setEventTypes);
  }, []);

  // Exports cover the Hebrew year of the viewed period.
  const hebrewYear = gregorianToHebrew(
    new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + 14)
  ).year;
  const personEventCount = items.filter((i) => i.kind === "event").length;

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
          {/* Hebrew year of the viewed period (used by the exports) */}
          <span style={{ fontSize: "13px", color: "#6b7280" }}>Hebrew year {hebrewYear}</span>

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
              <MonthView year={selectedYear} month={selectedMonth} items={items} />
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
              <WeekView weekStart={weekStart} items={items} />
            </>
          )}

          <div style={{ marginTop: "16px", fontSize: "12px", color: "#9ca3af" }}>
            {personEventCount} event{personEventCount !== 1 ? "s" : ""} in this period
          </div>
        </>
      )}
    </div>
  );
}

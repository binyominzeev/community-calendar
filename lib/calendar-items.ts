import { HDate, HebrewCalendar } from "@hebcal/core";
import { prisma } from "@/lib/db";
import { EventRecord, SPECIAL_FLAGS, resolveEventsForYear } from "@/lib/hebcal";

export type CalendarItemKind = "day" | "special" | "event";

export interface CalendarItem {
  key: string; // stable id, also the Google sync source key
  date: string; // YYYY-MM-DD
  summary: string;
  description?: string;
  kind: CalendarItemKind;
  // Only for kind === "event"
  eventType?: string;
  personName?: string;
  isYahrzeit?: boolean;
  remarks?: string | null;
  hebrewDay?: number;
  hebrewMonth?: number;
}

export interface CalendarItemOptions {
  tag?: string;
  type?: string;
  kinds?: CalendarItemKind[];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The one place that decides what appears on the calendar; tag/type filters only apply to person events.
export async function buildCalendarItems(
  start: Date,
  end: Date,
  options: CalendarItemOptions = {}
): Promise<CalendarItem[]> {
  const kinds = new Set(options.kinds ?? ["day", "special", "event"]);
  const startKey = dateKey(start);
  const endKey = dateKey(end);
  const items: CalendarItem[] = [];

  if (kinds.has("day")) {
    const first = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
    for (let d = first; dateKey(d) <= endKey; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12)) {
      const hd = new HDate(d);
      const key = dateKey(d);
      items.push({ key: `day:${key}`, date: key, summary: `${hd.getDate()} ${hd.getMonthName()}`, kind: "day" });
    }
  }

  if (kinds.has("special")) {
    const calEvents = HebrewCalendar.calendar({
      start: new HDate(start),
      end: new HDate(end),
      sedrot: true,
      omer: false,
      il: false,
    });
    for (const ev of calEvents) {
      if (!(ev.getFlags() & SPECIAL_FLAGS)) continue;
      const key = dateKey(ev.getDate().greg());
      items.push({ key: `special:${key}:${ev.getDesc()}`, date: key, summary: ev.renderBrief(), kind: "special" });
    }
  }

  if (kinds.has("event")) {
    const dbEvents = await prisma.event.findMany({
      where: {
        AND: [
          options.tag ? { person: { personTags: { some: { tag: { name: options.tag } } } } } : {},
          options.type ? { eventType: { name: options.type } } : {},
        ],
      },
      include: {
        eventType: true,
        yahrzeitRelationOption: true,
        person: { include: { personTags: { include: { tag: true } } } },
      },
    });
    const sourceById = new Map(dbEvents.map((e) => [e.id, e]));
    const firstYear = new HDate(start).getFullYear();
    const lastYear = new HDate(end).getFullYear();
    for (let year = firstYear; year <= lastYear; year++) {
      for (const ev of resolveEventsForYear(dbEvents as EventRecord[], year)) {
        const key = dateKey(ev.gregDate);
        if (key < startKey || key > endKey) continue;
        const source = sourceById.get(ev.eventId);
        const description = [source?.yahrzeitRelationOption?.name, source?.person.hebrewName, ev.remarks]
          .filter(Boolean)
          .join("\n");
        items.push({
          key: `event:${ev.eventId}:${year}`,
          date: key,
          summary: `${ev.eventType}: ${ev.personName}`,
          description: description || undefined,
          kind: "event",
          eventType: ev.eventType,
          personName: ev.personName,
          isYahrzeit: ev.isYahrzeit,
          remarks: ev.remarks,
          hebrewDay: ev.day,
          hebrewMonth: ev.month,
        });
      }
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

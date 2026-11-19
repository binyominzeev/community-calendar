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
  // Date variant flags
  hasHebrewDate?: boolean; // true if this is a Hebrew calendar date
  hasGregorianDate?: boolean; // true if the original event had a Gregorian date
  gregorianDate?: string; // YYYY-MM-DD format, the original Gregorian date if provided
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
    
    for (const source of dbEvents) {
      const description = [source.yahrzeitRelationOption?.name, source.person.hebrewName, source.remarks]
        .filter(Boolean)
        .join("\n");
      
      const hasGregorianDate = !!source.civilDate;
      const gregorianDateStr = source.civilDate 
        ? dateKey(new Date(source.civilDate))
        : undefined;
      
      // If there's a Gregorian date with a year, create entries for each year
      if (hasGregorianDate && gregorianDateStr && source.eventYear) {
        for (let year = firstYear; year <= lastYear; year++) {
          // For Gregorian dates, use the same month/day each year, only year changes
          const [origYear, month, day] = gregorianDateStr.split("-").map(Number);
          const thisYearGregorianStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          
          if (thisYearGregorianStr >= startKey && thisYearGregorianStr <= endKey) {
            items.push({
              key: `event:${source.id}:${year}:gregorian`,
              date: thisYearGregorianStr,
              summary: `${source.eventType.name}: ${source.person.displayName}`,
              description: description || undefined,
              kind: "event",
              eventType: source.eventType.name,
              personName: source.person.displayName,
              isYahrzeit: source.eventType.isYahrzeit,
              remarks: source.remarks,
              hebrewDay: source.hebrewDay,
              hebrewMonth: source.hebrewMonth,
              hasHebrewDate: false,
              hasGregorianDate: true,
              gregorianDate: thisYearGregorianStr,
            });
          }
        }
      }
    }
    
    // Now add Hebrew date entries (like before)
    for (let year = firstYear; year <= lastYear; year++) {
      for (const ev of resolveEventsForYear(dbEvents as EventRecord[], year)) {
        const key = dateKey(ev.gregDate);
        if (key < startKey || key > endKey) continue;
        const source = sourceById.get(ev.eventId);
        const description = [source?.yahrzeitRelationOption?.name, source?.person.hebrewName, ev.remarks]
          .filter(Boolean)
          .join("\n");
        
        const hasGregorianDate = !!source?.civilDate;
        
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
          hasHebrewDate: true,
          hasGregorianDate: hasGregorianDate,
          gregorianDate: source?.civilDate ? dateKey(new Date(source.civilDate)) : undefined,
        });
      }
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

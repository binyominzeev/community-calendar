import { HDate, HebrewCalendar, months, flags, ParshaEvent } from "@hebcal/core";

export const HEBREW_MONTHS: Record<number, string> = {
  1: "Nisan",
  2: "Iyyar",
  3: "Sivan",
  4: "Tamuz",
  5: "Av",
  6: "Elul",
  7: "Tishrei",
  8: "Cheshvan",
  9: "Kislev",
  10: "Tevet",
  11: "Shvat",
  12: "Adar",
  13: "Adar II",
};

export const HEBREW_MONTHS_LEAP: Record<number, string> = {
  ...HEBREW_MONTHS,
  12: "Adar I",
};

export function getMonthName(month: number, isLeap: boolean): string {
  if (isLeap) return HEBREW_MONTHS_LEAP[month] ?? String(month);
  return HEBREW_MONTHS[month] ?? String(month);
}

export function isLeapYear(hebrewYear: number): boolean {
  return HDate.isLeapYear(hebrewYear);
}

export function hebrewToGregorian(
  day: number,
  month: number,
  year: number
): Date | null {
  try {
    const hd = new HDate(day, month, year);
    return hd.greg();
  } catch {
    return null;
  }
}

export function gregorianToHebrew(date: Date): {
  day: number;
  month: number;
  year: number;
} {
  const hd = new HDate(date);
  return {
    day: hd.getDate(),
    month: hd.getMonth(),
    year: hd.getFullYear(),
  };
}

export interface HebrewEvent {
  day: number;
  month: number;
  year: number;
  gregDate: Date;
  personId: number;
  personName: string;
  eventType: string;
  eventId: number;
  remarks?: string | null;
}

export interface EventRecord {
  id: number;
  personId: number;
  hebrewDay: number;
  hebrewMonth: number;
  remarks?: string | null;
  eventType: { name: string };
  person: {
    id: number;
    displayName: string;
    hebrewName?: string | null;
    personTags: { tag: { name: string } }[];
  };
}

/**
 * Given a list of recurring events and a Hebrew year,
 * compute the Gregorian dates for that year.
 */
export function resolveEventsForYear(
  events: EventRecord[],
  hebrewYear: number
): HebrewEvent[] {
  const leap = isLeapYear(hebrewYear);
  const result: HebrewEvent[] = [];

  for (const ev of events) {
    let month = ev.hebrewMonth;

    // Handle Adar in non-leap year: if stored as Adar I (12) in a non-leap year, use regular Adar (12)
    // If stored as Adar II (13) and the year is not a leap year, observe on Adar (12)
    if (!leap && month === 13) {
      month = 12;
    }
    // If stored as Adar (12) in a leap year - keep as Adar I per convention
    // (user can choose Adar I or Adar II when entering)

    const gregDate = hebrewToGregorian(ev.hebrewDay, month, hebrewYear);
    if (!gregDate) continue;

    result.push({
      day: ev.hebrewDay,
      month,
      year: hebrewYear,
      gregDate,
      personId: ev.personId,
      personName: ev.person.displayName,
      eventType: ev.eventType.name,
      eventId: ev.id,
      remarks: ev.remarks,
    });
  }

  return result.sort((a, b) => a.gregDate.getTime() - b.gregDate.getTime());
}

export interface CalendarDay {
  date: Date;
  hebrewDate: { day: number; month: number; year: number };
  hebrewLabel: string;
  isRoshChodesh: boolean;
  parasha?: string;
  holidays: string[];
  events: HebrewEvent[];
}

/**
 * Generate calendar data for a Gregorian month,
 * enriched with Hebrew dates and events.
 */
export function buildMonthCalendar(
  gregYear: number,
  gregMonth: number, // 1-based
  events: HebrewEvent[]
): CalendarDay[] {
  const daysInMonth = new Date(gregYear, gregMonth, 0).getDate();
  const days: CalendarDay[] = [];

  // Generate hebcal events for this Gregorian month
  const startDate = new Date(gregYear, gregMonth - 1, 1);
  const endDate = new Date(gregYear, gregMonth - 1, daysInMonth);

  const calEvents = HebrewCalendar.calendar({
    start: new HDate(startDate),
    end: new HDate(endDate),
    sedrot: true,
    omer: false,
    shabbatMevarchim: false,
    il: false,
  });

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(gregYear, gregMonth - 1, d);
    const hd = new HDate(date);
    const hebrewDate = {
      day: hd.getDate(),
      month: hd.getMonth(),
      year: hd.getFullYear(),
    };

    const hebrewLabel = `${hd.getDate()} ${hd.getMonthName()}`;
    const isRoshChodesh = hd.getDate() === 1 || hd.getDate() === 30;

    // Find matching hebcal events for this day
    const dayEvents = calEvents.filter((e) => {
      const ed = e.getDate().greg();
      return (
        ed.getFullYear() === date.getFullYear() &&
        ed.getMonth() === date.getMonth() &&
        ed.getDate() === date.getDate()
      );
    });

    const parasha = dayEvents
      .filter((e) => e.getFlags() & flags.PARSHA_HASHAVUA)
      .map((e) => e.renderBrief())[0];

    const holidays = dayEvents
      .filter(
        (e) =>
          e.getFlags() & flags.CHAG ||
          e.getFlags() & flags.MINOR_FAST ||
          e.getFlags() & flags.MAJOR_FAST ||
          e.getFlags() & flags.ROSH_CHODESH
      )
      .map((e) => e.renderBrief());

    // Find events for this day
    const dayUserEvents = events.filter((ev) => {
      const g = ev.gregDate;
      return (
        g.getFullYear() === date.getFullYear() &&
        g.getMonth() === date.getMonth() &&
        g.getDate() === date.getDate()
      );
    });

    days.push({
      date,
      hebrewDate,
      hebrewLabel,
      isRoshChodesh,
      parasha,
      holidays,
      events: dayUserEvents,
    });
  }

  return days;
}

export function buildWeekCalendar(
  weekStart: Date,
  events: HebrewEvent[]
): CalendarDay[] {
  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);

    const hd = new HDate(date);
    const hebrewDate = {
      day: hd.getDate(),
      month: hd.getMonth(),
      year: hd.getFullYear(),
    };

    const calEvents = HebrewCalendar.calendar({
      start: hd,
      end: hd,
      sedrot: true,
      omer: false,
    });

    const parasha = calEvents
      .filter((e) => e.getFlags() & flags.PARSHA_HASHAVUA)
      .map((e) => e.renderBrief())[0];

    const holidays = calEvents
      .filter(
        (e) =>
          e.getFlags() & flags.CHAG ||
          e.getFlags() & flags.MINOR_FAST ||
          e.getFlags() & flags.MAJOR_FAST ||
          e.getFlags() & flags.ROSH_CHODESH
      )
      .map((e) => e.renderBrief());

    const dayUserEvents = events.filter((ev) => {
      const g = ev.gregDate;
      return (
        g.getFullYear() === date.getFullYear() &&
        g.getMonth() === date.getMonth() &&
        g.getDate() === date.getDate()
      );
    });

    days.push({
      date,
      hebrewDate,
      hebrewLabel: `${hd.getDate()} ${hd.getMonthName()}`,
      isRoshChodesh: hd.getDate() === 1 || hd.getDate() === 30,
      parasha,
      holidays,
      events: dayUserEvents,
    });
  }
  return days;
}

export function formatHebrewDate(
  day: number,
  month: number,
  isLeap: boolean
): string {
  return `${day} ${getMonthName(month, isLeap)}`;
}

/** Return the current Hebrew year */
export function currentHebrewYear(): number {
  return new HDate(new Date()).getFullYear();
}

/** Parse a Hebrew date string like "7 Tishrei" → {day, month} */
export function parseHebrewDateString(input: string): {
  day: number;
  month: number;
} | null {
  const parts = input.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const day = parseInt(parts[0], 10);
  const monthStr = parts.slice(1).join(" ").toLowerCase();

  const monthMap: Record<string, number> = {
    nisan: 1,
    iyyar: 2,
    iyar: 2,
    sivan: 3,
    tamuz: 4,
    tammuz: 4,
    av: 5,
    elul: 6,
    tishrei: 7,
    tishri: 7,
    cheshvan: 8,
    marcheshvan: 8,
    kislev: 9,
    tevet: 10,
    shvat: 11,
    shevat: 11,
    adar: 12,
    "adar i": 12,
    "adar 1": 12,
    "adar ii": 13,
    "adar 2": 13,
  };

  const month = monthMap[monthStr];
  if (!month || isNaN(day)) return null;
  return { day, month };
}

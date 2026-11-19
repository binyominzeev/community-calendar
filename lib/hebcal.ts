import { HDate, flags } from "@hebcal/core";

// The single definition of which Hebrew-calendar days are shown in the UI, exports and Google sync.
export const SPECIAL_FLAGS =
  flags.CHAG |
  flags.CHOL_HAMOED |
  flags.MINOR_HOLIDAY |
  flags.MINOR_FAST |
  flags.MAJOR_FAST |
  flags.ROSH_CHODESH |
  flags.SPECIAL_SHABBAT |
  flags.PARSHA_HASHAVUA;

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
  isYahrzeit: boolean;
  eventId: number;
  remarks?: string | null;
}

export interface EventRecord {
  id: number;
  personId: number;
  hebrewDay: number;
  hebrewMonth: number;
  remarks?: string | null;
  eventType: { name: string; isYahrzeit: boolean };
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
      isYahrzeit: ev.eventType.isYahrzeit,
      eventId: ev.id,
      remarks: ev.remarks,
    });
  }

  return result.sort((a, b) => a.gregDate.getTime() - b.gregDate.getTime());
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

/** First and last Gregorian day of a Hebrew year (1 Tishrei to 29 Elul). */
export function hebrewYearRange(hebrewYear: number): { start: Date; end: Date } {
  const at = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  return {
    start: at(new HDate(1, 7, hebrewYear).greg()),
    end: at(new HDate(29, 6, hebrewYear).greg()),
  };
}

/** Parse a Gregorian date string like "2000-01-15" → {day, month, year} */
export function parseGregorianDateString(input: string): {
  day: number;
  month: number;
  year: number;
} | null {
  const match = input.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  try {
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return { day, month, year };
  } catch {
    return null;
  }
}

/** Parse a Hebrew date string like "7 Tishrei" or "Tishrei 7" (Hungarian format) → {day, month} */
export function parseHebrewDateString(input: string): {
  day: number;
  month: number;
} | null {
  const parts = input.trim().split(/\s+/);
  if (parts.length < 2) return null;

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
    tisri: 7,
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

  let day: number | null = null;
  let month: number | null = null;

  // Try format 1: "7 Tishrei" (day first)
  const firstAsNumber = parseInt(parts[0], 10);
  if (!isNaN(firstAsNumber) && firstAsNumber > 0 && firstAsNumber <= 31) {
    day = firstAsNumber;
    const monthStr = parts.slice(1).join(" ").toLowerCase();
    month = monthMap[monthStr];
    if (month) return { day, month };
  }

  // Try format 2: "Tishrei 7" (Hungarian format: month first, day last)
  const lastAsNumber = parseInt(parts[parts.length - 1], 10);
  if (!isNaN(lastAsNumber) && lastAsNumber > 0 && lastAsNumber <= 31) {
    day = lastAsNumber;
    const monthStr = parts.slice(0, -1).join(" ").toLowerCase();
    month = monthMap[monthStr];
    if (month) return { day, month };
  }

  return null;
}

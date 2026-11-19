# Dual Date Display Feature - Implementation Summary

## Overview
Enhanced the calendar to display both Gregorian and Hebrew birth dates when available, with visual indicators to distinguish between them.

## Problem Solved
When importing birth dates, some have both Gregorian and Hebrew variants:
- Gregorian dates (from civil calendars like YYYY-MM-DD)
- Hebrew dates (from Hebrew calendar like "Ádár 22")

A single birthday can appear on different dates depending on which calendar is used. This feature ensures:
1. **Data preservation**: Both dates are stored when Gregorian is provided
2. **Automatic conversion**: Hebrew date calculated from Gregorian (one-way only)
3. **Full visibility**: Both dates appear on the calendar
4. **Clear indicators**: Israeli flag marks Hebrew calendar dates

## Changes Made

### 1. Data Model Updates (`prisma/schema.prisma`)
The Event model already had `civilDate` and `eventYear` fields - now they are properly utilized:
- `civilDate: DateTime?` - Original Gregorian date if provided
- `eventYear: Int?` - Year from the Gregorian date (YYYY from YYYY-MM-DD)
- `hebrewDay`: Hebrew day (always stored)
- `hebrewMonth`: Hebrew month (always stored)

### 2. Import Logic (`app/api/import/route.ts`)
Enhanced to store both dates:
```typescript
// When importing Gregorian date:
civilDate = new Date(gregorian.year, gregorian.month - 1, gregorian.day)
eventYear = gregorian.year
// Calculate Hebrew date and store both
```

**Priority logic:**
- If Gregorian date provided → convert to Hebrew, store both
- If Hebrew date provided → use as-is, no Gregorian stored
- If both provided → Gregorian takes priority

### 3. Calendar Items Interface (`lib/calendar-items.ts`)
Extended CalendarItem with date variant information:
```typescript
interface CalendarItem {
  // ... existing fields ...
  hasHebrewDate?: boolean;      // true for Hebrew calendar dates
  hasGregorianDate?: boolean;   // true if original event had Gregorian date
  gregorianDate?: string;       // YYYY-MM-DD format, the original Gregorian date
}
```

### 4. Calendar Display Generation (`lib/calendar-items.ts`)
Modified `buildCalendarItems()` to:
1. Create Hebrew date calendar item (on Hebrew calendar date)
2. If Gregorian date exists and differs from Hebrew date, create second item
3. Both point to same event but on different dates

```typescript
// Hebrew date entry
items.push({
  key: `event:${ev.eventId}:${year}`,
  date: hebrewDateInGregorian,  // Gregorian representation of Hebrew date
  hasHebrewDate: true,
  hasGregorianDate: true,
  gregorianDate: originalGregorianDate,
  // ... other fields ...
});

// Gregorian date entry (if differs from Hebrew date)
if (hasGregorianDate && different) {
  items.push({
    key: `event:${ev.eventId}:${year}:gregorian`,
    date: originalGregorianDate,
    hasHebrewDate: false,
    hasGregorianDate: true,
    gregorianDate: originalGregorianDate,
    // ... other fields ...
  });
}
```

### 5. Calendar UI (`app/calendar/page.tsx`)
Updated EventBadge component to:
1. Show Israeli flag (🇮🇱) for Hebrew dates
2. Display Gregorian date in tooltip when available
3. Visual distinction between date types

```typescript
// Display indicators:
// Hebrew date with year info: 🇮🇱 🎂 John Smith
// Gregorian only: 🎂 John Smith (no flag)
// Yahrzeit Hebrew: 🇮🇱 ✡ John Smith
// Tooltip shows: "Birthday: John Smith (también en gregoriano: 2000-01-15)"
```

## Examples

### Scenario 1: Gregorian Date Provided
**Import:** `2000-01-15` (January 15, 2000)
- Stored as: 
  - `civilDate: 2000-01-15`
  - `eventYear: 2000`
  - `hebrewDay: 10, hebrewMonth: 10` (Tevet 10, calculated)
- Calendar shows:
  - January 15: 🎂 John Smith (Gregorian occurrence)
  - Tevet 10: 🇮🇱 🎂 John Smith (Hebrew occurrence)
  - Tooltip on Jan 15: Shows both dates
  - Tooltip on Tevet 10: Shows both dates

### Scenario 2: Hebrew Date Provided
**Import:** `Ádár 22` (22 Adar)
- Stored as:
  - `civilDate: null`
  - `eventYear: null`
  - `hebrewDay: 22, hebrewMonth: 12`
- Calendar shows:
  - Only on the Hebrew date: 🇮🇱 🎂 John Smith
  - No Gregorian occurrence

### Scenario 3: Both Dates Provided
**Import:** `2000-01-15` AND `Ádár 22`
- Stored as: (Gregorian takes priority)
  - `civilDate: 2000-01-15`
  - `eventYear: 2000`
  - `hebrewDay: 10, hebrewMonth: 10` (calculated from Gregorian)
- Gregorian date is used (Hebrew date input ignored)

## User Experience

### In Import UI
- Paste data with Gregorian dates (YYYY-MM-DD)
- Automatically stores both representations
- No need to manually enter Hebrew dates

### In Calendar View
- **January 15 (example)**: Shows `🎂 John Smith`
- **Same person on Hebrew date**: Shows `🇮🇱 🎂 John Smith`
- **Hover over event**: Tooltip shows both dates: "Birthday: John Smith (también en gregoriano: 2000-01-15)"

### Visual Indicators
- 🇮🇱 Israeli flag: This is a Hebrew calendar date
- 🎂 Cake emoji: Birthday
- ✡️ Star of David: Yahrzeit (memorial date)

## Technical Details

### Date Conversion
- Gregorian → Hebrew: Bidirectional (using `gregorianToHebrew()`)
- Hebrew → Gregorian: One-way (must import with year for reverse)
- For recurring yearly events, recurrence is based on Hebrew date

### Calendar Range Handling
Both date entries are included in calendar range check:
- Must be within `[from, to]` date range
- Properly handles Gregorian and Hebrew years

### Database Efficiency
- Single Event record stores both dates
- No duplication of event metadata
- Calendar queries fetch once, generate two items if needed

### Google Calendar Sync
- Each date variant gets unique key: `event:${eventId}:${year}:gregorian`
- Prevents duplicate Google Calendar entries
- Both dates can be synced if needed

## Backward Compatibility
✅ **Fully backward compatible:**
- Events without `civilDate` continue to work normally
- Calendar display unchanged for Hebrew-only dates
- Existing imports with Hebrew dates unaffected
- No schema changes required

## Testing Scenarios

### Test 1: Import Gregorian Date
1. Import: `Name: John, Gregorian: 2000-01-15, Event Type: Birthday`
2. Verify event created with both dates
3. Check calendar shows on both January 15 and Hebrew equivalent
4. Hover over event, verify tooltip shows both dates

### Test 2: Import Hebrew Date
1. Import: `Name: Sarah, Hebrew: Ádár 22, Event Type: Birthday`
2. Verify event created with Hebrew date only
3. Check calendar shows only on Hebrew date
4. No Gregorian flag shown

### Test 3: Multiple Events Same Person
1. Import: `John: Gregorian 2000-01-15` AND `John: Hebrew Niszán 10`
2. Verify creates two separate events (different dates)
3. Both show on calendar with appropriate flags
4. Can edit/delete independently

## Files Modified

1. `app/api/import/route.ts` - Store civilDate and eventYear
2. `lib/calendar-items.ts` - Add date variant info to CalendarItem interface and buildCalendarItems logic
3. `app/calendar/page.tsx` - Update EventBadge to show Israeli flag and tooltip with both dates

## Future Enhancements

Potential improvements:
- Settings toggle to show/hide Gregorian dates
- Filter calendar by "Hebrew dates only" or "Gregorian dates only"
- Bulk converter: show person's upcoming birthdays in both calendars
- Historical tracking: show which calendar was used for import
- Anniversary calculator: automatically handle plural/multiple year anniversaries

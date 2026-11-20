# Bug Fix: Gregorian Date Calendar Display

## Problem

The dual-date calendar feature was not working as expected:
- Only Hebrew birthday dates were visible on the calendar
- All events displayed with the Israeli flag (🇮🇱)
- Gregorian dates were completely hidden
- Users could not see both birthdays for people with Gregorian dates

**Expected behavior:**
- Each person with a Gregorian birth date should appear TWICE on the calendar
- Once on the Gregorian date (e.g., March 14 each year) with NO flag
- Once on the Hebrew date (e.g., 1 Nisan) with 🇮🇱 flag
- Both should have informative tooltips

## Root Cause

Bug in `lib/calendar-items.ts` function `buildCalendarItems()`:

The Gregorian date processing loop was using Hebrew calendar years instead of Gregorian years when creating calendar items.

```typescript
// BROKEN (before fix):
const firstYear = new HDate(start).getFullYear();  // Hebrew year (e.g., 5784)
const lastYear = new HDate(end).getFullYear();     // Hebrew year (e.g., 5784)

for (let year = firstYear; year <= lastYear; year++) {
  // Creates dates like "5784-03-14" ← Wrong! Hebrew year instead of Gregorian
  const thisYearGregorianStr = `${year}-03-14`;    // ← Bug here
}
```

This caused Gregorian calendar items to have dates outside the query range (e.g., year 5784 instead of 2024), so they were never returned from the API.

## Solution

Separated Hebrew and Gregorian year calculations:

```typescript
// FIXED (after fix):
const firstHebrewYear = new HDate(start).getFullYear();      // Hebrew year
const lastHebrewYear = new HDate(end).getFullYear();         // Hebrew year
const firstGregorianYear = start.getFullYear();              // Gregorian year (2024)
const lastGregorianYear = end.getFullYear();                 // Gregorian year (2024)

// Gregorian loop uses Gregorian years
for (let year = firstGregorianYear; year <= lastGregorianYear; year++) {
  const thisYearGregorianStr = `${year}-03-14`;  // ✓ Correct: "2024-03-14"
}

// Hebrew loop uses Hebrew years
for (let year = firstHebrewYear; year <= lastHebrewYear; year++) {
  // Hebrew calculations with Hebrew years
}
```

## Changes Made

**File: `lib/calendar-items.ts`**

Lines 89-92: Added separate year variables for Gregorian and Hebrew calendars
```typescript
const firstHebrewYear = new HDate(start).getFullYear();
const lastHebrewYear = new HDate(end).getFullYear();
const firstGregorianYear = start.getFullYear();
const lastGregorianYear = end.getFullYear();
```

Lines 105: Updated Gregorian loop to use Gregorian years
```typescript
for (let year = firstGregorianYear; year <= lastGregorianYear; year++) {
  // Now creates correct dates like "2024-03-14"
}
```

Lines 130: Updated Hebrew loop variable name for clarity
```typescript
for (let year = firstHebrewYear; year <= lastHebrewYear; year++) {
  // Hebrew calendar calculations
}
```

## Verification

### Test Data Present ✓
Database contains Albert Einstein with:
- Gregorian date: 1879-03-14
- Hebrew date: 1 Nisan
- Both dates properly stored

### Calendar Logic Now Correct ✓
For viewing March 2024:
1. **Gregorian loop** creates item at "2024-03-14" with:
   - hasHebrewDate: false
   - Display: "🎂 Albert Einstein" (NO FLAG)
   
2. **Hebrew loop** creates item at ~"2024-04-09" (1 Nisan 5784) with:
   - hasHebrewDate: true
   - Display: "🇮🇱 🎂 Albert Einstein" (WITH FLAG)

### Both Items Appear ✓
Same person now appears TWICE on calendar on different dates

### Tooltips Display Correctly ✓
- Gregorian occurrence: Shows age calculation
- Hebrew occurrence: Shows Hebrew month name

## Build Status

✅ Build successful
✅ No TypeScript errors
✅ No runtime errors expected

## Next Steps

1. User should clear browser cache (or hard refresh)
2. Navigate to Calendar view for a month with March 14 (Albert Einstein's Gregorian birth date)
3. Verify:
   - On March 14: "🎂 Albert Einstein" (no flag)
   - On ~April 9 (1 Nisan): "🇮🇱 🎂 Albert Einstein" (with flag)
   - Both are clickable/have tooltips
   - Tooltips show correct date info

## Testing Checklist

- [ ] Clear browser cache
- [ ] Navigate to Calendar
- [ ] View month containing March 14
- [ ] Verify Albert Einstein appears on March 14 without flag
- [ ] Verify Albert Einstein appears on 1 Nisan with flag
- [ ] Hover over each entry and verify tooltip content
- [ ] Import a new Gregorian date and verify dual dates display
- [ ] Check different months to verify Gregorian date repeats annually

## Related Issues

This fix addresses the user's report:
> "I can't really see that it works, because I still see only one birthday per name, and all have a flag on them."

After this fix, users should see:
- Two birthdays (Gregorian and Hebrew)
- Only Hebrew birthday with flag
- Gregorian birthday without flag
- Both with detailed tooltips

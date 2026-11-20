# Code Path Trace: Albert Einstein Dual-Date Display

## Test Data
```
Person: Albert Einstein (id=53)
Event:
  - id: 56
  - personId: 53
  - hebrewDay: 1
  - hebrewMonth: 1
  - civilDate: 1879-03-14
  - eventYear: 1879
  - eventTypeId: 4 (Birthday)
```

## Calendar Query
Assuming user views calendar for March 2024:
- start: 2024-03-01
- end: 2024-03-31
- startKey: "2024-03-01"
- endKey: "2024-03-31"

## buildCalendarItems() Execution

### STEP 1: Load Events
```typescript
const dbEvents = await prisma.event.findMany(...)
// Returns: [Albert Einstein's event with civilDate=1879-03-14, eventYear=1879]
```

### STEP 2: Gregorian Processing Loop
```typescript
for (const source of dbEvents) {
  if (!source.civilDate || !source.eventYear) continue;
  // source.civilDate = "1879-03-14"
  // source.eventYear = 1879
  // → ENTERS LOOP
  
  const gregorianDateStr = dateKey(new Date(source.civilDate));
  // new Date("1879-03-14") = Date object for March 14, 1879
  // dateKey(date) = "1879-03-14"
  
  const [origYear, month, day] = gregorianDateStr.split("-").map(Number);
  // [1879, 3, 14]
  
  for (let year = firstYear; year <= lastYear; year++) {
    // firstYear = 5784 (Hebrew year for 2024)
    // lastYear = 5784
    // For Hebrew year 5784 (which is 2024):
    
    const thisYearGregorianStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    // Wait, year here is Hebrew year!
    // So thisYearGregorianStr = "5784-03-14" ← THIS IS WRONG!
    
    if (thisYearGregorianStr >= startKey && thisYearGregorianStr <= endKey) {
      // "5784-03-14" >= "2024-03-01"? NO
      // → ITEM NOT ADDED
    }
  }
}
```

## 🚨 FOUND A BUG!

The first loop uses `firstYear` and `lastYear` which are Hebrew years (from `new HDate(start).getFullYear()`).

But it's trying to create Gregorian dates using those Hebrew years! This is wrong!

For example:
- Hebrew year 5784 would create "5784-03-14"
- But we want Gregorian year 2024: "2024-03-14"

## Expected Fix Required

The Gregorian loop should use Gregorian years, not Hebrew years!

Should be something like:
```typescript
const gregorianStartYear = start.getFullYear();
const gregorianEndYear = end.getFullYear();

for (let year = gregorianStartYear; year <= gregorianEndYear; year++) {
  const thisYearGregorianStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  // Now: "2024-03-14" ✓
}
```

## Impact

**This bug prevents Gregorian calendar items from being created!**
- The Gregorian occurrence never gets added to the calendar
- Only Hebrew dates appear
- User sees only one birthday (the Hebrew one)
- User sees flag on all events (because only Hebrew events are shown)

This explains the user's report:
> "every name has only one birthday, and all have the flag"

Because:
- Hebrew dates ARE being created (hasHebrewDate=true) → shows flag
- Gregorian dates are NOT being created (bug prevents it)
- Result: only Hebrew dates visible, all with flag


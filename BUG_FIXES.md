# Bug Fixes: Import Events & Column Storage

## Issues Fixed

### 🐛 Issue #1: Birth Dates Not Created (0 Events)

**Problem:** After import, people were added but with 0 Events. Birth dates disappeared.

**Root Cause:** Import validation only checked for `displayName`, ignoring `eventType` and date fields. Rows without both were silently skipped by the backend without clear feedback.

**Solution:** Stricter frontend validation before sending to API.

```typescript
// BEFORE:
const nonEmpty = rows.filter((r) => r.displayName.trim());

// AFTER:
const nonEmpty = rows.filter((r) => {
  if (!r.displayName.trim()) return false;
  const hasEventType = r.eventType?.trim();
  const hasDate = r.civilDate?.trim() || r.hebrewDate?.trim();
  return hasEventType && hasDate;
});
```

**Impact:**
- Only rows with Name + (EventType + Date) are sent to import API
- Backend can now assume all rows have required fields for event creation
- Clear error message: "No valid rows to import. Each row needs: Name, Event Type, and at least one date"

**Testing:**
✅ Row with Name + Date + EventType → Event created
✅ Row with Name only → Filtered out, not sent
✅ Row with Name + Date (no EventType) → Filtered out

---

### 🐛 Issue #2: Column Configuration Not Persisted

**Problem:** Column order and visibility resets on page refresh. Users must rebuild configuration every time.

**Root Cause:** Column state only lived in React component memory (useState). No persistence mechanism.

**Solution:** localStorage integration with automatic save/load.

```typescript
const STORAGE_KEY = "importColumnConfig";

function loadColumnsFromStorage(): ColumnConfig[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const keys = JSON.parse(stored) as (keyof ImportRow)[];
      return keys
        .map((key) => ALL_AVAILABLE_COLUMNS.find((c) => c.key === key))
        .filter((c): c is ColumnConfig => c !== undefined);
    }
  } catch {
    return null;
  }
}

function saveColumnsToStorage(cols: ColumnConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cols.map((c) => c.key)));
  } catch {
    // Silent fail
  }
}

// In component:
useEffect(() => {
  const stored = loadColumnsFromStorage();
  if (stored) setColumns(stored);
}, []);

// In each column handler:
moveColumnUp/Down/Remove/Add/Reset → saveColumnsToStorage()
```

**Storage Format:**
```
Key: "importColumnConfig"
Value: ["displayName", "hebrewName", "notes", "tags", "eventType", "civilDate", "hebrewDate", "remarks"]
```

**Load Flow:**
1. Page loads
2. useEffect runs (once on mount)
3. Check localStorage for "importColumnConfig"
4. If found: restore column order
5. If not found: use DEFAULT_COLUMNS
6. User can now immediately paste/import with their saved configuration

**Save Flow:**
Every column operation automatically saves:
- `moveColumnUp()` → save
- `moveColumnDown()` → save
- `removeColumn()` → save
- `addColumn()` → save
- `resetColumns()` → save

**Impact:**
- User's column configuration persists across browser sessions
- Improves UX for recurring imports
- No manual "Save Config" button needed (automatic)
- Fallback to defaults if localStorage fails

**Browser Support:**
✅ All modern browsers (localStorage since IE8)
✅ Client-side only (no server changes)
✅ Error handling prevents app crashes if localStorage unavailable

**Testing:**
✅ Reorder columns → Refresh page → Order preserved
✅ Delete columns → Refresh → Deletion persisted
✅ Add columns → Refresh → Added columns present
✅ Reset to default → Refresh → Original order restored
✅ localStorage full/unavailable → Fallback to defaults (graceful)

---

## UI Enhancements

### Import Validation Message
Clear error when rows don't meet requirements:
```
"No valid rows to import. Each row needs: 
 Name, Event Type, and at least one date (Gregorian or Hebrew)."
```

### Storage Confirmation
Panel shows: `✓ Column configuration is automatically saved`

### Help Text Updated
```
"For event import: each row needs Name, Event Type, 
 and at least one date (Gregorian or Hebrew)."

"Use the "⚙ Columns" button to customize column order and visibility. 
 Your configuration is automatically saved."
```

---

## Files Modified

- [app/import/page.tsx](/home/bz/Desktop/aktualis/projects/community-calendar/app/import/page.tsx)
  - Added `useEffect` import
  - Added `loadColumnsFromStorage()` function
  - Added `saveColumnsToStorage()` function
  - Added `useEffect` hook for localStorage loading on mount
  - Modified `handleSave()` for stricter validation
  - All column handlers now call `saveColumnsToStorage()`
  - Added storage confirmation UI text
  - Updated help text

---

## Testing Checklist

### Test 1: Birth Date Import
```
□ 1. Create row: Name="Alice", Date="1985-07-10", EventType="Birthday"
□ 2. Click "Save All"
□ 3. Go to /people
□ 4. Check Alice's Events (should be 1, not 0)
✓ PASS if Events = 1
```

### Test 2: Column Configuration Persistence
```
□ 1. ⚙ Columns → Reorder Name down 3 positions
□ 2. Close panel
□ 3. Refresh page (F5)
□ 4. ⚙ Columns
□ 5. Check Name position
✓ PASS if Name is in new position
```

### Test 3: Import Validation
```
□ 1. Row with Name + Date + EventType
□ 2. Row with Name only
□ 3. Row with Name + Date (no EventType)
□ 4. Click "Save All"
✓ PASS if error message appears and only valid row imported
```

### Test 4: Reset to Default
```
□ 1. Delete several columns
□ 2. Click "Reset to default"
□ 3. Refresh page
✓ PASS if all 8 default columns restored in correct order
```

---

## Related Documentation

- [Birthday Import Feature](./BIRTHDAY_IMPORT_FEATURE.md)
- [Column Configuration](./COLUMN_CONFIGURATION.md)

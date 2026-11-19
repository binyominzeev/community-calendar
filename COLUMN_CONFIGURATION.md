# Column Configuration Feature

## Overview

The Import page now includes a **dynamic column configuration panel** that allows users to customize which columns are visible, in what order, and add/remove them as needed.

## Features

### 🔧 Column Management Panel

Access via the "⚙ Columns" button in the top-right corner of the Import page.

#### Active Columns Section
Shows currently visible columns with per-column controls:

| Control | Action |
|---------|--------|
| **▲** | Move column up (disabled for first column) |
| **▼** | Move column down (disabled for last column) |
| **✕** | Remove/delete column from view |

#### Add Columns Section
Displays all available columns not currently shown. Click to add:
- Name *
- Hebrew Name
- Notes
- Tags (comma sep.)
- Event Type
- Gregorian Date (YYYY-MM-DD)
- Hebrew Date
- Remarks

#### Reset Button
Resets columns to the default configuration.

### 📋 Column State Persistence

The column configuration is stored in component state (React). Note:
- Configuration is **not persisted** between page reloads
- Configuration **persists** while navigating away and coming back (if same session)
- To preserve custom column layouts across sessions, consider localStorage (future enhancement)

## User Workflow

### Scenario 1: Reordering Columns to Match Excel Table

**Original Excel format:**
```
Hebrew Name | Gregorian Date | Name | Event Type
משה כהן     | 1980-05-15     | Moshe | Birthday
```

**Steps:**
1. Click "⚙ Columns"
2. Move "Hebrew Name" to top (▲ multiple times if needed)
3. Move "Gregorian Date" to position 2
4. Move "Name" to position 3
5. Remove "Notes", "Tags", "Remarks" if not needed
6. Close panel
7. Copy and paste data from Excel

**Result:** Data maps correctly in import order.

### Scenario 2: Removing Unused Columns

**If your data only has Name + Hebrew Date:**

1. Click "⚙ Columns"
2. Remove: "Hebrew Name", "Notes", "Tags", "Event Type", "Gregorian Date", "Remarks"
3. Keep only: "Name *" and "Hebrew Date"
4. Close panel
5. Paste data

**Result:** Clean table with only relevant columns.

### Scenario 3: Adding Back Removed Columns

**If you removed "Event Type" but now need it:**

1. Click "⚙ Columns"
2. In "Add columns" section, click "+ Event Type"
3. Use ▲/▼ to position it correctly
4. Close panel

**Result:** Column reappears in selected position.

## Technical Details

### Column Data Structure

```typescript
interface ColumnConfig {
  key: keyof ImportRow;      // Field name in data
  label: string;             // Display label
  width: number;             // CSS width in pixels
  placeholder: string;       // Input placeholder
}
```

### State Management

```typescript
const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
```

Changes are applied immediately to the table display.

### Paste Mapping

When pasting data, columns are mapped by their current position, not by name:

```
Pasted columns (in order): [Col1, Col2, Col3]
Active columns (in order): [Name*, Hebrew Date, Event Type]
Mapping: Col1 → Name*, Col2 → Hebrew Date, Col3 → Event Type
```

This allows flexibility in matching any Excel format without header row parsing.

## Available All Columns

The system includes 8 configurable fields:

1. **Name*** (required for each row)
2. **Hebrew Name** (optional)
3. **Notes** (optional)
4. **Tags** (comma-separated)
5. **Event Type** (determines person's events)
6. **Gregorian Date** (YYYY-MM-DD format)
7. **Hebrew Date** (e.g., "7 Tishrei")
8. **Remarks** (event-specific notes)

Fields marked with * are required for successful import.

## Future Enhancements

### Possible improvements:
- [ ] Save column layout to localStorage (persist across sessions)
- [ ] Export/import column configurations as profiles
- [ ] Drag-and-drop column reordering (instead of ▲/▼)
- [ ] Column width customization
- [ ] Multi-select columns for bulk delete

## Related Code

- **Frontend:** `app/import/page.tsx`
  - `moveColumnUp()` - Move column position up
  - `moveColumnDown()` - Move column position down
  - `removeColumn()` - Remove column from view
  - `addColumn()` - Add column to view
  - `resetColumns()` - Restore default layout
  - `handlePaste()` - Maps pasted data to current columns

- **Constants:**
  - `ALL_AVAILABLE_COLUMNS` - All possible columns
  - `DEFAULT_COLUMNS` - Default configuration
  - `ColumnConfig` - TypeScript interface

## Notes

- Minimum 1 column required (can't remove all columns)
- At least "Name" column should remain visible for valid imports
- Configuration changes apply immediately to the table and paste mapping
- No data is lost when reconfiguring columns (only display changes)

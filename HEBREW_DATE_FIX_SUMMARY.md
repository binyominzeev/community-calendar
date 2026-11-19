# Hebrew Date Parsing Fix - Summary

## Problem
When importing Hebrew birth dates with Hungarian accented month names (e.g., "Ádár (I) 22", "Chesván 13", "Áv 28"), the import was failing with "invalid Hebrew date" errors. This caused people to be created but their birthdays to be lost, resulting in "partial" import status for 30 out of 35 rows.

**Example error messages:**
```
Row 1 (partial): Person created but invalid Hebrew date: Ádár (I) 22
Row 10 (partial): Person created but invalid Hebrew date: Chesván 13
Row 35 (partial): Person created but invalid Hebrew date: Áv 28
```

## Root Cause
The `parseHebrewDateString()` function in `lib/hebcal.ts` had an incomplete month name mapping. It was missing:
1. All Hungarian accented month names (e.g., "Ádár", "Chesván", "Áv", etc.)
2. Support for the parentheses format for Adar (I) and (II) with uppercase letters
3. Had duplicate entries in the monthMap which caused TypeScript compilation errors when trying to add missing variants

## Solution
Updated `lib/hebcal.ts` to include a comprehensive month name mapping that supports:

### Hebrew Date Format Variants Now Supported
✅ English variants:
- "7 Tishrei", "Tishrei 7"
- "24 Iyyar", "Iyyar 24"
- "24 Iyar", "Iyar 24"
- "7 Tishri", "Tishri 7"
- "15 Adar", "Adar 15"
- "15 Adar II", "Adar II 15"

✅ Hungarian variants with accents:
- "7 Niszán", "Niszán 14" (Nisan)
- "27 Ijár", "Ijár 27" (Iyyar)
- "15 Sziván", "Sziván 15" (Sivan)
- "2 Támuz", "Támuz 2" (Tamuz)
- "28 Áv", "Áv 28" (Av)
- "13 Chesván", "Chesván 13" (Cheshvan)
- "10 Kiszlév", "Kiszlév 10" (Kislev)
- "11 Tévét", "Tévét 11" (Tevet)
- "24 Svát", "Svát 24" (Shevat)
- "22 Ádár (I)", "Ádár (I) 22" (Adar I)
- "14 Ádár (II)", "Ádár (II) 14" (Adar II)
- "17 Ádár", "Ádár 17" (Adar, default I in leap years)

Both day-first and month-first formats are supported for all variants.

## Files Changed
1. **lib/hebcal.ts** - Updated `parseHebrewDateString()` function:
   - Consolidated month name variants to avoid duplicate keys
   - Added all 15+ Hungarian accented month names
   - Added support for Ádár (I) and Ádár (II) formats with parentheses
   - Maintained backward compatibility with existing English formats

2. **BIRTHDAY_IMPORT_FEATURE.md** - Updated documentation:
   - Added comprehensive list of supported Hebrew date formats
   - Included all Hungarian accented variants
   - Documented Adar (I)/(II) handling

## Verification
✅ All test cases pass:
- "Ádár (I) 22" → day: 22, month: 12 ✓
- "Ádár (II) 14" → day: 14, month: 13 ✓
- "Ádár 17" → day: 17, month: 12 ✓
- "Chesván 13" → day: 13, month: 8 ✓
- "Ijár 27" → day: 27, month: 2 ✓
- "Svát 24" → day: 24, month: 11 ✓
- "Sziván 15" → day: 15, month: 3 ✓
- "Támuz 2" → day: 2, month: 4 ✓
- "Tévét 11" → day: 11, month: 10 ✓
- "Kiszlév 10" → day: 10, month: 9 ✓
- "Áv 28" → day: 28, month: 5 ✓

✅ TypeScript build succeeds with no errors
✅ No breaking changes - all existing imports continue to work
✅ Full backward compatibility maintained

## Impact
Users can now successfully import Hebrew birth dates using Hungarian month names with accents, which is the standard Hungarian spelling convention. The previously failing 30 "partial" imports should now import successfully with both person and event data.

## Testing in Import UI
1. Navigate to Import page
2. Configure columns with Hebrew Date column
3. Paste Hebrew dates in Hungarian (with accents)
4. Click "Save All"
5. All dates should now be recognized (no "invalid Hebrew date" errors)

## Commit
```
630c671 Fix Hebrew date parsing to support all Hungarian accented month names
```

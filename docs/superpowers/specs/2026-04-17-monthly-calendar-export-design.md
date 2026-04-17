# Monthly Calendar Export Design

**Date:** 2026-04-17
**Topic:** Calendar-style monthly Excel export

---

## Goal

Export a full month's attendance as a calendar grid: one row per employee, one column per day of the month, with short status codes in each cell. Matches the format used in the company's existing Excel-based records.

---

## Status Code Mapping

| App status | Excel code |
|---|---|
| PRESENT (has card entry, no action) | `1` |
| LEAVE | `A` |
| SICK | `ΑΓ` |
| DAYOFF | `R` |
| REMOTE | `ΤΗΛ` |
| ABSENT | `0` |
| REJECTED | `ΑΑ` |
| UNKNOWN / no data | *(blank)* |

National holidays (ΑΡΓ) are set by managers as actions — treated as any other action type (requires adding `HOLIDAY` to `ActionType` and the UI). Out of scope for this feature; managers can use existing action dialog.

---

## Architecture

### 1. New API endpoint: `GET /api/export/monthly?month=YYYY-MM`

Runs three queries in parallel:

**Query 1 — Employees** (same logic as `/api/employees`, date = first day of month):
```sql
SELECT e.[CODE], e.[SURNAME], e.[NAME], t.[DESCR] AS department
FROM [PYLON].[dbo].[vSEM_EMPS] e
LEFT JOIN [PYLON].[dbo].[TMIMATA_apasx] t ON e.[TMHMA] = t.[TMHMA]
WHERE e.[ISACTIVE] = 1
  AND e.[HRDATE] <= @monthStart
  AND (e.[FRDATE] IS NULL OR e.[FRDATE] >= @monthStart)
  ${deptFilter}
ORDER BY e.[SURNAME], e.[NAME]
```

**Query 2 — Attendance for the month** (range query on `io_10days` via `CARD_CODES` → `vSEM_EMPS`):
```sql
SELECT e.[CODE] AS code, CAST(i.[Expr3] AS DATE) AS entryDate,
  MIN(CASE WHEN i.[Expr4] = 1 THEN CAST(i.[Expr3] AS TIME) END) AS timeIn,
  MAX(CASE WHEN i.[Expr4] = 2 THEN CAST(i.[Expr3] AS TIME) END) AS timeOut
FROM [PYLON].[dbo].[io_10days] i
INNER JOIN [PYLON].[dbo].[CARD_CODES] cc ON cc.[CARD_CODE] = i.[Expr2]
  AND cc.[FROM_DATE] <= @monthEnd AND (cc.[TO_DATE] IS NULL OR cc.[TO_DATE] >= @monthStart)
INNER JOIN [PYLON].[dbo].[vSEM_EMPS] e ON e.[ID_EMP] = cc.[ID_EMP]
WHERE i.[Expr3] >= @monthStart AND i.[Expr3] < @monthEnd
  AND i.[Expr4] IN (1, 2)
GROUP BY e.[CODE], CAST(i.[Expr3] AS DATE)
```

**Query 3 — Actions for the month** (Prisma, local SQLite):
```ts
prisma.presenceAction.findMany({
  where: { date: { gte: monthStart, lte: monthEnd } }
})
```

**Response shape:**
```ts
{
  employees: { code, surname, name, department }[],
  attendance: Record<string, string[]>,  // "YYYY-MM-DD" → [employee codes]
  actions: Record<string, { employeeCode: string, action: ActionType }[]>  // "YYYY-MM-DD" → actions
}
```

Applies `isExcludedEmployeeCode` filter. Respects USER role dept filter.

### 2. Client-side Excel generation (in `page.tsx`)

New `handleMonthlyExport()` function:

1. Fetches `GET /api/export/monthly?month=YYYY-MM` (current month)
2. Builds the calendar grid:
   - Merges attendance + actions per employee per day (same priority: action > card entry > blank)
   - Maps status to calendar code
   - Future days (> today) → blank
3. Builds the worksheet:
   - **Header row:** `Κωδικός | Επώνυμο | Όνομα | Τμήμα | 01/04/2026 | 02/04/2026 | ... | 30/04/2026`
   - **Data rows:** one per employee, status code per day column
4. Exports as `Παρουσιολόγιο_Απρίλιος_2026.xlsx` (month name in Greek)

### 3. UI

New button "Εξαγωγή Μηνός" added next to the existing "Εξαγωγή σε Excel" button in the filters row of `page.tsx`. No additional date picker — always exports the current calendar month.

---

## Greek Month Names

```ts
const GREEK_MONTHS = [
  'Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος',
  'Μάιος','Ιούνιος','Ιούλιος','Αύγουστος',
  'Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'
];
```

Filename: `Παρουσιολόγιο_${GREEK_MONTHS[month]}_${year}.xlsx`

---

## Error Handling

- Invalid `month` param → 400
- DB error → 500 (same pattern as other routes)
- Client fetch failure → toast error (same pattern as existing export)

---

## What Does Not Change

- Existing single-date export — untouched
- Action dialog and action types — untouched
- All other routes — untouched

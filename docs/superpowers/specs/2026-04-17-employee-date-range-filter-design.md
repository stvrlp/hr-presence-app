# Employee Date-Range Filter Design

**Date:** 2026-04-17
**Topic:** Exclude not-yet-started and already-departed employees from absence list

---

## Problem

The `/api/employees` route fetches all employees where `ISACTIVE = 1`. This includes:

- Employees opened in the ERP with a future `HRDATE` (not yet started)
- Employees with a past `FRDATE` (already departed)

Both groups appear in the Absences tab as `UNKNOWN` status, which is incorrect.

---

## Business Rules

| Condition | Behaviour |
|---|---|
| `selectedDate < HRDATE` | Employee hasn't started yet — exclude entirely |
| `selectedDate >= HRDATE` AND `FRDATE IS NULL` | Active, no end date — include |
| `selectedDate >= HRDATE` AND `selectedDate <= FRDATE` | Still employed (including last day) — include |
| `selectedDate > FRDATE` | Already left — exclude entirely |

**Last visible day** is `FRDATE` itself (the employee's last working day).

---

## Architecture

### 1. `/api/employees` — add `date` query param

- Accept `?date=YYYY-MM-DD` (same validation as `/api/attendance`)
- Fall back to today's date if omitted, so no other callers break

### 2. SQL — replace `ISACTIVE = 1` with date-range filter

Replace:
```sql
WHERE e.[ISACTIVE] = 1
```
With:
```sql
WHERE e.[HRDATE] <= @targetDate
  AND (e.[FRDATE] IS NULL OR e.[FRDATE] >= @targetDate)
```

Also add `e.[FRDATE] AS frDate` to the SELECT for completeness.

Pass `@targetDate` as `sql.Date`.

### 3. `page.tsx` — pass date when fetching employees

```ts
fetch(`/api/employees?date=${date}`)
```

Single line change inside `fetchData`.

---

## What Does Not Change

- `isExcludedEmployeeCode` filter — remains
- Attendance, actions, merge logic — untouched
- Department filtering — untouched
- Absences tab logic — untouched (employees in range without a card entry still appear correctly)
- `PresenceRow` type — untouched (`hrDate`/`frDate` not needed on the client)

---

## Error Handling

- Invalid or missing `date` param → return 400 with same error message pattern as `/api/attendance`
- DB errors → existing 500 handler covers this

---

## Testing

- View a past date where a future-hire employee's `HRDATE` is after that date → employee absent from list
- View a date equal to an employee's `HRDATE` → employee present in list
- View a date equal to an employee's `FRDATE` → employee present in list (last day)
- View a date after an employee's `FRDATE` → employee absent from list
- View today with no date param via direct API call → falls back to today, no error

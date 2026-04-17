# Employee Date-Range Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exclude employees who haven't started yet (HRDATE > selectedDate) or have already left (FRDATE < selectedDate) from the employee list, so they never appear as false absentees.

**Architecture:** Add a `?date=YYYY-MM-DD` param to `/api/employees`, replace the `ISACTIVE = 1` SQL filter with a date-range condition (`HRDATE <= @targetDate AND (FRDATE IS NULL OR FRDATE >= @targetDate)`), and update the single `fetch` call in `page.tsx` to pass the date.

**Tech Stack:** Next.js 14 App Router, TypeScript, mssql (SQL Server), PYLON ERP database

---

## File Map

| File | Change |
|---|---|
| `app/api/employees/route.ts` | Accept `?date` param; replace `ISACTIVE` with date-range SQL |
| `app/page.tsx` | Pass `date` arg to the employees fetch call |

---

### Task 1: Update `/api/employees` to accept a `date` param and filter by date range

**Files:**
- Modify: `app/api/employees/route.ts`

- [ ] **Step 1: Add date param parsing and validation**

Open `app/api/employees/route.ts`. After the `getSession` check (line 13), add:

```ts
const { searchParams } = new URL(req.url);
const dateParam = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
  return NextResponse.json(
    { error: 'Απαιτείται παράμετρος date σε μορφή YYYY-MM-DD' },
    { status: 400 }
  );
}
```

- [ ] **Step 2: Bind the date parameter to the SQL request**

After `const request = pool.request();` (line 17), add:

```ts
request.input('targetDate', sql.Date, new Date(dateParam));
```

- [ ] **Step 3: Replace the `ISACTIVE` filter with the date-range condition**

In the SQL query, change:

```sql
WHERE e.[ISACTIVE] = 1 ${deptFilter}
```

to:

```sql
WHERE e.[HRDATE] <= @targetDate
  AND (e.[FRDATE] IS NULL OR e.[FRDATE] >= @targetDate)
  ${deptFilter}
```

- [ ] **Step 4: Add `FRDATE` to the SELECT list**

In the SELECT, after `e.[HRDATE] AS hrDate`, add:

```sql
e.[FRDATE]    AS frDate,
```

The full SELECT block should now look like:

```sql
SELECT
  e.[ID_EMP]    AS id_emp,
  e.[SURNAME]   AS surname,
  e.[NAME]      AS name,
  e.[CODE]      AS code,
  e.[ISACTIVE]  AS isActive,
  t.[DESCR]     AS department,
  e.[COD_YPOKAT] AS subCategory,
  e.[HRDATE]    AS hrDate,
  e.[FRDATE]    AS frDate
FROM [PYLON].[dbo].[vSEM_EMPS] e
LEFT JOIN [PYLON].[dbo].[TMIMATA_apasx] t ON e.[TMHMA] = t.[TMHMA]
WHERE e.[HRDATE] <= @targetDate
  AND (e.[FRDATE] IS NULL OR e.[FRDATE] >= @targetDate)
  ${deptFilter}
ORDER BY e.[SURNAME], e.[NAME]
```

- [ ] **Step 5: Verify the file looks correct**

The complete updated `app/api/employees/route.ts` should be:

```ts
/**
 * GET /api/employees?date=YYYY-MM-DD
 * Returns employees active on the given date from ERP.
 * ADMIN sees all; USER sees their departments only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isExcludedEmployeeCode } from '@/lib/employees';
import sql from 'mssql';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: 'Απαιτείται παράμετρος date σε μορφή YYYY-MM-DD' },
      { status: 400 }
    );
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('targetDate', sql.Date, new Date(dateParam));

    let deptFilter = '';
    if (session.role === 'USER' && session.departments.length > 0) {
      const placeholders = session.departments
        .map((_, i) => `@dept${i}`)
        .join(', ');
      session.departments.forEach((code, i) => {
        request.input(`dept${i}`, sql.NVarChar, code);
      });
      deptFilter = `AND e.[TMHMA] IN (${placeholders})`;
    } else if (session.role === 'USER' && session.departments.length === 0) {
      return NextResponse.json({ employees: [] });
    }

    const result = await request.query(`
      SELECT
        e.[ID_EMP]     AS id_emp,
        e.[SURNAME]    AS surname,
        e.[NAME]       AS name,
        e.[CODE]       AS code,
        e.[ISACTIVE]   AS isActive,
        t.[DESCR]      AS department,
        e.[COD_YPOKAT] AS subCategory,
        e.[HRDATE]     AS hrDate,
        e.[FRDATE]     AS frDate
      FROM [PYLON].[dbo].[vSEM_EMPS] e
      LEFT JOIN [PYLON].[dbo].[TMIMATA_apasx] t ON e.[TMHMA] = t.[TMHMA]
      WHERE e.[HRDATE] <= @targetDate
        AND (e.[FRDATE] IS NULL OR e.[FRDATE] >= @targetDate)
        ${deptFilter}
      ORDER BY e.[SURNAME], e.[NAME]
    `);

    return NextResponse.json({
      employees: result.recordset.filter((employee: { code: string }) => !isExcludedEmployeeCode(employee.code)),
    });
  } catch (err) {
    console.error('[GET /api/employees]', err);
    return NextResponse.json(
      { error: 'Σφάλμα σύνδεσης με τη βάση δεδομένων ERP' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/employees/route.ts
git commit -m "feat: filter employees by date range using HRDATE and FRDATE"
```

---

### Task 2: Pass `date` to the employees fetch in `page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update the fetch call**

In `app/page.tsx`, inside the `fetchData` function (around line 146), change:

```ts
fetch('/api/employees'),
```

to:

```ts
fetch(`/api/employees?date=${date}`),
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: pass selected date to employees API"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test — future-hire employee excluded**

Find or confirm an employee in the ERP whose `HRDATE` is in the future (after today). Navigate to the Absences tab for today's date. Verify that employee does **not** appear.

- [ ] **Step 3: Test — departed employee excluded**

Find or confirm an employee whose `FRDATE` is before today. Navigate to the Absences tab. Verify they do **not** appear.

- [ ] **Step 4: Test — last working day visible**

Find an employee whose `FRDATE` is today. Navigate to today's date. Verify they **do** appear in the Absences tab (if no card entry) or Presences tab (if they clocked in).

- [ ] **Step 5: Test — past date browsing**

Navigate to a past date (e.g., last week). Verify the employee list reflects who was employed on that date, not today's active list.

- [ ] **Step 6: Test — no regression on existing employees**

Verify that employees with no `FRDATE` (still active, no end date) continue to appear normally across all dates.

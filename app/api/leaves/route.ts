/**
 * GET /api/leaves?date=YYYY-MM-DD
 * Returns ERP leave requests active on the given date.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { resolveLeaveType } from '@/lib/leaveTypes';
import { isExcludedEmployeeCode } from '@/lib/employees';
import type { ActionType } from '@/lib/types';
import sql from 'mssql';

export interface LeaveEntry {
  employeeCode: string;
  description: string;
  excelCode: string;
  actionType: ActionType;
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Απαιτείται παράμετρος date σε μορφή YYYY-MM-DD' }, { status: 400 });
  }

  // Fix 3: USER with no departments → return empty immediately
  if (session.role === 'USER' && session.departments.length === 0) {
    return NextResponse.json({ leaves: [] });
  }

  try {
    const pool = await getPool();
    const request = pool.request();

    // Fix 2: timezone-safe date parsing
    const [dy, dm, dd] = date.split('-').map(Number);
    request.input('date', sql.Date, new Date(dy, dm - 1, dd));

    // Fix 3: build department filter for USER role
    let deptFilter = '';
    if (session.role === 'USER' && session.departments.length > 0) {
      const placeholders = session.departments
        .map((_, i) => `@dept${i}`)
        .join(', ');
      session.departments.forEach((code, i) => {
        request.input(`dept${i}`, sql.NVarChar, code);
      });
      deptFilter = `AND e.[TMHMA] IN (${placeholders})`;
    }

    const result = await request.query(`
      SELECT
        e.[CODE]     AS employeeCode,
        t.[DESCR]    AS description
      FROM [PYLON].[dbo].[ADEIES_DT] a
      LEFT JOIN [PYLON].[dbo].[vSEM_EMPS] e ON a.[ID_EMP] = e.[ID_EMP]
      LEFT JOIN [PYLON].[dbo].[ADEIES_TYPE] t ON a.[ID_TYPE] = t.[ID]
      WHERE a.[START_DATE] <= @date
        AND a.[END_DATE] >= @date
        AND e.[CODE] IS NOT NULL
        ${deptFilter}
    `);

    const leaves: LeaveEntry[] = result.recordset
      .filter((row: { employeeCode: string }) => !isExcludedEmployeeCode(row.employeeCode))
      .map((row: { employeeCode: string; description: string }) => {
        const info = resolveLeaveType(row.description);
        return {
          employeeCode: row.employeeCode,
          description: row.description,
          excelCode: info.excelCode,
          actionType: info.actionType,
        };
      });

    return NextResponse.json({ leaves });
  } catch (err) {
    console.error('[GET /api/leaves]', err);
    return NextResponse.json({ error: 'Σφάλμα σύνδεσης με τη βάση δεδομένων ERP' }, { status: 500 });
  }
}

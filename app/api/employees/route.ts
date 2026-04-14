/**
 * GET /api/employees
 * Returns active employees from ERP. ADMIN sees all; USER sees their departments only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isExcludedEmployeeCode } from '@/lib/employees';
import sql from 'mssql';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 401 });

  try {
    const pool = await getPool();
    const request = pool.request();

    let deptFilter = '';
    if (session.role === 'USER' && session.departments.length > 0) {
      // Parameterised IN list
      const placeholders = session.departments
        .map((_, i) => `@dept${i}`)
        .join(', ');
      session.departments.forEach((code, i) => {
        request.input(`dept${i}`, sql.NVarChar, code);
      });
      deptFilter = `AND e.[TMHMA] IN (${placeholders})`;
    } else if (session.role === 'USER' && session.departments.length === 0) {
      // USER with no departments assigned — return empty
      return NextResponse.json({ employees: [] });
    }

    const result = await request.query(`
      SELECT
        e.[ID_EMP]    AS id_emp,
        e.[SURNAME]   AS surname,
        e.[NAME]      AS name,
        e.[CODE]      AS code,
        e.[ISACTIVE]  AS isActive,
        t.[DESCR]     AS department,
        e.[COD_YPOKAT] AS subCategory,
        e.[HRDATE]    AS hrDate
      FROM [PYLON].[dbo].[vSEM_EMPS] e
      LEFT JOIN [PYLON].[dbo].[TMIMATA_apasx] t ON e.[TMHMA] = t.[TMHMA]
      WHERE e.[ISACTIVE] = 1 ${deptFilter}
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

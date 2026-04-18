/**
 * GET  /api/actions?date=YYYY-MM-DD   — fetch all manager actions for a date
 * POST /api/actions                   — upsert a manager action
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getPool } from '@/lib/db';
import sql from 'mssql';
import { z } from 'zod';

const ActionSchema = z.object({
  employeeCode: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  action: z.enum(['PRESENT', 'REJECTED', 'LEAVE', 'SICK', 'ABSENT', 'REMOTE', 'DAYOFF']),
  note: z.string().optional().nullable(),
});

/** Returns the ERP employee codes visible to the given department list. */
async function getAllowedEmployeeCodes(departments: string[]): Promise<string[]> {
  const pool = await getPool();
  const request = pool.request();
  const placeholders = departments.map((_, i) => `@dept${i}`).join(', ');
  departments.forEach((code, i) => {
    request.input(`dept${i}`, sql.NVarChar, code);
  });
  const result = await request.query(
    `SELECT e.[CODE] AS employeeCode FROM [PYLON].[dbo].[vSEM_EMPS] e WHERE e.[TMHMA] IN (${placeholders}) AND e.[ISACTIVE] = 1`
  );
  return result.recordset.map((r: { employeeCode: string }) => r.employeeCode);
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Απαιτείται παράμετρος date σε μορφή YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // ADMIN sees all actions; USER sees only actions for their departments' employees.
  let actions: Awaited<ReturnType<typeof prisma.presenceAction.findMany>>;
  if (session.role === 'ADMIN') {
    actions = await prisma.presenceAction.findMany({
      where: { date },
      orderBy: { updatedAt: 'desc' },
    });
  } else if (session.departments.length === 0) {
    actions = [];
  } else {
    const allowedCodes = await getAllowedEmployeeCodes(session.departments);
    actions = await prisma.presenceAction.findMany({
      where: { date, employeeCode: { in: allowedCodes } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  return NextResponse.json({ actions });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο JSON' }, { status: 400 });
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  const { employeeCode, date, action, note } = parsed.data;
  // managerId is taken from the verified session — never a free-text field
  const managerId = session.userId;

  // ADMIN can record actions for any employee.
  // USER must own the employee's department.
  if (session.role !== 'ADMIN') {
    if (session.departments.length === 0) {
      return NextResponse.json({ error: 'Απαγορεύεται' }, { status: 403 });
    }
    const allowedCodes = await getAllowedEmployeeCodes(session.departments);
    if (!allowedCodes.includes(employeeCode)) {
      return NextResponse.json({ error: 'Απαγορεύεται' }, { status: 403 });
    }
  }

  const record = await prisma.presenceAction.upsert({
    where: { employeeCode_date: { employeeCode, date } },
    update: { action, note: note ?? null, managerId, updatedAt: new Date() },
    create: { employeeCode, date, action, note: note ?? null, managerId },
  });

  return NextResponse.json({ action: record });
}

/**
 * DELETE /api/actions/[id]  — remove a manager action (reverts to default status)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getPool } from '@/lib/db';
import sql from 'mssql';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.presenceAction.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Η εγγραφή δεν βρέθηκε' }, { status: 404 });
  }

  // ADMIN can delete any record; USER can only delete records for their own departments
  if (session.role !== 'ADMIN') {
    if (session.departments.length === 0) {
      return NextResponse.json({ error: 'Απαγορεύεται' }, { status: 403 });
    }
    const pool = await getPool();
    const request = pool.request();
    const placeholders = session.departments.map((_, i) => `@dept${i}`).join(', ');
    session.departments.forEach((code, i) => {
      request.input(`dept${i}`, sql.NVarChar, code);
    });
    request.input('empCode', sql.NVarChar, existing.employeeCode);
    const result = await request.query(
      `SELECT TOP 1 1 AS found FROM [PYLON].[dbo].[vSEM_EMPS] e WHERE e.[CODE] = @empCode AND e.[TMHMA] IN (${placeholders})`
    );
    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Απαγορεύεται' }, { status: 403 });
    }
  }

  try {
    await prisma.presenceAction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Η εγγραφή δεν βρέθηκε' }, { status: 404 });
  }
}

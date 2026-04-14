/**
 * GET /api/settings/departments — list all local departments with user counts (ADMIN only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isValidDepartmentCode } from '@/lib/departments';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 403 });
  }

  const departments = await prisma.department.findMany({
    orderBy: { descr: 'asc' },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({
    departments: departments.filter((dept) => isValidDepartmentCode(dept.code)),
  });
}

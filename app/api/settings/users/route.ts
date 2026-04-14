/**
 * GET  /api/settings/users  — list all users (ADMIN only)
 * POST /api/settings/users  — create a user (ADMIN only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isValidDepartmentCode } from '@/lib/departments';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

async function requireAdmin(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      createdAt: true,
      departments: {
        select: { deptCode: true, department: { select: { descr: true } } },
      },
    },
  });

  return NextResponse.json({ users });
}

const CreateSchema = z.object({
  username: z.string().min(2, 'Τουλάχιστον 2 χαρακτήρες'),
  fullName: z.string().min(2, 'Τουλάχιστον 2 χαρακτήρες'),
  password: z.string().min(6, 'Τουλάχιστον 6 χαρακτήρες'),
  role: z.enum(['ADMIN', 'USER']),
  departments: z.array(z.string().refine(isValidDepartmentCode, 'Μη έγκυρος κωδικός τμήματος')).optional(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Μη έγκυρο JSON' }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { username, fullName, password, role, departments = [] } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ error: 'Το όνομα χρήστη χρησιμοποιείται ήδη' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      fullName,
      passwordHash,
      role,
      departments: {
        create: departments.map((code) => ({ deptCode: code })),
      },
    },
    select: { id: true, username: true, fullName: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}

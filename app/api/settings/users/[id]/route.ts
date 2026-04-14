/**
 * PUT    /api/settings/users/[id]  — update user (ADMIN only)
 * DELETE /api/settings/users/[id]  — delete user (ADMIN only, can't delete self)
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

const UpdateSchema = z.object({
  username: z.string().min(2).optional(),
  fullName: z.string().min(2).optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'USER']).optional(),
  departments: z.array(z.string().refine(isValidDepartmentCode, 'Μη έγκυρος κωδικός τμήματος')).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Μη έγκυρο JSON' }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 });
  }

  const { username, fullName, password, role, departments } = parsed.data;

  // Check username uniqueness if changed
  if (username) {
    const conflict = await prisma.user.findFirst({
      where: { username, NOT: { id } },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Το όνομα χρήστη χρησιμοποιείται ήδη' }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  if (username) data.username = username;
  if (fullName) data.fullName = fullName;
  if (role) data.role = role;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...data,
      ...(departments !== undefined
        ? {
            departments: {
              deleteMany: {},
              create: departments.map((code) => ({ deptCode: code })),
            },
          }
        : {}),
    },
    select: { id: true, username: true, fullName: true, role: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 403 });

  const { id } = await params;

  if (id === session.userId) {
    return NextResponse.json(
      { error: 'Δεν μπορείτε να διαγράψετε τον λογαριασμό σας' },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

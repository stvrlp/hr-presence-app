import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 });
  }

  const { username, password } = body as { username?: string; password?: string };

  if (!username || !password) {
    return NextResponse.json({ error: 'Απαιτούνται όνομα χρήστη και κωδικός' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
    include: { departments: { select: { deptCode: true } } },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Λανθασμένα στοιχεία εισόδου' }, { status: 401 });
  }

  const token = await signToken({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role as 'ADMIN' | 'USER',
    departments: user.departments.map((d) => d.deptCode),
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 10, // 10 hours
  });
  return res;
}

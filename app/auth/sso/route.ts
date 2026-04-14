import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { signToken, COOKIE_NAME } from '@/lib/auth';

const ssoSecret = new TextEncoder().encode(process.env.SSO_SECRET!);

async function verifySSOToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, ssoSecret);
    const p = payload as Record<string, unknown>;
    if (p.type !== 'sso') return null;
    return p as {
      userId: string;
      email: string;
      name: string;
      role: string;
      appRole: string;
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const token = request.nextUrl.searchParams.get('token');

  if (!token) return NextResponse.redirect(loginUrl);

  const payload = await verifySSOToken(token);
  if (!payload) {
    loginUrl.searchParams.set('error', 'invalid_sso');
    return NextResponse.redirect(loginUrl);
  }

  // Try to find a matching local user by username = email or username = email prefix
  const emailPrefix = payload.email.split('@')[0];

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: payload.email },
        { username: emailPrefix },
      ],
    },
    include: { departments: { select: { deptCode: true } } },
  });

  const sessionUser = user
    ? {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role as 'ADMIN' | 'USER',
        departments: user.departments.map((d) => d.deptCode),
      }
    : {
        userId: payload.userId,
        username: payload.email,
        fullName: payload.name,
        role: (payload.appRole === 'ADMIN' ? 'ADMIN' : 'USER') as 'ADMIN' | 'USER',
        departments: [] as string[],
      };

  const jwt = await signToken(sessionUser);

  const res = NextResponse.redirect(new URL('/', request.url));
  res.cookies.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 10, // 10 hours
  });

  return res;
}

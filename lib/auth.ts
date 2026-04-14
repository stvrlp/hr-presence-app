/**
 * lib/auth.ts
 * JWT signing/verification using `jose` (works in Next.js middleware edge runtime).
 * Password hashing with bcryptjs.
 */
import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = 'ari_session';

export interface SessionUser {
  userId: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'USER';
  departments: string[]; // ERP TMHMA codes assigned to this user
}

export async function signToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

/** Read and verify the session cookie from a Next.js Request. */
export async function getSession(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };

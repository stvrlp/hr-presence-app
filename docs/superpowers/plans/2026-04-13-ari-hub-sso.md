# ari-hub SSO Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/auth/sso` to the presence app so ari-hub can sign users in automatically via a shared-secret JWT.

**Architecture:** The ari-hub signs a 2-minute JWT with `SSO_SECRET` and redirects to `/auth/sso?token=…`. The presence app verifies the token, looks up (or falls back to) the local Prisma user, signs its own `ari_session` cookie using the existing `signToken()`, and redirects to `/`. The middleware is updated to let the SSO callback through before the cookie exists.

**Tech Stack:** Next.js 14 App Router route handlers, `jose` (already installed), Prisma (MySQL), existing `lib/auth.ts`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/auth/sso/route.ts` | Verify SSO token, look up user, set cookie, redirect |
| Modify | `middleware.ts` | Add `/auth/sso` to PUBLIC_PATHS |
| Env | `.env` | Add `SSO_SECRET` |

---

### Task 1: Add `SSO_SECRET` to the environment

**Files:**
- Modify: `.env`

- [ ] **Step 1: Add the env var**

Open `.env` and add:

```env
# Shared secret with ari-hub — must match SSO_SECRET in the hub's .env exactly
SSO_SECRET=dev-secret-change-in-production
```

> In production, replace with the same strong random string used in the ari-hub's `.env`.

- [ ] **Step 2: Commit**

```bash
git add .env
git commit -m "chore: add SSO_SECRET env var for ari-hub SSO"
```

---

### Task 2: Update middleware to allow the SSO callback

**Files:**
- Modify: `middleware.ts:4`

- [ ] **Step 1: Add `/auth/sso` to PUBLIC_PATHS**

In `middleware.ts`, change line 4 from:

```ts
const PUBLIC_PATHS = ['/login', '/api/auth'];
```

to:

```ts
const PUBLIC_PATHS = ['/login', '/api/auth', '/auth/sso'];
```

The full file after the change:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth', '/auth/sso'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/ari-logo')
  ) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const session = await verifyToken(token);
  if (!session) {
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // ADMIN-only: /settings
  if (pathname.startsWith('/settings') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: allow /auth/sso through middleware for SSO callback"
```

---

### Task 3: Implement `/auth/sso` route handler

**Files:**
- Create: `app/auth/sso/route.ts`

- [ ] **Step 1: Create the file**

```ts
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
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 10, // 10 hours
  });

  return res;
}
```

- [ ] **Step 2: Verify the dev server starts without errors**

```bash
cd "/Users/stavroulap./Downloads/vs code projects/presence-app"
npm run dev
```

Expected: server starts on port 3003, no TypeScript errors in the console.

- [ ] **Step 3: Commit**

```bash
git add app/auth/sso/route.ts
git commit -m "feat: add /auth/sso SSO callback for ari-hub integration"
```

---

### Task 4: Verify end-to-end in the browser

- [ ] **Step 1: Ensure both apps are running**

- ari-hub on its configured port (default: 3000)
- presence-app on port 3003

- [ ] **Step 2: Check the presence app is registered in ari-hub Supabase**

In the ari-hub admin panel (or directly in Supabase dashboard), confirm `hub_apps` contains a row for the presence app with:
- `url` = `http://localhost:3003`
- `is_active` = `true`

If missing, insert it via the hub's admin UI or Supabase SQL editor:

```sql
INSERT INTO hub_apps (id, name, description, url, icon, color, is_active)
VALUES (
  gen_random_uuid(),
  'Σύστημα Παρακολούθησης Παρουσιών',
  'Παρακολούθηση Παρουσιών Εργαζομένων',
  'http://localhost:3003',
  '🕐',
  '#2E6B8A',
  true
);
```

- [ ] **Step 3: Grant your test user access to the presence app**

In `hub_app_permissions`, ensure the test user has a row for this app (or use hub admin UI).

- [ ] **Step 4: Click the app card in the hub dashboard**

Expected:
1. Browser goes to `http://localhost:3003/auth/sso?token=…`
2. Redirects to `http://localhost:3003/`
3. User is logged in (TopNav shows their name, no redirect back to `/login`)

- [ ] **Step 5: Test failure case — visit `/auth/sso` without a token**

Navigate directly to `http://localhost:3003/auth/sso`

Expected: redirect to `http://localhost:3003/login`

- [ ] **Step 6: Test failure case — visit with an invalid token**

Navigate to `http://localhost:3003/auth/sso?token=notavalidtoken`

Expected: redirect to `http://localhost:3003/login?error=invalid_sso`

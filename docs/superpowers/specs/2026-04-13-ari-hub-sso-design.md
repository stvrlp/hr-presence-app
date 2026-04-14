# Presence App — ari-hub SSO Integration

**Date:** 2026-04-13  
**Status:** Approved

---

## Goal

Connect the presence app to the ari-hub so that when a user with the right permissions clicks "Παρουσίες" in the hub, they are automatically signed into the presence app without a separate login.

---

## Flow

```
ari-hub /api/sso?appId=<presence-app-id>
  → verifies user has hub_app_permissions for the app
  → signs a 2-minute JWT (SSO_SECRET): { type:"sso", userId, email, name, role, appRole }
  → redirects to http://localhost:3003/auth/sso?token=<jwt>

presence-app /auth/sso?token=<jwt>
  → verifies JWT with SSO_SECRET
  → looks up User in Prisma: username = email OR username = emailPrefix
  → if found: use local role + departments
  → if not found: fallback — role=appRole, departments=[]
  → signs ari_session cookie via signToken()
  → redirect to /
```

---

## Changes

### presence-app

#### 1. `app/auth/sso/route.ts` (new)

- `GET` route handler
- Reads `?token=` from query string
- Verifies token with `SSO_SECRET` env var using `jwtVerify` from `jose`
- Confirms `payload.type === 'sso'`
- Queries Prisma for a User where `username = payload.email` OR `username = emailPrefix`
- Builds a `SessionUser`:
  - **Match found:** `{ userId: user.id, username: user.username, fullName: user.fullName, role: user.role, departments: user.departments.map(d => d.deptCode) }`
  - **No match:** `{ userId: payload.userId, username: payload.email, fullName: payload.name, role: payload.appRole as 'ADMIN'|'USER', departments: [] }`
- Calls `signToken(sessionUser)` and sets `ari_session` cookie (httpOnly, sameSite lax, 10h)
- On success: `NextResponse.redirect('/')`
- On token failure: `NextResponse.redirect('/login?error=invalid_sso')`

#### 2. `middleware.ts` (update)

Add `/auth/sso` to `PUBLIC_PATHS` so the middleware does not redirect the SSO callback before the cookie is written:

```ts
const PUBLIC_PATHS = ['/login', '/api/auth', '/auth/sso'];
```

### ari-hub

No code changes. The presence app entry must exist in the Supabase `hub_apps` table with:
- `url`: the correct base URL of the presence app (e.g. `http://localhost:3003`)
- `is_active`: true

User access is managed via `hub_app_permissions` by the hub admin.

### Environment

`SSO_SECRET` must be set in the presence app's `.env` to the same value used in the ari-hub.

---

## What is NOT changing

- The presence app's existing `/login` page and `/api/auth/*` routes — local login still works
- The ari-hub codebase — zero changes needed
- The presence app's middleware logic beyond adding `/auth/sso` to the public list

---

## Error cases

| Condition | Behaviour |
|---|---|
| Missing `?token` | Redirect to `/login` |
| Invalid / expired JWT | Redirect to `/login?error=invalid_sso` |
| No matching local user | Allow in with fallback session (empty departments) |

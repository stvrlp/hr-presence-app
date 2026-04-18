# Weekend Dayoff Default — Design Spec

**Date:** 2026-04-18
**Status:** Approved

## Overview

On Saturdays and Sundays, employees with no card entry and no manager action should default to `DAYOFF` (Ρεπό) status instead of `UNKNOWN`. Employees who do have a card entry or a manager action ("a hit") are unaffected — their status is computed as normal.

Sundays are fully hidden from the absences tab (being off on Sunday is expected). Saturdays show in the absences tab as Ρεπό.

## Rules

| Day | Card entry | Manager action | Status | Shown in absences tab |
|---|---|---|---|---|
| Weekday | No | No | `UNKNOWN` | Yes |
| Saturday | No | No | `DAYOFF` | Yes |
| Sunday | No | No | `DAYOFF` | No |
| Sat or Sun | Yes | — | `PRESENT` | No (presences tab) |
| Sat or Sun | Any | Yes | that action | Yes (if no card) |

## Changes to `app/page.tsx`

### 1. Compute day-of-week once before the merge loop

```ts
const dayOfWeek = new Date(selectedDate).getDay(); // 0 = Sunday, 6 = Saturday
```

### 2. Status computation block

Current:
```ts
if (act) {
  status = act.action;
} else if (card) {
  status = 'PRESENT';
} else {
  status = 'UNKNOWN';
}
```

New:
```ts
if (act) {
  status = act.action;
} else if (card) {
  status = 'PRESENT';
} else if (dayOfWeek === 0 || dayOfWeek === 6) {
  status = 'DAYOFF';
} else {
  status = 'UNKNOWN';
}
```

This block runs for both the primary merge (active employees) and the secondary merge (ex-employees with card entries). The `dayOfWeek` variable is in scope for both.

### 3. Absences tab filter

Current:
```ts
row.hasCardEntry === false
```

New:
```ts
row.hasCardEntry === false &&
  !(dayOfWeek === 0 && !row.actionId && !row.hasCardEntry)
```

Hides rows that are Sunday + no card entry + no manager action. Saturday rows with no hit remain visible.

## Scope

- **In scope:** Status computation and absences tab visibility in `app/page.tsx`.
- **Out of scope:** API routes, database, monthly export, presences tab filter, any manager-set DAYOFF rows (those have `actionId` set and are always shown normally).

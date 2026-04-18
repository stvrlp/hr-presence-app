# Branded Export Button — Design Spec

**Date:** 2026-04-18
**Status:** Approved

## Overview

Replace the two plain `variant="outline"` export buttons in the toolbar with a single branded split-button that consolidates both export actions into one UI element. The button uses the primary brand colour (#2E3261) and opens a dropdown to select between daily list or monthly calendar export.

## Components & Structure

### Changes to `app/page.tsx`

The two existing buttons (lines ~695–710):
- `<Button variant="outline">Εξαγωγή Μήνα</Button>`
- `<Button variant="outline">Εξαγωγή σε Excel</Button>`

Are replaced with a single split-button group.

### New component: `components/ui/dropdown-menu.tsx`

Installed via `npx shadcn@latest add dropdown-menu`. No custom code — standard shadcn/ui Radix-based DropdownMenu component.

### Split-button structure

```tsx
<div className="flex">
  {/* Main action button */}
  <Button
    variant="default"
    className="rounded-r-none"
    onClick={handlePrimaryExport}
    disabled={loading || !data}
  >
    <Download className="h-4 w-4 mr-2" />
    Εξαγωγή
  </Button>

  {/* Caret / dropdown trigger */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="default"
        className="rounded-l-none border-l border-white/20 bg-primary/90 px-2"
        disabled={loading || !data}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => { setPrimaryAction('daily'); handleExport(); }}>
        <TableIcon className="h-4 w-4 mr-2 text-primary" />
        <div>
          <div className="font-medium">Ημερήσια λίστα</div>
          <div className="text-xs text-muted-foreground">Excel — επιλεγμένη ημερομηνία</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => { setPrimaryAction('monthly'); handleMonthlyExport(); }}>
        <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
        <div>
          <div className="font-medium">Ημερολόγιο μήνα</div>
          <div className="text-xs text-muted-foreground">Excel — πλέγμα ημερολογίου</div>
        </div>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

## Visual Design

- **Left button:** `variant="default"` (brand navy #2E3261, white text), `rounded-r-none`
- **Right caret button:** same navy, `bg-primary/90` to visually distinguish, `rounded-l-none`, `px-2` (narrow)
- **Divider:** `border-l border-white/20` between the two halves
- **Dropdown items:** small navy-tinted icon, bold label, muted subtitle
- Both halves share the same `disabled` condition — dimmed together when `loading` or no data

## Behaviour & State

- On page load, the main button defaults to **Ημερήσια λίστα** (daily export).
- `primaryAction: 'daily' | 'monthly'` stored in local `useState` — resets on page reload, no persistence needed.
- Selecting a dropdown item: sets `primaryAction` to that choice AND immediately triggers the export.
- Main button click: triggers whichever action is currently set as `primaryAction`.
- Keyboard navigation inside the dropdown is handled by Radix UI natively (arrow keys, Escape).

## Scope

- **In scope:** UI change to the toolbar export controls, install of `dropdown-menu` shadcn component.
- **Out of scope:** Export logic, API routes, filenames, or any other toolbar controls. No changes to `handleExport` or `handleMonthlyExport`.

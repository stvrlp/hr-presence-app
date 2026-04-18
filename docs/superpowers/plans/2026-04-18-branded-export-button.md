# Branded Export Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two plain outline export buttons in the toolbar with a single branded split-button (filled navy) that consolidates daily and monthly exports into a dropdown.

**Architecture:** Install the shadcn/ui `DropdownMenu` component, then replace the two `<Button variant="outline">` export buttons in `app/page.tsx` with a joined split-button: a main navy button that triggers the last-used export, and a narrow caret button that opens a two-item dropdown. A `primaryAction` local state tracks which export the main button fires.

**Tech Stack:** Next.js, React, shadcn/ui (Radix UI), Tailwind CSS, lucide-react

---

## File Map

| File | Action | What changes |
|---|---|---|
| `components/ui/dropdown-menu.tsx` | **Create** (via shadcn) | New Radix-based DropdownMenu component |
| `app/page.tsx` | **Modify** | Replace lines 694–711; add import + state |

---

### Task 1: Install the DropdownMenu component

**Files:**
- Create: `components/ui/dropdown-menu.tsx`

- [ ] **Step 1: Run the shadcn add command**

```bash
cd "/Users/stavroulap./Downloads/vs code projects/presence-app"
npx shadcn@latest add dropdown-menu
```

Expected output: `✔ Done! Added 1 component(s): dropdown-menu`

- [ ] **Step 2: Verify the file was created**

```bash
ls components/ui/dropdown-menu.tsx
```

Expected: file exists, no error.

- [ ] **Step 3: Verify the project still builds**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/ui/dropdown-menu.tsx
git commit -m "feat: add shadcn dropdown-menu component"
```

---

### Task 2: Add `primaryAction` state and new imports to `page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add `ChevronDown`, `Table2`, and `Calendar` to the lucide-react import**

Current import block (lines 31–38):
```tsx
import {
  Download,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
```

Replace with:
```tsx
import {
  Download,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  Table2,
  Calendar,
} from 'lucide-react';
```

- [ ] **Step 2: Add the DropdownMenu imports after the existing `@/components/ui` imports**

After the `useToast` import line (line 27), add:
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
```

- [ ] **Step 3: Add `primaryAction` state inside the component**

Find the block of `useState` declarations near the top of the component. Add this line alongside the other state declarations:
```tsx
const [primaryAction, setPrimaryAction] = useState<'daily' | 'monthly'>('daily');
```

- [ ] **Step 4: Verify TypeScript is still clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add primaryAction state and dropdown imports"
```

---

### Task 3: Replace the two export buttons with the split-button

**Files:**
- Modify: `app/page.tsx` lines 694–711

- [ ] **Step 1: Replace the export buttons block**

Find and replace this block (lines 694–711):

```tsx
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={handleMonthlyExport}
              disabled={loading || monthlyExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Εξαγωγή Μήνα
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={loading || filteredRows.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Εξαγωγή σε Excel
            </Button>
          </div>
```

Replace with:

```tsx
          <div className="ml-auto flex">
            <Button
              variant="default"
              className="rounded-r-none"
              onClick={primaryAction === 'daily' ? handleExport : handleMonthlyExport}
              disabled={
                primaryAction === 'daily'
                  ? loading || filteredRows.length === 0
                  : loading || monthlyExporting
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Εξαγωγή
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  className="rounded-l-none border-l border-white/20 bg-primary/90 px-2"
                  disabled={loading}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={loading || filteredRows.length === 0}
                  onClick={() => {
                    setPrimaryAction('daily');
                    handleExport();
                  }}
                >
                  <Table2 className="h-4 w-4 mr-2 text-primary" />
                  <div>
                    <div className="font-medium">Ημερήσια λίστα</div>
                    <div className="text-xs text-muted-foreground">Excel — επιλεγμένη ημερομηνία</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={loading || monthlyExporting}
                  onClick={() => {
                    setPrimaryAction('monthly');
                    handleMonthlyExport();
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  <div>
                    <div className="font-medium">Ημερολόγιο μήνα</div>
                    <div className="text-xs text-muted-foreground">Excel — πλέγμα ημερολογίου</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start the dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:3000 and check:
- Toolbar shows a single joined "Εξαγωγή" button in filled navy
- Left half and right caret are visually joined (no gap, shared border)
- Clicking the caret opens the dropdown with two items: "Ημερήσια λίστα" and "Ημερολόγιο μήνα"
- Each item shows the correct icon, label, and muted subtitle
- Clicking "Ημερήσια λίστα" triggers the daily export and updates the main button action
- Clicking "Ημερολόγιο μήνα" triggers the monthly export and updates the main button action
- The main button fires whichever action was last selected
- Buttons dim correctly when loading or no data

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace export buttons with branded split-button dropdown"
```

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil, Trash2, Plus, RefreshCw, ArrowLeft } from 'lucide-react';
import type { SessionUser } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dept {
  code: string;
  descr: string;
  _count?: { users: number };
}

interface UserRecord {
  id: string;
  username: string;
  fullName: string;
  role: string;
  departments: { deptCode: string; department: { descr: string } }[];
}

const EMPTY_FORM = {
  username: '',
  fullName: '',
  password: '',
  role: 'USER' as 'ADMIN' | 'USER',
  departments: [] as string[],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // User dialog state
  const [userDialog, setUserDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    editId?: string;
  }>({ open: false, mode: 'create' });
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Delete confirm dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user?: UserRecord }>({
    open: false,
  });
  const [deleting, setDeleting] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user || data.user.role !== 'ADMIN') {
          router.replace('/');
          return;
        }
        setCurrentUser(data.user as SessionUser);
      });
  }, [router]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/settings/users');
      const data = await res.json();
      if (res.ok) setUsers(data.users ?? []);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchDepts = useCallback(async () => {
    setLoadingDepts(true);
    try {
      const res = await fetch('/api/settings/departments');
      const data = await res.json();
      if (res.ok) setDepts(data.departments ?? []);
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchDepts();
  }, [fetchUsers, fetchDepts]);

  // ── User dialog ───────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setUserDialog({ open: true, mode: 'create' });
  }

  function openEdit(user: UserRecord) {
    setForm({
      username: user.username,
      fullName: user.fullName,
      password: '',
      role: user.role as 'ADMIN' | 'USER',
      departments: user.departments.map((d) => d.deptCode),
    });
    setFormError('');
    setUserDialog({ open: true, mode: 'edit', editId: user.id });
  }

  async function handleUserSave() {
    setFormError('');
    if (!form.username.trim() || !form.fullName.trim()) {
      setFormError('Συμπληρώστε όλα τα υποχρεωτικά πεδία');
      return;
    }
    if (userDialog.mode === 'create' && !form.password) {
      setFormError('Ο κωδικός είναι υποχρεωτικός');
      return;
    }

    setFormSaving(true);
    try {
      const url =
        userDialog.mode === 'create'
          ? '/api/settings/users'
          : `/api/settings/users/${userDialog.editId}`;
      const method = userDialog.mode === 'create' ? 'POST' : 'PUT';

      const body: Record<string, unknown> = {
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        role: form.role,
        departments: form.role === 'ADMIN' ? [] : form.departments,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Σφάλμα αποθήκευσης');
        return;
      }
      toast({
        title: userDialog.mode === 'create' ? 'Χρήστης δημιουργήθηκε' : 'Χρήστης ενημερώθηκε',
      });
      setUserDialog({ open: false, mode: 'create' });
      fetchUsers();
    } catch {
      setFormError('Σφάλμα δικτύου');
    } finally {
      setFormSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteDialog.user) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/settings/users/${deleteDialog.user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Σφάλμα', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Ο χρήστης διαγράφηκε' });
      setDeleteDialog({ open: false });
      fetchUsers();
    } catch {
      toast({ title: 'Σφάλμα δικτύου', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  // ── Dept sync ─────────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/settings/departments/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Σφάλμα', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Συγχρονισμός', description: data.message });
      fetchDepts();
    } catch {
      toast({ title: 'Σφάλμα δικτύου', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="w-full h-14 flex items-center px-6 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <img src="/ari-logo.svg" alt="ARI Foods" style={{ height: 30 }} className="mr-6" />
        <span className="text-sm font-semibold text-foreground">Ρυθμίσεις</span>
        <Link href="/" className="ml-auto">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600">
            <ArrowLeft className="h-4 w-4" />
            Επιστροφή
          </Button>
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Χρήστες</TabsTrigger>
            <TabsTrigger value="departments">Τμήματα</TabsTrigger>
          </TabsList>

          {/* ── Tab: Χρήστες ─────────────────────────────────────────────── */}
          <TabsContent value="users">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Διαχείριση χρηστών</h2>
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Νέος χρήστης
              </Button>
            </div>

            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Ονοματεπώνυμο</TableHead>
                    <TableHead>Όνομα χρήστη</TableHead>
                    <TableHead className="w-32">Ρόλος</TableHead>
                    <TableHead>Τμήματα</TableHead>
                    <TableHead className="w-24 text-right">Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin inline" />
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Δεν υπάρχουν χρήστες
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.fullName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {u.username}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              u.role === 'ADMIN'
                                ? 'bg-[#2E3261] text-white border-transparent hover:bg-[#2E3261]'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }
                          >
                            {u.role === 'ADMIN' ? 'Διαχειριστής' : 'Χρήστης'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.role === 'ADMIN' ? (
                              <span className="text-xs text-muted-foreground">Όλα</span>
                            ) : u.departments.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              u.departments.map((d) => (
                                <Badge
                                  key={d.deptCode}
                                  variant="outline"
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {d.department.descr}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(u)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteDialog({ open: true, user: u })}
                              disabled={u.id === currentUser.userId}
                              title={
                                u.id === currentUser.userId
                                  ? 'Δεν μπορείτε να διαγράψετε τον λογαριασμό σας'
                                  : 'Διαγραφή'
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Tab: Τμήματα ─────────────────────────────────────────────── */}
          <TabsContent value="departments">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Τμήματα από ERP</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
                className="gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Συγχρονισμός από ERP
              </Button>
            </div>

            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-40">Κωδικός</TableHead>
                    <TableHead>Περιγραφή</TableHead>
                    <TableHead className="w-36 text-center">Αριθμός χρηστών</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDepts ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin inline" />
                      </TableCell>
                    </TableRow>
                  ) : depts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Δεν υπάρχουν τμήματα. Κάντε συγχρονισμό από ERP.
                      </TableCell>
                    </TableRow>
                  ) : (
                    depts.map((d) => (
                      <TableRow key={d.code}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {d.code}
                        </TableCell>
                        <TableCell className="font-medium">{d.descr}</TableCell>
                        <TableCell className="text-center text-sm">
                          {d._count?.users ?? 0}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── User create/edit dialog ────────────────────────────────────────── */}
      <Dialog
        open={userDialog.open}
        onOpenChange={(v) => { if (!v) setUserDialog({ open: false, mode: 'create' }); }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {userDialog.mode === 'create' ? 'Νέος χρήστης' : 'Επεξεργασία χρήστη'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Όνομα χρήστη *</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ονοματεπώνυμο *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Κωδικός πρόσβασης{' '}
                {userDialog.mode === 'edit' && (
                  <span className="text-muted-foreground font-normal">
                    (αφήστε κενό για να μην αλλάξει)
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ρόλος</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, role: v as 'ADMIN' | 'USER', departments: [] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Διαχειριστής</SelectItem>
                  <SelectItem value="USER">Χρήστης</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === 'USER' && (
              <div className="space-y-2">
                <Label>Τμήματα</Label>
                {depts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Δεν υπάρχουν τμήματα. Κάντε συγχρονισμό από ERP πρώτα.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                    {depts.map((d) => (
                      <div key={d.code} className="flex items-center gap-2">
                        <Checkbox
                          id={`dept-${d.code}`}
                          checked={form.departments.includes(d.code)}
                          onCheckedChange={(checked) =>
                            setForm((f) => ({
                              ...f,
                              departments: checked
                                ? [...f.departments, d.code]
                                : f.departments.filter((c) => c !== d.code),
                            }))
                          }
                        />
                        <label
                          htmlFor={`dept-${d.code}`}
                          className="text-sm cursor-pointer select-none"
                        >
                          {d.descr}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUserDialog({ open: false, mode: 'create' })}
              disabled={formSaving}
            >
              Ακύρωση
            </Button>
            <Button onClick={handleUserSave} disabled={formSaving}>
              {formSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Αποθήκευση
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ──────────────────────────────────────────── */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(v) => { if (!v) setDeleteDialog({ open: false }); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Διαγραφή χρήστη</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη{' '}
            <span className="font-semibold text-foreground">
              {deleteDialog.user?.fullName}
            </span>
            ; Η ενέργεια δεν αναιρείται.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false })}
              disabled={deleting}
            >
              Ακύρωση
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Διαγραφή
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

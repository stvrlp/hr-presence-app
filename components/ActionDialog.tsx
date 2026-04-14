'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { PresenceRow, ActionType } from '@/lib/types';

interface ActionDialogProps {
  row: PresenceRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: (row: PresenceRow, action: ActionType, note: string) => void;
}

const ACTION_OPTIONS_WITH_CARD: { value: ActionType; label: string }[] = [
  { value: 'REJECTED', label: 'Απόρριψη καταχώρησης' },
  { value: 'PRESENT',  label: 'Παρών (επιβεβαίωση)' },
  { value: 'REMOTE',   label: 'Τηλεργασία' },
  { value: 'DAYOFF',   label: 'Ρεπό' },
];

const ACTION_OPTIONS_WITHOUT_CARD: { value: ActionType; label: string }[] = [
  { value: 'PRESENT', label: 'Παρών' },
  { value: 'LEAVE',   label: 'Άδεια' },
  { value: 'SICK',    label: 'Ασθένεια' },
  { value: 'ABSENT',  label: 'Απουσία' },
  { value: 'REMOTE',  label: 'Τηλεργασία' },
  { value: 'DAYOFF',  label: 'Ρεπό' },
];

export function ActionDialog({ row, open, onClose, onSaved }: ActionDialogProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>('PRESENT');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !row) return;
    setNote('');
    setError('');
    setSelectedAction(row.hasCardEntry ? 'REJECTED' : (row.action ?? 'PRESENT'));
  }, [open, row]);

  const options = row?.hasCardEntry ? ACTION_OPTIONS_WITH_CARD : ACTION_OPTIONS_WITHOUT_CARD;

  async function handleSave() {
    if (!row) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: row.code,
          date: row.date,
          action: selectedAction,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Σφάλμα αποθήκευσης');
        return;
      }
      onSaved(row, selectedAction, note.trim());
      onClose();
    } catch {
      setError('Σφάλμα δικτύου');
    } finally {
      setSaving(false);
    }
  }

  if (!row) return null;

  const fullName = `${row.surname} ${row.name}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Ενέργεια για: <span className="font-bold">{fullName}</span>
          </DialogTitle>
          {row.department && (
            <p className="text-sm text-muted-foreground">{row.department}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Κατάσταση</Label>
            <Select
              value={selectedAction}
              onValueChange={(v) => setSelectedAction(v as ActionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Σημείωση{' '}
              <span className="text-muted-foreground font-normal">(προαιρετικό)</span>
            </Label>
            <Input
              placeholder="π.χ. άδεια έκτακτης ανάγκης"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Αποθήκευση
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

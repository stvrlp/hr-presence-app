import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a Date or ISO string as DD/MM/YYYY */
export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Format a time value (HH:MM:SS, ISO datetime, or Date) as HH:MM */
export function formatTime(t: string | Date | null | undefined): string {
  if (!t) return '—';
  if (t instanceof Date) {
    // Extract UTC hours/minutes (mssql TIME values are anchored to 1970-01-01 UTC)
    const hh = String(t.getUTCHours()).padStart(2, '0');
    const mm = String(t.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const s = String(t);
  // ISO datetime string e.g. "1970-01-01T07:11:39.000Z" — take the UTC time part
  if (s.includes('T')) {
    const timePart = s.split('T')[1]; // "07:11:39.000Z"
    return timePart.slice(0, 5);      // "07:11"
  }
  // Plain "HH:MM:SS" or "HH:MM"
  return s.slice(0, 5);
}

/** Convert a JS Date to YYYY-MM-DD local string (no UTC shift) */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

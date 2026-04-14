'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { StatusSummary } from '@/lib/types';

interface SummaryBarProps {
  summary: StatusSummary;
  className?: string;
}

interface Pill {
  label: string;
  count: number;
  color: string;
  bg: string;
  border: string;
}

export function SummaryBar({ summary, className }: SummaryBarProps) {
  const pills: Pill[] = [
    {
      label: 'Παρόντες',
      count: summary.present,
      color: '#166534',
      bg: '#dcfce7',
      border: '#86efac',
    },
    {
      label: 'Άδεια',
      count: summary.leave,
      color: '#92400e',
      bg: '#fef3c7',
      border: '#fcd34d',
    },
    {
      label: 'Ασθένεια',
      count: summary.sick,
      color: '#92400e',
      bg: '#fff7ed',
      border: '#fdba74',
    },
    {
      label: 'Απόντες',
      count: summary.absent,
      color: '#991b1b',
      bg: '#fee2e2',
      border: '#fca5a5',
    },
    {
      label: 'Τηλεργασία',
      count: summary.remote,
      color: '#1e40af',
      bg: '#dbeafe',
      border: '#93c5fd',
    },
    {
      label: 'Ρεπό',
      count: summary.dayoff,
      color: '#6b21a8',
      bg: '#f3e8ff',
      border: '#d8b4fe',
    },
    {
      label: 'Εκκρεμείς',
      count: summary.unknown,
      color: '#374151',
      bg: '#f3f4f6',
      border: '#d1d5db',
    },
  ];

  const total = summary.present + summary.leave + summary.sick + summary.absent + summary.remote + summary.dayoff + summary.unknown;

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {pills.map((p) => (
        <div
          key={p.label}
          style={{
            backgroundColor: p.bg,
            borderColor: p.border,
            color: p.color,
          }}
          className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium"
        >
          <span className="text-lg font-bold leading-none">{p.count}</span>
          <span>{p.label}</span>
        </div>
      ))}
      <div className="ml-auto text-sm text-muted-foreground">
        Σύνολο: <span className="font-semibold">{total}</span> εργαζόμενοι
      </div>
    </div>
  );
}

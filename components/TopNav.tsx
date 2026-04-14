'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, LogOut } from 'lucide-react';
import type { SessionUser } from '@/lib/auth';

export type NavTab = 'presences' | 'absences';

interface TopNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  presenceCount?: number;
  absenceCount?: number;
  user?: SessionUser | null;
}

const BRAND = '#2E3261';
const BRAND_MUTED = '#9294AA';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Διαχειριστής',
  USER: 'Χρήστης',
};

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return fullName.slice(0, 2).toUpperCase();
}

export function TopNav({
  activeTab,
  onTabChange,
  presenceCount,
  absenceCount,
  user,
}: TopNavProps) {
  return (
    <header className="w-full h-14 flex items-center px-6 bg-white border-b border-gray-200 shadow-sm z-50 sticky top-0">
      {/* Logo */}
      <div className="flex items-center mr-10 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ari-logo.svg" alt="ARI Foods" style={{ height: 30 }} />
      </div>

      {/* Tabs */}
      <nav className="flex items-center h-full gap-1 flex-1">
        <TabButton
          active={activeTab === 'presences'}
          count={presenceCount}
          onClick={() => onTabChange('presences')}
        >
          Παρουσίες
        </TabButton>
        <TabButton
          active={activeTab === 'absences'}
          count={absenceCount}
          onClick={() => onTabChange('absences')}
        >
          Απουσίες
        </TabButton>
      </nav>

      {/* User avatar dropdown */}
      {user && <UserProfileDropdown user={user} />}
    </header>
  );
}

// ─── Tab button ────────────────────────────────────────────────────────────────

function TabButton({
  children,
  active,
  count,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="h-full px-5 flex items-center gap-2 text-sm font-medium transition-colors"
      style={
        active
          ? { backgroundColor: BRAND, color: '#fff' }
          : { backgroundColor: 'transparent', color: '#374151' }
      }
    >
      {children}
      {count !== undefined && (
        <span
          className="inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[1.4rem] h-5 px-1.5"
          style={
            active
              ? { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }
              : { backgroundColor: BRAND, color: '#fff' }
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── User profile dropdown ─────────────────────────────────────────────────────

function UserProfileDropdown({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const initials = getInitials(user.fullName);
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target) return;
      if (
        dropdownRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleLogout() {
    setOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="relative shrink-0">
      {/* Avatar button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm text-white hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{ backgroundColor: BRAND }}
        title={user.fullName}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-12 w-64 bg-white border rounded-xl shadow-xl z-50 py-2"
          style={{ borderColor: '#E5E7EB' }}
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b" style={{ borderColor: '#F0F0F5' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                style={{ backgroundColor: BRAND }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: BRAND }}>
                  {user.fullName}
                </p>
                <p className="text-xs" style={{ color: BRAND_MUTED }}>
                  {roleLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {/* Settings — ADMIN only */}
            {user.role === 'ADMIN' && (
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm"
                style={{ color: BRAND }}
              >
                <Settings size={16} />
                <span>Ρυθμίσεις</span>
              </Link>
            )}

            <div className="my-1 border-t" style={{ borderColor: '#F0F0F5' }} />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm text-red-500"
            >
              <LogOut size={16} />
              <span>Αποσύνδεση</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

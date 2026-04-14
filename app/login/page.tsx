'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, User, Lock } from 'lucide-react';

const BRAND = '#2E3261';
const BRAND_MUTED = '#9294AA';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Σφάλμα σύνδεσης');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Σφάλμα δικτύου. Δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f5f5f7' }}>

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ backgroundColor: BRAND }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10 bg-white" />
        <div
          className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ backgroundColor: '#1E88E5' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col items-center text-center max-w-xl"
        >
          <Image
            src="/ari-logo.svg"
            alt="ARI Foods"
            width={220}
            height={90}
            className="mb-10 brightness-0 invert"
          />
          <h1 className="text-3xl font-bold text-white mb-4">
            Παρακολούθηση Παρουσιών
          </h1>
          <p className="text-base leading-relaxed" style={{ color: '#C6C7D3' }}>
            Παρακολουθήστε τις καθημερινές παρουσίες και απουσίες των
            εργαζομένων, καταγράφοντας αδείες, ασθένειες και τηλεργασία σε
            έναν κεντρικό χώρο.
          </p>
        </motion.div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src="/ari-logo.svg" alt="ARI Foods" width={160} height={65} />
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold" style={{ color: BRAND }}>
                Καλώς ήρθατε
              </h2>
              <p className="text-sm mt-1" style={{ color: BRAND_MUTED }}>
                Συνδεθείτε για να συνεχίσετε
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: BRAND }}
                >
                  Όνομα χρήστη
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: BRAND_MUTED }}
                  />
                  <Input
                    type="text"
                    placeholder="Εισάγετε το όνομα χρήστη σας"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-9 h-11 bg-white"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: BRAND }}
                >
                  Κωδικός πρόσβασης
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: BRAND_MUTED }}
                  />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-9 pr-10 h-11 bg-white"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: BRAND_MUTED }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full text-white font-medium h-11"
                style={{ backgroundColor: BRAND }}
              >
                {loading ? 'Σύνδεση...' : 'Σύνδεση'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

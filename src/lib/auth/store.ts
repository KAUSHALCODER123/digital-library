'use client';

import { create } from 'zustand';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export type SessionUser = {
  id: string;
  email?: string;
  name?: string;
  role: 'patron' | 'staff';
  showMature: boolean;
};

type AuthState = {
  status: 'loading' | 'guest' | 'authenticated';
  /** False when Supabase keys are missing: accounts are unavailable, everything else works. */
  enabled: boolean;
  user: SessionUser | null;
  set: (s: Partial<Omit<AuthState, 'set'>>) => void;
};

export const useAuth = create<AuthState>((set) => ({
  // Known at build time, so the header never shows an account placeholder when accounts are off.
  status: isSupabaseConfigured() ? 'loading' : 'guest',
  enabled: isSupabaseConfigured(),
  user: null,
  set: (s) => set(s),
}));

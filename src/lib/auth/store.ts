'use client';

import { create } from 'zustand';

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
  status: 'loading',
  enabled: true,
  user: null,
  set: (s) => set(s),
}));

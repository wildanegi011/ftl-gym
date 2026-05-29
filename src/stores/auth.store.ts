import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  role: 'admin' | 'trainer' | 'pt' | 'member' | null
  setAuth: (user: User | null, role: 'admin' | 'trainer' | 'pt' | 'member' | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  setAuth: (user, role) => set({ user, role }),
  clearAuth: () => set({ user: null, role: null }),
}))

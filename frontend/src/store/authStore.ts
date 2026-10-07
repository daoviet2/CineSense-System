import { create } from 'zustand';
import { AuthStatus, User } from '@/types/auth';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  setUser: (user: User | null) => void;
  setStatus: (status: AuthStatus) => void;
  setAuthenticatedUser: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  setUser: (user) =>
    set({
      user,
      status: user ? 'authenticated' : 'unauthenticated',
    }),

  setStatus: (status) => set({ status }),

  setAuthenticatedUser: (user) =>
    set({
      user,
      status: 'authenticated',
    }),

  clearAuth: () =>
    set({
      user: null,
      status: 'unauthenticated',
    }),
}));

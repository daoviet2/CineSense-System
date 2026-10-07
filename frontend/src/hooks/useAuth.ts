'use client';

import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authService, AuthApiError } from '@/services/authService';
import { LoginInput, RegisterInput, UpdateProfileInput, User } from '@/types/auth';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const setUser = useAuthStore((state) => state.setUser);
  const setAuthenticatedUser = useAuthStore((state) => state.setAuthenticatedUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setStatus = useAuthStore((state) => state.setStatus);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const currentUser = await authService.getMe();
      setAuthenticatedUser(currentUser);
      return currentUser;
    } catch (error) {
      if (error instanceof AuthApiError && error.statusCode === 401) {
        clearAuth();
      } else {
        clearAuth();
      }
      return null;
    }
  }, [clearAuth, setAuthenticatedUser]);

  // Khởi tạo phiên khi app mount (D11: GET /users/me khi khởi động)
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (status !== 'loading') return;
      try {
        const currentUser = await authService.getMe();
        if (isMounted) {
          setAuthenticatedUser(currentUser);
        }
      } catch {
        if (isMounted) {
          clearAuth();
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [status, setAuthenticatedUser, clearAuth]);

  const login = useCallback(
    async (input: LoginInput): Promise<User> => {
      setStatus('loading');
      try {
        const loggedInUser = await authService.login(input);
        setAuthenticatedUser(loggedInUser);
        return loggedInUser;
      } catch (error) {
        setStatus('unauthenticated');
        throw error;
      }
    },
    [setStatus, setAuthenticatedUser]
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<User> => {
      setStatus('loading');
      try {
        const registeredUser = await authService.register(input);
        setAuthenticatedUser(registeredUser);
        return registeredUser;
      } catch (error) {
        setStatus('unauthenticated');
        throw error;
      }
    },
    [setStatus, setAuthenticatedUser]
  );

  const logout = useCallback(async (): Promise<void> => {
    setStatus('loading');
    try {
      await authService.logout();
    } finally {
      clearAuth();
    }
  }, [setStatus, clearAuth]);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<User> => {
      const updatedUser = await authService.updateProfile(input);
      setUser(updatedUser);
      return updatedUser;
    },
    [setUser]
  );

  return {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
  };
}

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authStore, AuthState, login as apiLogin, register as apiRegister } from './api';
import type { AuthUser } from './types';
import i18n from './i18n';
import { registerForPushNotifications } from './push';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  hydrated: boolean;
  login: (phone: string, password: string) => Promise<AuthUser>;
  register: (phone: string, password: string, fullName: string, verificationRequestId: string, email?: string, referralCode?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(authStore.getState());
  const [hydrated, setHydrated] = useState(authStore.isHydrated());

  useEffect(() => {
    const unsub = authStore.subscribe(() => {
      setState(authStore.getState());
      setHydrated(authStore.isHydrated());
    });
    if (!authStore.isHydrated()) {
      authStore.hydrate();
    } else {
      setHydrated(true);
    }
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (state.user?.preferredLanguage) {
      i18n.changeLanguage(state.user.preferredLanguage);
    }
  }, [state.user?.preferredLanguage]);

  // Register (or re-register) this device for push notifications whenever a
  // session becomes active — both right after login/register, and on cold start
  // when a previously-stored session hydrates. Best-effort, see lib/push.ts.
  useEffect(() => {
    if (hydrated && state.user) {
      registerForPushNotifications();
    }
  }, [hydrated, !!state.user]);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await apiLogin(phone, password);
    await authStore.setAuth({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user });
    if (res.user.preferredLanguage) {
      i18n.changeLanguage(res.user.preferredLanguage);
    }
    return res.user;
  }, []);

  const register = useCallback(async (phone: string, password: string, fullName: string, verificationRequestId: string, email?: string, referralCode?: string) => {
    const res = await apiRegister(phone, password, fullName, verificationRequestId, email, referralCode);
    await authStore.setAuth({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user });
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await authStore.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user: state.user, accessToken: state.accessToken, hydrated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function homeRouteForRole(role?: string | null): string {
  if (role === 'VENUE_ADMIN') return '/(venue-admin)/dashboard';
  if (role === 'AGGREGATOR_ADMIN') return '/(aggregator)/dashboard';
  if (role === 'SYSTEM_ADMIN') return '/(system-admin)/overview';
  return '/(client)/catalog';
}

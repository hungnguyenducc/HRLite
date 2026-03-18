'use client';

import * as React from 'react';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'SUSPENDED';
  phone: string | null;
  photoUrl: string | null;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchUser = React.useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { credentials: 'include' });

      if (res.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshRes.ok) {
          const retryRes = await fetch('/api/users/me', { credentials: 'include' });
          if (retryRes.ok) {
            const retryData: { success: boolean; data: User } = await retryRes.json();
            if (retryData.success) {
              setUser(retryData.data);
              return;
            }
          }
        }

        setUser(null);
        return;
      }

      if (res.ok) {
        const data: { success: boolean; data: User } = await res.json();
        if (data.success) {
          setUser(data.data);
          return;
        }
      }

      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = React.useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  const refreshUser = React.useCallback(async () => {
    setLoading(true);
    await fetchUser();
  }, [fetchUser]);

  const value = React.useMemo(
    () => ({ user, loading, logout, refreshUser }),
    [user, loading, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

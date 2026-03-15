import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, ensureCsrfToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { username, role }
  const [ready, setReady] = useState(false);

  async function refresh() {
    try {
      await ensureCsrfToken();
      const s = await api.getSession();
      if (s?.username) setUser({ username: s.username, role: s.role });
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => { refresh(); }, []);

  const value = useMemo(() => ({
    user,
    ready,
    refresh,
    async login(username, password) {
      const r = await api.login(username, password);
      await refresh();
      return r;
    },
    async logout() {
      await api.logout();
      await refresh();
    }
  }), [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

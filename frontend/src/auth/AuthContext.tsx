import React, { createContext, useContext, useMemo, useState } from "react";
import { api } from "../api/client";

type AuthContextValue = {
  accessToken: string | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  tryRestoreSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    setAccessToken(res.data.access_token);
  }

  async function refresh() {
    const res = await api.post("/auth/refresh");
    setAccessToken(res.data.access_token);
  }

  async function tryRestoreSession() {
    try {
      await refresh();
    } catch {
      setAccessToken(null);
    } finally {
      setInitializing(false);
    }
  }

  async function logout() {
    await api.post("/auth/logout");
    setAccessToken(null);
  }

  const value = useMemo(
    () => ({ accessToken, initializing, login, logout, refresh, tryRestoreSession }),
    [accessToken, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { customFetch } from "@/api-client";

type AuthState = {
  role: "admin" | "viewer";
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await customFetch<{ authenticated?: boolean; role?: string }>(
        "/api/auth/me",
        { responseType: "json", credentials: "include" },
      );
      setRole(result.authenticated && result.role === "admin" ? "admin" : "viewer");
    } catch {
      // Auth unavailable or session expired: public pages remain accessible as Viewer.
      setRole("viewer");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = useCallback(async (password: string) => {
    await customFetch<{ authenticated: boolean; role: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
      responseType: "json",
      credentials: "include",
    });
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await customFetch("/api/auth/logout", {
        method: "POST",
        responseType: "json",
        credentials: "include",
      });
    } finally {
      setRole("viewer");
    }
  }, []);

  const value = useMemo(() => ({
    role, isAdmin: role === "admin", loading, refresh, login, logout,
  }), [role, loading, refresh, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

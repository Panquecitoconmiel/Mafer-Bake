import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { api } from "../services/api";
import type { User } from "../types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: Record<string, unknown>) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ["me"], queryFn: api.me, staleTime: 5 * 60_000 });

  const setUser = useCallback((u: User | null) => qc.setQueryData(["me"], u), [qc]);
  // Tras iniciar/cerrar sesión cambian el carrito, favoritos y pedidos.
  const refreshUserData = useCallback(() => {
    qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" });
  }, [qc]);

  const login = useCallback(
    async (email: string, password: string) => {
      const u = await api.login({ email, password });
      setUser(u);
      refreshUserData();
      return u;
    },
    [setUser, refreshUserData],
  );
  const register = useCallback(
    async (data: Record<string, unknown>) => {
      const u = await api.register(data);
      setUser(u);
      refreshUserData();
      return u;
    },
    [setUser, refreshUserData],
  );
  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
  }, [qc, setUser]);

  const value = useMemo(
    () => ({ user: user ?? null, loading: isLoading, isAdmin: user?.role === "ADMIN", login, register, logout, setUser }),
    [user, isLoading, login, register, logout, setUser],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

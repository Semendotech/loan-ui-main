"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import config from "./config";
import toast from "react-hot-toast";

// Types
interface User { id: number; username: string; role?: string; }
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}


const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => ({ success: false, message: "Not implemented" }),
  logout: async () => {},
  refreshUser: async () => {},
});


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Universal user detector (refreshed on mount and after login)
  const refreshUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.api.baseUrl}/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => { refreshUser(); }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${config.api.baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
  
      if (res.ok) {
        await refreshUser();
        toast.success("Welcome back!");
        router.push("/dashboard");
        return { success: true, message: "Login successful" };
      } else {
        const data = await res.json().catch(() => ({}));
        const message = data?.detail || "Login failed";
        toast.error(message);
        return { success: false, message };
      }
    } catch (err) {
      toast.error("Unexpected error");
      return { success: false, message: "Unexpected error occurred" };
    } finally {
      setLoading(false);
    }
  };
  
  

  const logout = async () => {
    setLoading(true);
    try {
      await fetch(`${config.api.baseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      toast.success("Logged out!");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login, // just reference the function, no type annotation here
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
  
}

// Hook to use in components
export const useAuth = () => useContext(AuthContext);
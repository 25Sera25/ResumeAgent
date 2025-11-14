import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";

interface User {
  id: string;
  username: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Track pending checkAuth requests to prevent race conditions
  const checkAuthAbortController = useRef<AbortController | null>(null);
  const checkAuthInProgress = useRef(false);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Prevent duplicate simultaneous requests
    if (checkAuthInProgress.current) {
      return;
    }

    // Cancel any previous pending request
    if (checkAuthAbortController.current) {
      checkAuthAbortController.current.abort();
    }

    // Create new abort controller for this request
    const controller = new AbortController();
    checkAuthAbortController.current = controller;
    checkAuthInProgress.current = true;

    try {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
        signal: controller.signal,
      });
      
      // Only update state if this request wasn't aborted
      if (!controller.signal.aborted) {
        if (res.ok) {
          const data = await res.json();
          // Handle new format: { user: {...} } or { user: null }
          if (data.user) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      // Ignore abort errors - they're expected when canceling
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      // Only log and update state if not aborted
      if (!controller.signal.aborted) {
        console.error("Auth check failed:", error);
        setUser(null);
      }
    } finally {
      // Only update loading/initialized if this request wasn't aborted
      if (!controller.signal.aborted) {
        setLoading(false);
        setInitialized(true);
      }
      checkAuthInProgress.current = false;
    }
  };

  const login = async (username: string, password: string) => {
    // Cancel any pending checkAuth request to prevent race condition
    if (checkAuthAbortController.current) {
      checkAuthAbortController.current.abort();
      checkAuthAbortController.current = null;
    }
    
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await res.json();
    // Immediately set user from login response to prevent race with checkAuth
    setUser(data);
    setLoading(false);
    setInitialized(true);
  };

  const register = async (username: string, password: string) => {
    // Cancel any pending checkAuth request to prevent race condition
    if (checkAuthAbortController.current) {
      checkAuthAbortController.current.abort();
      checkAuthAbortController.current = null;
    }
    
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Registration failed");
    }

    const data = await res.json();
    // Immediately set user from registration response
    setUser(data);
    setLoading(false);
    setInitialized(true);
  };

  const logout = async () => {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    if (res.ok) {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

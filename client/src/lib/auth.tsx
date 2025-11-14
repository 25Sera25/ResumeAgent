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
  
  // Use ref to track pending auth check and prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAuthenticatedRef = useRef(false);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
    
    // Cleanup: abort any pending auth check when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const checkAuth = async () => {
    // Don't overwrite if user just logged in
    if (isAuthenticatedRef.current) {
      return;
    }
    
    // Cancel any pending auth check
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
        signal: abortControllerRef.current.signal,
      });
      
      if (res.ok) {
        const data = await res.json();
        // Handle new format: { user: {...} } or { user: null }
        // Only update if we haven't authenticated since starting this check
        if (!isAuthenticatedRef.current) {
          if (data.user) {
            setUser(data.user);
            isAuthenticatedRef.current = true;
          } else {
            setUser(null);
          }
        }
      } else {
        if (!isAuthenticatedRef.current) {
          setUser(null);
        }
      }
    } catch (error) {
      // Ignore abort errors - they're expected when we cancel pending requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error("Auth check failed:", error);
      if (!isAuthenticatedRef.current) {
        setUser(null);
      }
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const login = async (username: string, password: string) => {
    // Cancel any pending auth check to prevent race condition
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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
    
    // Mark as authenticated to prevent checkAuth from overwriting
    isAuthenticatedRef.current = true;
    
    // Immediately set user from login response to prevent race with checkAuth
    setUser(data);
    setLoading(false);
    setInitialized(true);
  };

  const register = async (username: string, password: string) => {
    // Cancel any pending auth check to prevent race condition
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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
    
    // Mark as authenticated to prevent checkAuth from overwriting
    isAuthenticatedRef.current = true;
    
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
      isAuthenticatedRef.current = false;
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

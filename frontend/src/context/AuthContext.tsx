import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User, TokenResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'trusttrace_token';
const USER_KEY = 'trusttrace_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveAuth = (authData: TokenResponse) => {
    setToken(authData.access_token);
    setUser(authData.user);
    try {
      localStorage.setItem(TOKEN_KEY, authData.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    } catch {
      // storage unavailable
    }
  };

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // storage unavailable
    }
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await api.auth.me();
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      } catch {
        // If token expired or invalid, clear
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    saveAuth(res);
  };

  const register = async (email: string, password: string, name?: string) => {
    const res = await api.auth.register({ email, password, name });
    saveAuth(res);
  };

  const loginDemo = async () => {
    const res = await api.auth.demo();
    saveAuth(res);
  };

  const logout = () => {
    try {
      api.auth.logout().catch(() => {});
    } catch {
      // ignore
    }
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

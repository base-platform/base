"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { apiClient, User, TokenStorage } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  extendSession: () => void;
  remainingSessionTime: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [remainingSessionTime, setRemainingSessionTime] = useState(0);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout>();
  const activityListenerRef = useRef<boolean>(false);

  // Ensure we only access localStorage after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Activity tracking
  const updateActivity = () => {
    if (user && TokenStorage.getToken()) {
      TokenStorage.updateLastActivity();
      TokenStorage.updateSessionExpiry();
    }
  };

  // Setup activity listeners
  useEffect(() => {
    if (isMounted && user && !activityListenerRef.current) {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      
      events.forEach(event => {
        document.addEventListener(event, updateActivity, true);
      });
      
      activityListenerRef.current = true;

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, updateActivity, true);
        });
        activityListenerRef.current = false;
      };
    }
  }, [user, isMounted]);

  // Session timeout checking
  useEffect(() => {
    if (isMounted && user) {
      const checkSession = () => {
        const remaining = TokenStorage.getRemainingSessionTime();
        setRemainingSessionTime(remaining);
        
        if (TokenStorage.isSessionExpired()) {
          logout();
          return;
        }
      };

      // Check immediately
      checkSession();

      // Check every 30 seconds
      sessionCheckIntervalRef.current = setInterval(checkSession, 30000);

      return () => {
        if (sessionCheckIntervalRef.current) {
          clearInterval(sessionCheckIntervalRef.current);
        }
      };
    }
  }, [user, isMounted]);

  // Check if user is already logged in on mount
  useEffect(() => {
    if (!isMounted) return;
    
    const token = apiClient.getAccessToken();
    if (token) {
      // Check if session is expired
      if (TokenStorage.isSessionExpired()) {
        TokenStorage.clear();
        localStorage.removeItem('user_data');
        setIsLoading(false);
        return;
      }

      // Try to get user info from localStorage
      const storedUser = localStorage.getItem('user_data');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsLoading(false);
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
          apiClient.setAccessToken(null);
          setIsLoading(false);
        }
      } else {
        // If no stored user data, clear the token
        apiClient.setAccessToken(null);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [isMounted]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.auth.login({ email, password });
      
      // Store user data in localStorage for persistence
      const userData = {
        ...response.user,
        // Provide sensible defaults for optional fields
        name: response.user.name || `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() || response.user.email,
        firstName: response.user.firstName || response.user.email.split('@')[0],
        lastName: response.user.lastName || '',
        isActive: response.user.isActive ?? true,
        emailVerified: response.user.emailVerified ?? false,
        createdAt: response.user.createdAt || new Date().toISOString(),
        updatedAt: response.user.updatedAt || new Date().toISOString(),
      };
      
      localStorage.setItem('user_data', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    apiClient.auth.logout().finally(() => {
      localStorage.removeItem('user_data');
      setUser(null);
    });
  };

  const extendSession = () => {
    if (user && TokenStorage.getToken()) {
      TokenStorage.updateSessionExpiry();
      setRemainingSessionTime(TokenStorage.getRemainingSessionTime());
    }
  };

  const value: AuthContextType = {
    user,
    isLoading: isLoading || !isMounted,
    login,
    logout,
    isAuthenticated: !!user && isMounted,
    extendSession,
    remainingSessionTime,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
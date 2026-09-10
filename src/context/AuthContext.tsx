import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, UserRole } from '../types/index.ts';
import { api, setStoredToken, clearStoredToken, getStoredToken } from '../services/api.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup } from 'firebase/auth';

import { PHOTO_UPDATED_EVENT, EmployeePhotoUpdateDetail } from '../utils/photoSync.ts';

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.getCurrentUser();
      setUser({ ...userData, token });
    } catch {
      clearStoredToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleAuthExpired = () => {
      clearStoredToken();
      setUser(null);
    };

    const handlePhotoUpdated = (e: Event) => {
      const detail = (e as CustomEvent<EmployeePhotoUpdateDetail>).detail;
      if (!detail) return;
      const { employeeId, photoUrl, employeeCode } = detail;

      setUser((prev) => {
        if (!prev) return null;
        const matches =
          prev.employeeId === employeeId ||
          prev.employee?.id === employeeId ||
          (employeeCode && prev.employee?.employeeCode === employeeCode);

        if (!matches) return prev;

        return {
          ...prev,
          photoUrl: photoUrl || null,
          employee: prev.employee
            ? { ...prev.employee, photoUrl: photoUrl || null }
            : prev.employee,
        };
      });
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'apex:last-photo-update' && e.newValue) {
        try {
          const detail = JSON.parse(e.newValue);
          window.dispatchEvent(new CustomEvent(PHOTO_UPDATED_EVENT, { detail }));
        } catch {
          // ignore
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('apex:auth-expired', handleAuthExpired);
      window.addEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdated);
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('apex:auth-expired', handleAuthExpired);
        window.removeEventListener(PHOTO_UPDATED_EVENT, handlePhotoUpdated);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  const login = async (username: string, password = 'password123') => {
    const response = await api.login({ username, password });
    setStoredToken(response.token);
    setUser(response.user);
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    const response = await api.firebaseLogin(idToken);
    setStoredToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      const token = getStoredToken() || '';
      setUser({ ...userData, token });
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.roleName === 'Administrator') return true; // Administrator has full access
    return roles.includes(user.roleName as UserRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        refreshUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

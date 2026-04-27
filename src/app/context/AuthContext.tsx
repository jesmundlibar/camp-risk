import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

import { apiLogin, apiLogout, apiMe, type ApiUser } from '../lib/api';

export type UserRole = 'guard' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: UserRole) => Promise<User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  authReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PERMISSIONS: Record<UserRole, string[]> = {
  guard: ['submit_report', 'view_own_reports'],
  admin: [
    'submit_report',
    'view_own_reports',
    'view_all_reports',
    'add_notes',
    'monitor_mitigation',
    'assess_risks',
    'approve_mitigation',
    'manage_master_data',
    'manage_users',
    'view_analytics',
    'generate_reports',
    'close_incidents',
  ],
};

function toUser(u: ApiUser): User {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    fullName: u.fullName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const refreshMe = useCallback(async () => {
    try {
      const me = await apiMe();
      setUser(me ? toUser(me) : null);
    } catch {
      setUser(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = async (username: string, password: string, role: UserRole) => {
    const u = await apiLogin(username, password, role);
    const mapped = toUser(u);
    setUser(mapped);
    return mapped;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return PERMISSIONS[user.role].includes(permission);
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated, hasPermission, authReady }}
    >
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

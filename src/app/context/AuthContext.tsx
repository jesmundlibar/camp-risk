import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'guard' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role-based permissions mapping
const PERMISSIONS = {
  guard: [
    'submit_report',
    'view_own_reports',
  ],
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (username: string, password: string, role: UserRole) => {
    // Frontend prototype - simulate authentication
    // In production: validate credentials with backend JWT authentication

    const userProfiles = {
      guard: { id: '1', username, role: 'guard' as UserRole, fullName: 'Juan dela Cruz' },
      admin: { id: '3', username, role: 'admin' as UserRole, fullName: 'Sir Apollo' },
    };

    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 500));

    setUser(userProfiles[role]);

    // In production: Store JWT token in HTTP-only cookie
    sessionStorage.setItem('user', JSON.stringify(userProfiles[role]));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return PERMISSIONS[user.role].includes(permission);
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, hasPermission }}>
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

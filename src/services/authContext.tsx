import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.ts';
import { api } from './api.ts';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  switchRole: (role: UserRole) => void;
  login: (email: string, password: string, roleOverride?: UserRole) => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    businessName: string;
  }) => Promise<void>;
  logout: () => void;
  verifyPhone: (code: string) => Promise<void>;
  bootstrapSuperAdmin: (payload: {
    bootstrapSecret: string;
    email: string;
    fullName: string;
    password: string;
    phone: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default kernel demo user (Business Owner)
const DEFAULT_USER: User = {
  id: 'usr_owner_demo',
  email: 'owner@dispatchbridge.internal',
  fullName: 'Sarah Chen (Managing Director)',
  role: 'BUSINESS_OWNER',
  phone: '+14155550100',
  businessId: 'biz_horizon_logistics',
  isPhoneVerified: true,
  createdAt: '2026-10-18T07:00:00Z',
};

const ROLE_PRESETS: Record<UserRole, User> = {
  SUPER_ADMIN: {
    id: 'usr_superadmin_active',
    email: 'admin@dispatchbridge.internal',
    fullName: 'Chief Systems Administrator',
    role: 'SUPER_ADMIN',
    phone: '+14155550000',
    businessId: 'biz_platform_root',
    isPhoneVerified: true,
    createdAt: '2026-10-18T06:00:00Z',
  },
  BUSINESS_OWNER: {
    id: 'usr_owner_demo',
    email: 'owner@dispatchbridge.internal',
    fullName: 'Sarah Chen (Managing Director)',
    role: 'BUSINESS_OWNER',
    phone: '+14155550100',
    businessId: 'biz_horizon_logistics',
    isPhoneVerified: true,
    createdAt: '2026-10-18T07:00:00Z',
  },
  SENDER: {
    id: 'usr_sender_demo',
    email: 'warehouse@dispatchbridge.internal',
    fullName: 'Carlos Ramos (Lead Dispatcher)',
    role: 'SENDER',
    phone: '+14155550101',
    businessId: 'biz_horizon_logistics',
    isPhoneVerified: true,
    createdAt: '2026-10-18T07:10:00Z',
  },
  RECEIVER: {
    id: 'usr_receiver_demo',
    email: 'receiving@atlashyper.com',
    fullName: 'David Miller (Dock Receiver)',
    role: 'RECEIVER',
    phone: '+14155552301',
    businessId: 'biz_horizon_logistics',
    isPhoneVerified: true,
    createdAt: '2026-10-18T07:20:00Z',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(false);

  const currentRole: UserRole = currentUser?.role || 'BUSINESS_OWNER';

  const switchRole = (role: UserRole) => {
    const preset = ROLE_PRESETS[role];
    setCurrentUser(preset);
  };

  const login = async (email: string, password: string, roleOverride?: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password, roleOverride });
      setCurrentUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    businessName: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      setCurrentUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const verifyPhone = async (code: string) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const updated = await api.verifyPhone(currentUser.id, code);
      setCurrentUser(updated);
    } finally {
      setIsLoading(false);
    }
  };

  const bootstrapSuperAdmin = async (payload: {
    bootstrapSecret: string;
    email: string;
    fullName: string;
    password: string;
    phone: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await api.bootstrapSuperAdmin(payload);
      setCurrentUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isAuthenticated: !!currentUser,
        isLoading,
        switchRole,
        login,
        register,
        logout,
        verifyPhone,
        bootstrapSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

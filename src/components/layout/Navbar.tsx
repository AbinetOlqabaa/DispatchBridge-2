import React, { useState } from 'react';
import {
  Boxes,
  Shield,
  Truck,
  Users,
  FileText,
  Activity,
  LogOut,
  LogIn,
  ChevronDown,
  Menu,
  X,
  UserCheck,
  Bell,
  Warehouse,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/dispatch.js';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAuth,
  onOpenNotifications,
}) => {
  const { user, logout, quickLoginDemoRole, unreadNotifsCount } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Super Admin
          </span>
        );
      case 'BUSINESS_OWNER':
        return (
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Business Owner
          </span>
        );
      case 'SENDER':
        return (
          <span className="bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Dispatcher / Sender
          </span>
        );
      case 'RECEIVER':
        return (
          <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Receiver / Partner
          </span>
        );
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, show: !!user },
    { id: 'dispatches', label: 'Dispatches', icon: Truck, show: true },
    { id: 'locations', label: 'Origins & Docks', icon: Warehouse, show: !!user && user.role !== 'RECEIVER' },
    { id: 'partners', label: 'Partners', icon: Users, show: !!user && user.role !== 'RECEIVER' },
    { id: 'audit', label: 'Audit Trail', icon: FileText, show: !!user && (user.role === 'SUPER_ADMIN' || user.role === 'BUSINESS_OWNER') },
    { id: 'status', label: 'System Status', icon: Shield, show: true },
  ];

  return (
    <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab(user ? 'dashboard' : 'dispatches')}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Boxes className="w-5 h-5 text-sky-400" />
                </div>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  DispatchBridge
                  <span className="text-[10px] font-medium bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                    B2B KERNEL
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5">
                  Delivery & Reconciliation
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.filter((i) => i.show).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right section: Notification bell, Role switcher & User menu */}
          <div className="hidden md:flex items-center gap-3">
            {/* Notification Bell */}
            {user && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="In-app notification alerts"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </button>
            )}

            {/* Demo Role Quick Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleSwitchOpen(!roleSwitchOpen)}
                className="flex items-center gap-1.5 text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                title="Switch simulated role for testing"
              >
                <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>Simulate Role</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleSwitchOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setRoleSwitchOpen(false)}
                >
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                    Quick Role Sandbox Switcher
                  </div>
                  <button
                    onClick={() => quickLoginDemoRole('BUSINESS_OWNER')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-emerald-400">Business Owner</span>
                    <span className="text-[11px] text-slate-400">Apex Supply Logistics (Eleanor Vance)</span>
                  </button>
                  <button
                    onClick={() => quickLoginDemoRole('SENDER')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-blue-400">Sender / Dispatcher</span>
                    <span className="text-[11px] text-slate-400">Create & dispatch items (Carlos Ruiz)</span>
                  </button>
                  <button
                    onClick={() => quickLoginDemoRole('RECEIVER')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-amber-400">Receiver / Partner</span>
                    <span className="text-[11px] text-slate-400">Metro Retail Receiving (David Miller)</span>
                  </button>
                  <button
                    onClick={() => quickLoginDemoRole('SUPER_ADMIN')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer border-t border-slate-800 mt-1 pt-1.5"
                  >
                    <span className="font-semibold text-purple-400">Super Administrator</span>
                    <span className="text-[11px] text-slate-400">System operator, audit & tenant oversight</span>
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-200">{user.name}</div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    {getRoleBadge(user.role)}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>

          {/* Mobile buttons */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <button
                onClick={onOpenNotifications}
                className="p-2 rounded-lg text-slate-400 hover:text-white relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-6 space-y-3">
          {user ? (
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{user.name}</div>
                <div className="text-xs text-slate-400">{user.businessName}</div>
                <div className="mt-1">{getRoleBadge(user.role)}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg bg-slate-700 text-rose-300 hover:bg-slate-600"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenAuth();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold shadow"
            >
              <LogIn className="w-4 h-4" />
              Sign In or Create Account
            </button>
          )}

          <div className="space-y-1">
            {navItems.filter((i) => i.show).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-700/50' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-800 pt-3">
            <div className="text-xs text-slate-400 font-medium mb-2">Simulate Test Roles:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  quickLoginDemoRole('BUSINESS_OWNER');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700"
              >
                Owner
              </button>
              <button
                onClick={() => {
                  quickLoginDemoRole('SENDER');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700"
              >
                Dispatcher
              </button>
              <button
                onClick={() => {
                  quickLoginDemoRole('RECEIVER');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
              >
                Receiver
              </button>
              <button
                onClick={() => {
                  quickLoginDemoRole('SUPER_ADMIN');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700"
              >
                Super Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

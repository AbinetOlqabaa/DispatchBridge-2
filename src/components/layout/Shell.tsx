import React from 'react';
import {
  Truck,
  ShieldCheck,
  Building2,
  PackageCheck,
  History,
  Activity,
  Layers,
  LogOut,
  LogIn,
  CheckCircle2,
  Smartphone,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../services/authContext.tsx';
import { UserRole } from '../../types/index.ts';

export type ActiveTab = 'dashboard' | 'dispatches' | 'partners' | 'audit' | 'status';

interface ShellProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
  onOpenNewDispatch: () => void;
  children: React.ReactNode;
}

const ROLES_INFO: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />,
    color: 'bg-purple-950/60 border-purple-500/40 text-purple-200',
  },
  BUSINESS_OWNER: {
    label: 'Business Owner',
    icon: <Building2 className="w-3.5 h-3.5 text-indigo-400" />,
    color: 'bg-indigo-950/60 border-indigo-500/40 text-indigo-200',
  },
  SENDER: {
    label: 'Sender (Warehouse)',
    icon: <Truck className="w-3.5 h-3.5 text-amber-400" />,
    color: 'bg-amber-950/60 border-amber-500/40 text-amber-200',
  },
  RECEIVER: {
    label: 'Receiver (Partner)',
    icon: <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />,
    color: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200',
  },
};

export const Shell: React.FC<ShellProps> = ({
  activeTab,
  onSelectTab,
  onOpenAuth,
  onOpenNewDispatch,
  children,
}) => {
  const { currentUser, currentRole, switchRole, logout, isAuthenticated } = useAuth();

  const roleMeta = ROLES_INFO[currentRole];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Kernel State Banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 text-xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 text-slate-300 shrink-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200">DispatchBridge Kernel v0.1</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 hidden sm:inline">PWA Ready &bull; Express Privileged Backend &bull; Tamper-Evident Ledger</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('status')}
            className="text-xs text-indigo-300 hover:text-indigo-200 underline flex items-center gap-1 cursor-pointer"
          >
            <Activity className="w-3 h-3" />
            <span>Setup & Architecture Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">DispatchBridge</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:inline-block">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Delivery Manifest & Reconciliation Platform</p>
            </div>
          </div>

          {/* Quick Role Perspective Switcher (Critical for validating multi-role flow) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
              <span className="text-[11px] text-slate-400 font-medium px-1.5 hidden md:inline">Role view:</span>
              <div className="relative inline-block">
                <select
                  value={currentRole}
                  onChange={(e) => switchRole(e.target.value as UserRole)}
                  className="bg-slate-900 text-slate-200 text-xs py-1 pl-2 pr-6 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none font-medium"
                  aria-label="Switch User Role Perspective"
                >
                  <option value="BUSINESS_OWNER">🏢 Business Owner</option>
                  <option value="SENDER">🚚 Sender (Warehouse)</option>
                  <option value="RECEIVER">📦 Receiver (Partner)</option>
                  <option value="SUPER_ADMIN">🛡️ Super Admin</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>

            {/* User Identity / Sign Out */}
            {isAuthenticated && currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[160px]">{currentUser.fullName}</span>
                  <div className="flex items-center gap-1 justify-end">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded border ${roleMeta.color}`}>
                      {roleMeta.label}
                    </span>
                    {currentUser.isPhoneVerified && (
                      <span className="text-[10px] text-emerald-400 flex items-center" title="Phone verified">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Sign out of current session"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                aria-label="Sign in or register"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 hidden sm:flex items-center gap-1 border-t border-slate-800/60 pt-1">
          <nav className="flex space-x-1" aria-label="Main Navigation">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'dashboard'
                  ? 'border-indigo-500 text-white bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('dispatches')}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'dispatches'
                  ? 'border-indigo-500 text-white bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatches & Reconciliations</span>
            </button>

            <button
              onClick={() => onSelectTab('partners')}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'partners'
                  ? 'border-indigo-500 text-white bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Partners Directory</span>
            </button>

            <button
              onClick={() => onSelectTab('audit')}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'audit'
                  ? 'border-indigo-500 text-white bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Tamper-Evident Audit</span>
            </button>

            <button
              onClick={() => onSelectTab('status')}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                activeTab === 'status'
                  ? 'border-indigo-500 text-white bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Architecture & Status</span>
            </button>
          </nav>

          <div className="ml-auto pb-1">
            <button
              onClick={onOpenNewDispatch}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow shadow-indigo-600/30 transition cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>New Dispatch</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 sm:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (Essential for PWA mobile experience) */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 flex items-center justify-around"
        aria-label="Mobile Navigation"
      >
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] rounded transition cursor-pointer ${
            activeTab === 'dashboard' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => onSelectTab('dispatches')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] rounded transition cursor-pointer ${
            activeTab === 'dispatches' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Dispatches</span>
        </button>

        <button
          onClick={onOpenNewDispatch}
          className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 border-2 border-slate-900 cursor-pointer"
          aria-label="Create New Dispatch"
        >
          <Truck className="w-5 h-5" />
        </button>

        <button
          onClick={() => onSelectTab('partners')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] rounded transition cursor-pointer ${
            activeTab === 'partners' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Partners</span>
        </button>

        <button
          onClick={() => onSelectTab('status')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] rounded transition cursor-pointer ${
            activeTab === 'status' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Status</span>
        </button>
      </nav>
    </div>
  );
};

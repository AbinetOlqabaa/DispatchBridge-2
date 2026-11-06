import React, { useState, useRef, useEffect } from 'react';
import {
  Boxes,
  Truck,
  Activity,
  Warehouse,
  Users,
  Sparkles,
  FileText,
  Shield,
  UserCheck,
  ChevronDown,
  Check,
  Bell,
  Sun,
  Moon,
  Laptop,
  Globe,
  LogOut,
  LogIn,
  Wifi,
  WifiOff,
  RefreshCw,
  BarChart3,
  UserPlus,
  Database,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { UserRole } from '../../types/dispatch.js';
import { useOfflineSync } from '../../utils/offlineSync.js';

interface TabletSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  onOpenOfflineSync?: () => void;
}

export const TabletSidebar: React.FC<TabletSidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAuth,
  onOpenNotifications,
  onOpenProfile,
  onOpenOfflineSync,
}) => {
  const { user, logout, quickLoginDemoRole, unreadNotifsCount } = useAuth();
  const { themeMode, setThemeMode, effectiveTheme } = useTheme();
  const { language, setLanguage, t, languages, currentLanguageOption } = useTranslation();
  const { isOnline, queueCount, isSyncing, replayNow } = useOfflineSync();

  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setRoleSwitchOpen(false);
        setLangDropdownOpen(false);
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t('role.super_admin', 'Super Admin')}
          </span>
        );
      case 'BUSINESS_OWNER':
        return (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t('role.business_owner', 'Business Owner')}
          </span>
        );
      case 'SENDER':
        return (
          <span className="bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t('role.sender', 'Dispatcher / Sender')}
          </span>
        );
      case 'RECEIVER':
        return (
          <span className="bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t('role.receiver', 'Receiver / Partner')}
          </span>
        );
    }
  };

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: Activity, show: !!user },
    { id: 'dispatches', label: t('nav.dispatches', 'Dispatches'), icon: Truck, show: true },
    { id: 'locations', label: t('nav.locations', 'Origins & Docks'), icon: Warehouse, show: !!user && user.role !== 'RECEIVER' },
    { id: 'partners', label: t('nav.partners', 'Partners'), icon: Users, show: !!user && user.role !== 'RECEIVER' },
    { id: 'reports', label: t('nav.reports', 'Reports & Analytics'), icon: BarChart3, show: !!user },
    { id: 'team', label: t('nav.team', 'Team & Members'), icon: UserPlus, show: !!user && (user.role === 'BUSINESS_OWNER' || user.role === 'SUPER_ADMIN') },
    { id: 'recommendations', label: t('nav.recommendations', 'Recommendations'), icon: Sparkles, show: true },
    { id: 'audit', label: t('nav.audit', 'Audit Trail'), icon: FileText, show: !!user && (user.role === 'SUPER_ADMIN' || user.role === 'BUSINESS_OWNER') },
    { id: 'status', label: t('nav.status', 'System Status'), icon: Shield, show: true },
  ];

  return (
    <aside
      ref={sidebarRef}
      className="hidden md:landscape:flex flex-col w-64 shrink-0 bg-white dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 z-30 select-none shadow-sm dark:shadow-xl"
      aria-label="Landscape Navigation Sidebar"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button
          onClick={() => onSelectTab(user ? 'dashboard' : 'dispatches')}
          className="flex items-center gap-3 w-full text-left group focus:outline-none cursor-pointer min-h-[44px]"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Boxes className="w-5 h-5 text-indigo-600 dark:text-sky-400" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white block leading-tight truncate">
              {t('app.name', 'DispatchBridge')}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate -mt-0.5">
              {t('app.subtitle', 'Delivery & Reconciliation')}
            </span>
          </div>
        </button>
      </div>

      {/* Navigation Links (min 44px touch targets) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin">
        {navItems.filter((i) => i.show).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer min-h-[44px] ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold shadow-sm dark:bg-indigo-600/25 dark:text-white dark:border-indigo-500/40'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Role Simulator Quick Switcher */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800/80 shrink-0 relative">
        <button
          onClick={() => {
            setRoleSwitchOpen(!roleSwitchOpen);
            setLangDropdownOpen(false);
            setThemeDropdownOpen(false);
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80 text-xs font-semibold cursor-pointer transition-colors min-h-[44px]"
        >
          <span className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">{t('nav.simulate_role', 'Simulate Role')}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
        </button>

        {roleSwitchOpen && (
          <div className="absolute left-3 right-3 bottom-full mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 mb-1">
              {t('nav.simulate_role', 'Simulate Role')}
            </div>
            <button
              onClick={() => {
                quickLoginDemoRole('BUSINESS_OWNER');
                setRoleSwitchOpen(false);
              }}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col min-h-[44px] justify-center cursor-pointer"
            >
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{t('role.business_owner', 'Business Owner')}</span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('role.desc_owner', 'Apex Supply (Eleanor)')}</span>
            </button>
            <button
              onClick={() => {
                quickLoginDemoRole('SENDER');
                setRoleSwitchOpen(false);
              }}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col min-h-[44px] justify-center cursor-pointer"
            >
              <span className="font-semibold text-blue-700 dark:text-blue-400">{t('role.sender', 'Sender / Dispatcher')}</span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('role.desc_sender', 'Carlos Ruiz')}</span>
            </button>
            <button
              onClick={() => {
                quickLoginDemoRole('RECEIVER');
                setRoleSwitchOpen(false);
              }}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col min-h-[44px] justify-center cursor-pointer"
            >
              <span className="font-semibold text-amber-800 dark:text-amber-400">{t('role.receiver', 'Receiver / Partner')}</span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('role.desc_receiver', 'Metro Retail (David Miller)')}</span>
            </button>
            <button
              onClick={() => {
                quickLoginDemoRole('SUPER_ADMIN');
                setRoleSwitchOpen(false);
              }}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col min-h-[44px] justify-center cursor-pointer border-t border-slate-200 dark:border-slate-800 mt-1 pt-1.5"
            >
              <span className="font-semibold text-purple-700 dark:text-purple-400">{t('role.super_admin', 'Super Administrator')}</span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('role.desc_admin', 'System Operator')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Controls Bar: Language, Theme, Notifications, Offline */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-1 shrink-0">
        {/* Language Selector */}
        <div className="relative flex-1">
          <button
            onClick={() => {
              setLangDropdownOpen(!langDropdownOpen);
              setRoleSwitchOpen(false);
              setThemeDropdownOpen(false);
            }}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80 text-xs font-semibold cursor-pointer min-h-[44px]"
            title={t('nav.select_language', 'Select language')}
            aria-label={t('nav.select_language', 'Select language')}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400 shrink-0" />
            <span className="uppercase text-[11px] font-bold">{currentLanguageOption.shortLabel}</span>
            <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
          </button>

          {langDropdownOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 mb-1">
                {t('nav.language', 'Language')}
              </div>
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code);
                    setLangDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between min-h-[40px] cursor-pointer ${
                    language === l.code ? 'bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-600/30 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <span className="block font-medium">{l.nativeName}</span>
                    <span className="block text-[10px] text-slate-500">{l.label}</span>
                  </div>
                  {language === l.code && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Selector Dropdown (Dark / Light / Device Mode) */}
        <div className="relative">
          <button
            onClick={() => {
              setThemeDropdownOpen(!themeDropdownOpen);
              setLangDropdownOpen(false);
              setRoleSwitchOpen(false);
            }}
            className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer"
            title={`Theme: ${themeMode} (${effectiveTheme})`}
            aria-label="Select theme mode"
          >
            {themeMode === 'system' ? (
              <Laptop className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            ) : effectiveTheme === 'dark' ? (
              <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            )}
          </button>

          {themeDropdownOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 mb-1">
                {t('nav.theme', 'Theme')}
              </div>
              <button
                onClick={() => {
                  setThemeMode('dark');
                  setThemeDropdownOpen(false);
                }}
                className={`w-full text-left px-2 py-2 rounded-lg flex items-center justify-between min-h-[40px] cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-600/30 dark:text-indigo-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>{t('theme.dark', 'Dark Mode')}</span>
                </span>
                {themeMode === 'dark' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>
              <button
                onClick={() => {
                  setThemeMode('light');
                  setThemeDropdownOpen(false);
                }}
                className={`w-full text-left px-2 py-2 rounded-lg flex items-center justify-between min-h-[40px] cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-600/30 dark:text-indigo-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{t('theme.light', 'Light / White Mode')}</span>
                </span>
                {themeMode === 'light' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>
              <button
                onClick={() => {
                  setThemeMode('system');
                  setThemeDropdownOpen(false);
                }}
                className={`w-full text-left px-2 py-2 rounded-lg flex items-center justify-between min-h-[40px] cursor-pointer ${
                  themeMode === 'system'
                    ? 'bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-600/30 dark:text-indigo-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Laptop className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>{t('theme.system', 'Device Mode')}</span>
                </span>
                {themeMode === 'system' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        {user && (
          <button
            onClick={onOpenNotifications}
            className="relative flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer"
            title={t('nav.notifications', 'Notifications')}
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500 animate-pulse" />
            )}
          </button>
        )}
      </div>

      {/* Local-First IndexedDB & Outbox Sync Button */}
      <div className="px-3 pb-2 shrink-0">
        <button
          type="button"
          data-testid="sidebar-offline-sync-btn"
          onClick={() => (onOpenOfflineSync ? onOpenOfflineSync() : replayNow())}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors min-h-[44px] ${
            !isOnline
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:hover:bg-amber-900/80 dark:text-amber-200 dark:border-amber-700'
              : queueCount > 0
              ? 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:hover:bg-teal-900/80 dark:text-teal-200 dark:border-teal-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80'
          }`}
          title={t('offline_sync.title', 'Local-First Storage & Auto-Sync')}
        >
          <span className="flex items-center gap-2 min-w-0">
            {!isOnline ? (
              <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : queueCount > 0 ? (
              <RefreshCw className={`w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            ) : (
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span className="truncate">
              {!isOnline
                ? t('nav.offline', 'Offline ({count} queued)', { count: queueCount })
                : queueCount > 0
                ? t('nav.sync', 'Sync ({count})', { count: queueCount })
                : t('nav.offline_cache', 'IDB Sync')}
            </span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
            {queueCount}
          </span>
        </button>
      </div>

      {/* User Card & Sign In / Out */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0">
        {user ? (
          <div className="space-y-2">
            <button
              onClick={onOpenProfile}
              className="w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800/80 text-left transition-colors cursor-pointer group min-h-[44px]"
              title={t('nav.view_profile_title', 'View / Edit Profile')}
              aria-label={t('nav.view_profile_title', 'View / Edit Profile')}
            >
              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-300 transition-colors truncate">
                  {user.name}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {getRoleBadge(user.role)}
                </div>
              </div>
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-slate-800/70 dark:hover:bg-slate-800 dark:text-rose-300 dark:border-slate-700/70 text-xs font-semibold cursor-pointer transition-colors min-h-[44px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('nav.signout', 'Sign Out')}</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer min-h-[44px]"
          >
            <LogIn className="w-4 h-4" />
            <span>{t('nav.signin', 'Sign In / Register')}</span>
          </button>
        )}
      </div>
    </aside>
  );
};

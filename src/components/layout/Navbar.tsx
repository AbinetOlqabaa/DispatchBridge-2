import React, { useState, useRef, useEffect } from 'react';
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
  Sun,
  Moon,
  Laptop,
  Globe,
  Check,
  Sparkles,
  Wifi,
  WifiOff,
  RefreshCw,
  BarChart3,
  UserPlus,
  Database,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme, ThemeMode } from '../../context/ThemeContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { UserRole } from '../../types/dispatch.js';
import { SupportedLanguage } from '../../i18n/translations.js';
import { useOfflineSync } from '../../utils/offlineSync.js';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  onOpenOfflineSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAuth,
  onOpenNotifications,
  onOpenProfile,
  onOpenOfflineSync,
}) => {
  const { user, logout, quickLoginDemoRole, unreadNotifsCount } = useAuth();
  const { themeMode, setThemeMode, cycleThemeMode, effectiveTheme } = useTheme();
  const { language, setLanguage, t, languages, currentLanguageOption } = useTranslation();
  const { isOnline, queueCount, isSyncing, replayNow } = useOfflineSync();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Close dropdowns on outside click
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setRoleSwitchOpen(false);
        setThemeDropdownOpen(false);
        setLangDropdownOpen(false);
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
          <span className="bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
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
    <nav ref={navRef} className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 w-full max-w-full shadow-xs dark:shadow-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => onSelectTab(user ? 'dashboard' : 'dispatches')}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Boxes className="w-5 h-5 text-indigo-600 dark:text-sky-400" />
                </div>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white block leading-tight">
                  {t('app.name', 'DispatchBridge')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-0.5">
                  {t('app.subtitle', 'Delivery & Reconciliation')}
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Nav Items (xl: >= 1280px) */}
          <div className="hidden xl:flex items-center gap-1 py-1 flex-1 justify-center max-w-4xl px-2 overflow-x-auto scrollbar-none">
            {navItems.filter((i) => i.show).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-slate-800 dark:text-white dark:border-slate-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right section: Theme selector, Language selector, Notifications, Role switcher & User menu */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Theme Selector Dropdown (Dark / Light / Device Mode) */}
            <div className="relative">
              <button
                onClick={() => {
                  setThemeDropdownOpen(!themeDropdownOpen);
                  setLangDropdownOpen(false);
                  setRoleSwitchOpen(false);
                }}
                className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
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
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
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

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setLangDropdownOpen(!langDropdownOpen);
                  setThemeDropdownOpen(false);
                  setRoleSwitchOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-300 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
                title={t('nav.select_language', 'Select language')}
                aria-label={t('nav.select_language', 'Select language')}
              >
                <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  {currentLanguageOption.shortLabel}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
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
                      className={`w-full text-left px-2 py-2 rounded-lg flex items-center justify-between min-h-[40px] cursor-pointer ${
                        language === l.code
                          ? 'bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-600/30 dark:text-indigo-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
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

              {/* Local-First IndexedDB / Outbox Sync Status Button */}
              <button
                type="button"
                data-testid="navbar-offline-sync-btn"
                onClick={() => (onOpenOfflineSync ? onOpenOfflineSync() : replayNow())}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors min-h-[44px] ${
                  !isOnline
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:hover:bg-amber-900/80 dark:text-amber-200 dark:border-amber-700'
                    : queueCount > 0
                    ? 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:hover:bg-teal-900/80 dark:text-teal-200 dark:border-teal-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-300 dark:border-slate-700'
                }`}
                title={t('offline_sync.title', 'Local-First Storage & Auto-Sync')}
                aria-label={t('offline_sync.title', 'Local-First Storage & Auto-Sync')}
              >
                {!isOnline ? (
                  <>
                    <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{t('nav.offline', 'Offline ({count} queued)', { count: queueCount })}</span>
                  </>
                ) : queueCount > 0 ? (
                  <>
                    <RefreshCw className={`w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{t('nav.sync', 'Sync ({count})', { count: queueCount })}</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="hidden lg:inline">{t('nav.offline_cache', 'IDB Sync')}</span>
                  </>
                )}
              </button>

              {/* Notification Bell */}
              {user && (
                <button
                  onClick={onOpenNotifications}
                  className="relative flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                  title={t('nav.notifications', 'In-app notification alerts')}
                  aria-label="View notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500 animate-pulse" />
                  )}
                </button>
              )}

            {/* Demo Role Quick Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setRoleSwitchOpen(!roleSwitchOpen);
                  setThemeDropdownOpen(false);
                  setLangDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-300 dark:border-slate-700 font-semibold cursor-pointer transition-colors min-h-[44px]"
                title={t('nav.switch_role_title', 'Switch simulated role for testing')}
              >
                <UserCheck className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
                <span className="hidden xl:inline">{t('nav.simulate_role', 'Simulate Role')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </button>

              {roleSwitchOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setRoleSwitchOpen(false)}
                >
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 mb-1">
                    {t('nav.simulate_role', 'Quick Role Sandbox Switcher')}
                  </div>
                  <button
                    onClick={() => quickLoginDemoRole('BUSINESS_OWNER')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer min-h-[44px] justify-center"
                  >
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{t('role.business_owner', 'Business Owner')}</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">{t('role.desc_owner', 'Apex Supply Logistics (Eleanor Vance)')}</span>
                  </button>
                  <button
                    onClick={() => quickLoginDemoRole('SENDER')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer min-h-[44px] justify-center"
                  >
                    <span className="font-semibold text-blue-700 dark:text-blue-400">{t('role.sender', 'Sender / Dispatcher')}</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">{t('role.desc_sender', 'Create & dispatch items (Carlos Ruiz)')}</span>
                  </button>
                  <button
                    onClick={() => quickLoginDemoRole('RECEIVER')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer min-h-[44px] justify-center"
                  >
                    <span className="font-semibold text-amber-800 dark:text-amber-400">{t('role.receiver', 'Receiver / Partner')}</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">{t('role.desc_receiver', 'Metro Retail Receiving (David Miller)')}</span>
                  </button>
                  <button
                    onClick={() => quickLoginDemoRole('SUPER_ADMIN')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer border-t border-slate-200 dark:border-slate-800 mt-1 pt-1.5 min-h-[44px] justify-center"
                  >
                    <span className="font-semibold text-purple-700 dark:text-purple-400">{t('role.super_admin', 'Super Administrator')}</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">{t('role.desc_admin', 'System operator, audit & tenant oversight')}</span>
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group text-left min-h-[44px]"
                  title={t('nav.view_profile_title', 'View / Edit Profile')}
                  aria-label={t('nav.view_profile_title', 'View / Edit Profile')}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-300 transition-colors truncate max-w-[85px] xl:max-w-[130px]">{user.name}</div>
                    <div className="flex items-center justify-start gap-1 mt-0.5">
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                </button>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800/80 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center border border-transparent hover:border-rose-200 dark:hover:border-slate-700"
                  title={t('nav.signout', 'Sign Out')}
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap min-h-[44px]"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('nav.signin', 'Sign In')}</span>
              </button>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* Quick theme cycler on mobile (Dark -> Light -> Device Mode) */}
            <button
              onClick={cycleThemeMode}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer"
              title={`Theme: ${themeMode} (${effectiveTheme})`}
              aria-label={`Cycle theme mode (${themeMode})`}
            >
              {themeMode === 'system' ? (
                <Laptop className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              ) : effectiveTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {user && (
              <button
                onClick={onOpenNotifications}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                )}
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tablet Portrait First-Class Navigation Strip (Tablet Landscape uses TabletSidebar) */}
      <div className="relative hidden md:block md:landscape:hidden xl:hidden border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-sm">
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 overflow-x-auto scrollbar-thin w-full">
          {navItems.filter((i) => i.show).map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[44px] shrink-0 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-300 dark:border-indigo-500/40 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-sky-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent" />
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3">
          {/* Mobile Language Selector */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{t('nav.language', 'Language')}</span>
            </span>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                    language === l.code ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {l.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Local-First IndexedDB & Sync Drawer Trigger */}
          {onOpenOfflineSync && (
            <button
              type="button"
              onClick={() => {
                onOpenOfflineSync();
                setMobileMenuOpen(false);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer min-h-[44px]"
            >
              <span className="flex items-center gap-2">
                {!isOnline ? (
                  <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>{t('offline_sync.title', 'Local-First Storage & Auto-Sync')}</span>
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-300">
                {queueCount > 0 ? `${queueCount} queued` : 'IndexedDB'}
              </span>
            </button>
          )}

          {user ? (
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <button
                onClick={() => {
                  onOpenProfile?.();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 text-left cursor-pointer group flex-1 mr-2"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{user.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t(user.businessName)}</div>
                  <div className="mt-1">{getRoleBadge(user.role)}</div>
                </div>
              </button>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg bg-rose-50 text-rose-700 dark:bg-slate-700 dark:text-rose-300 hover:bg-rose-100 shrink-0"
                aria-label="Sign Out"
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
              {t('nav.signin', 'Sign In or Create Account')}
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium min-h-[44px] cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-300 dark:border-indigo-700/50 font-semibold'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">{t('nav.simulate_role', 'Simulate Test Roles')}:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  quickLoginDemoRole('BUSINESS_OWNER');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-emerald-800 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-emerald-300 dark:border-slate-700 cursor-pointer"
              >
                {t('role.business_owner', 'Owner')}
              </button>
              <button
                onClick={() => {
                  quickLoginDemoRole('SENDER');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-800 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-blue-300 dark:border-slate-700 cursor-pointer"
              >
                {t('role.sender', 'Dispatcher')}
              </button>
              <button
                onClick={() => {
                  quickLoginDemoRole('RECEIVER');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-amber-900 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-300 dark:border-slate-700 cursor-pointer"
              >
                {t('role.receiver', 'Receiver')}
              </button>
              <button
                onClick={() => {
                  quickLoginDemoRole('SUPER_ADMIN');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-purple-800 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-purple-300 dark:border-slate-700 cursor-pointer"
              >
                {t('role.super_admin', 'Super Admin')}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

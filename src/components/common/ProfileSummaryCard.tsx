import { User, Building, Smartphone, ShieldCheck, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';

interface ProfileSummaryCardProps {
  onOpenProfile?: () => void;
  className?: string;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({ onOpenProfile, className = '' }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  if (!user) return null;

  const initials = (user.name || user.fullName || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleBadgeColor = () => {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30';
      case 'BUSINESS_OWNER':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30';
      case 'SENDER':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30';
      case 'RECEIVER':
        return 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30';
    }
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-sm p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Avatar or Default Initials */}
        <div className="relative shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-700 via-sky-600 to-indigo-500 flex items-center justify-center text-white text-base font-bold shadow-sm border border-indigo-400/30">
              {initials}
            </div>
          )}
          {user.phoneVerified && (
            <div
              className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900"
              title={t('profile.verified_identity')}
            >
              <CheckCircle2 className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* User Identity Details (Safe: No Raw FAN/FIN) */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{t(user.name)}</h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getRoleBadgeColor()}`}
            >
              {t(`role.${user.role.toLowerCase()}`)}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>{t('profile.fayda_verified')}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
            <span className="flex items-center gap-1 truncate font-medium">
              <Building className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="truncate">{t(user.businessName)}</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 font-semibold">
              <Smartphone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span>{user.maskedPhone || user.phoneNumber}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action to View/Manage Profile */}
      {onOpenProfile && (
        <button
          onClick={onOpenProfile}
          className="self-stretch sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition cursor-pointer shrink-0 min-h-[40px] flex items-center justify-center"
        >
          {t('profile.manage_profile')}
        </button>
      )}
    </div>
  );
};

import React from 'react';
import { DispatchStatus } from '../../types/dispatch.js';
import { useTranslation } from '../../context/LanguageContext.js';

interface StatusBadgeProps {
  status: DispatchStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { t } = useTranslation();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  switch (status) {
    case 'DRAFT':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400"></span>
          {t('status.draft')}
        </span>
      );
    case 'DISPATCHED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></span>
          {t('status.dispatched')}
        </span>
      );
    case 'VIEWED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
          {t('status.viewed')}
        </span>
      );
    case 'IN_TRANSIT':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400"></span>
          {t('status.in_transit')}
        </span>
      );
    case 'PARTIALLY_RECEIVED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400"></span>
          {t('status.shortfall_damage')}
        </span>
      );
    case 'RECEIVED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
          {t('status.received_complete')}
        </span>
      );
    case 'DISCREPANCY_REVIEW':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></span>
          {t('status.discrepancy_review')}
        </span>
      );
    case 'RECONCILED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400"></span>
          {t('status.reconciled')}
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};

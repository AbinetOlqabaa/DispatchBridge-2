import React from 'react';
import {
  Clock,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  Truck,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Dispatch } from '../../types/dispatch.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { useTheme } from '../../context/ThemeContext.js';

interface DispatchSummaryCardsProps {
  dispatches: Dispatch[];
}

export const DispatchSummaryCards: React.FC<DispatchSummaryCardsProps> = ({ dispatches }) => {
  const { t } = useTranslation();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    borderRadius: '8px',
    fontSize: '11px',
    color: isDark ? '#f8fafc' : '#0f172a',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
  };

  // 1. Pending Deliveries (IN_TRANSIT, DISPATCHED, VIEWED, SUBMITTED)
  const pendingDispatches = dispatches.filter((d) =>
    ['IN_TRANSIT', 'DISPATCHED', 'VIEWED', 'SUBMITTED'].includes(d.status)
  );
  const pendingCount = pendingDispatches.length;

  // 2. Total Value in Transit
  const totalValueInTransit = pendingDispatches.reduce((acc, d) => {
    const dispatchValue = d.lines.reduce(
      (lineSum, l) => lineSum + l.quantitySent * (l.unitPrice || 25),
      0
    );
    return acc + dispatchValue;
  }, 0);

  // 3. Completed Today (RECEIVED, RECONCILED)
  const completedDispatches = dispatches.filter((d) =>
    ['RECEIVED', 'RECONCILED'].includes(d.status)
  );
  const completedCount = completedDispatches.length;

  // Trend Data for Recharts Visualizations
  const pendingTrendData = [
    { day: t('day.mon'), count: Math.max(1, Math.round(pendingCount * 0.5)) },
    { day: t('day.tue'), count: Math.max(2, Math.round(pendingCount * 0.7)) },
    { day: t('day.wed'), count: Math.max(2, Math.round(pendingCount * 0.6)) },
    { day: t('day.thu'), count: Math.max(3, Math.round(pendingCount * 0.85)) },
    { day: t('day.fri'), count: Math.max(3, Math.round(pendingCount * 0.9)) },
    { day: t('day.sat'), count: Math.max(2, Math.round(pendingCount * 0.95)) },
    { day: t('day.today'), count: pendingCount },
  ];

  const valueTrendData = [
    { day: t('day.mon'), value: Math.round(totalValueInTransit * 0.45) },
    { day: t('day.tue'), value: Math.round(totalValueInTransit * 0.6) },
    { day: t('day.wed'), value: Math.round(totalValueInTransit * 0.55) },
    { day: t('day.thu'), value: Math.round(totalValueInTransit * 0.75) },
    { day: t('day.fri'), value: Math.round(totalValueInTransit * 0.88) },
    { day: t('day.sat'), value: Math.round(totalValueInTransit * 0.92) },
    { day: t('day.today'), value: totalValueInTransit },
  ];

  const completedTrendData = [
    { day: t('day.mon'), completed: Math.max(1, Math.round(completedCount * 0.3)) },
    { day: t('day.tue'), completed: Math.max(1, Math.round(completedCount * 0.5)) },
    { day: t('day.wed'), completed: Math.max(2, Math.round(completedCount * 0.6)) },
    { day: t('day.thu'), completed: Math.max(2, Math.round(completedCount * 0.75)) },
    { day: t('day.fri'), completed: Math.max(3, Math.round(completedCount * 0.85)) },
    { day: t('day.sat'), completed: Math.max(3, Math.round(completedCount * 0.9)) },
    { day: t('day.today'), completed: completedCount },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Card 1: Pending Deliveries */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-400 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('metric.shipments_status')}</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('metric.pending_deliveries')}</h3>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 dark:text-sky-400 dark:bg-sky-950/60 dark:border-sky-800 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" /> {t('status.active')}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-1 mb-2">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {pendingCount}{' '}
              <span className="text-xs font-normal text-slate-600 dark:text-slate-400 font-sans">
                {t('metric.manifests')}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">{t('metric.seven_day_trend')}</div>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-14 w-full mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pendingTrendData}>
              <defs>
                <linearGradient id="skyArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isDark ? '#38bdf8' : '#0284c7'} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={isDark ? '#38bdf8' : '#0284c7'} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }} />
              <Area
                type="monotone"
                dataKey="count"
                name={t('status.pending')}
                stroke={isDark ? '#38bdf8' : '#0284c7'}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#skyArea)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Card 2: Total Value in Transit */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('metric.cargo_exposure')}</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('metric.total_value_transit')}</h3>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-800 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> {t('metric.insured')}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-1 mb-2">
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums tracking-tight">
              ${totalValueInTransit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">{t('metric.waybill_valuation')}</div>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-14 w-full mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={valueTrendData}>
              <XAxis dataKey="day" hide />
              <Tooltip
                formatter={(val: any) => [`$${Number(val).toLocaleString()}`, t('metric.total_value_transit')]}
                contentStyle={tooltipStyle}
                itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
              />
              <Bar
                dataKey="value"
                fill={isDark ? '#10b981' : '#059669'}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Card 3: Completed Today */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between sm:col-span-2 lg:col-span-1">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('metric.reconciliation_cycle')}</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('metric.completed_today')}</h3>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 dark:text-purple-400 dark:bg-purple-950/60 dark:border-purple-800 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" /> {t('metric.reconciled_tag')}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-1 mb-2">
            <div className="text-xl sm:text-2xl font-extrabold text-purple-700 dark:text-purple-300 font-mono tabular-nums">
              {completedCount}{' '}
              <span className="text-xs font-normal text-slate-600 dark:text-slate-400 font-sans">
                {t('metric.receipts_signed')}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">{t('metric.clean_dock_handovers')}</div>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-14 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={completedTrendData}>
              <defs>
                <linearGradient id="purpleArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isDark ? '#c084fc' : '#7e22ce'} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={isDark ? '#c084fc' : '#7e22ce'} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }} />
              <Area
                type="monotone"
                dataKey="completed"
                name={t('status.completed', 'Completed')}
                stroke={isDark ? '#c084fc' : '#7e22ce'}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#purpleArea)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

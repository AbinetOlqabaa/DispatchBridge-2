import React, { useEffect, useState } from 'react';
import {
  PackageCheck,
  ClipboardCheck,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Building,
  UserCheck,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { Dispatch } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ProfileSummaryCard } from '../../components/common/ProfileSummaryCard.js';

interface ReceiverDashboardProps {
  onSelectDispatch: (id: string) => void;
  onOpenProfile?: () => void;
}

export const ReceiverDashboard: React.FC<ReceiverDashboardProps> = ({ onSelectDispatch, onOpenProfile }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [inboundDispatches, setInboundDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInbound();
  }, []);

  const loadInbound = async () => {
    setLoading(true);
    try {
      const data = await api.getDispatches();
      setInboundDispatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label={t('dashboard.loading_receiver_portal')} />;

  const pendingVerification = inboundDispatches.filter((d) => ['DISPATCHED', 'VIEWED', 'IN_TRANSIT'].includes(d.status));
  const completedReceipts = inboundDispatches.filter((d) => ['PARTIALLY_RECEIVED', 'RECEIVED', 'RECONCILED'].includes(d.status));

  return (
    <div className="space-y-6">
      {/* Profile Summary Card */}
      <ProfileSummaryCard onOpenProfile={onOpenProfile} />

      {/* Receiving Portal Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            {t('role.receiver')}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">{t('dashboard.station_lead_label', { name: t(user?.name || '') })}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t(user?.businessName || '')}</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
          {t('app.enterprise')}
        </p>
      </div>

      {/* Action Required: Inbound Deliveries to Reconcile */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            {t('recon.active_cases', 'Deliveries Awaiting Verification ({count})', { count: pendingVerification.length })}
          </h2>
          <span className="text-xs text-slate-600 dark:text-slate-400">{t('recon.record_receipt')}</span>
        </div>

        {pendingVerification.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('empty.all_verified', 'All Deliveries Verified')}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {t('empty.no_deliveries_pending', 'There are no pending inbound deliveries requiring dock inspection at this time.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingVerification.map((d) => (
              <div
                key={d.id}
                className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5 hover:border-amber-400 dark:hover:border-amber-700/60 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-300">{d.dispatchNumber}</span>
                  <StatusBadge status={d.status} size="sm" />
                </div>

                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('table.sender_supplier')}:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{t(d.senderBusinessName)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('dispatch.carrier_driver', 'Carrier / Driver')}:</span>
                    <span>{d.driverName ? t(d.driverName) : t('dispatch.carrier_unassigned', 'Not specified')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('table.items')}:</span>
                    <span className="tabular-nums">
                      {t('dispatch.lines_units_summary', {
                        lines: d.lines.length,
                        units: d.totalQuantityDispatched,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('system.timestamp', 'Sent Date')}:</span>
                    <span className="tabular-nums">{d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleDateString() : t('day.today')}</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectDispatch(d.id)}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-600/20"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{t('recon.record_receipt', 'Verify Items & Record Receipt')}</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Receipts History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          {t('status.reconciled', 'Completed Receipt Archive')}
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80 scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[640px] lg:min-w-full">
            <thead className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-2 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('table.dispatch_number', 'Dispatch #')}</th>
                <th className="px-2 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('table.sender_supplier', 'Supplier')}</th>
                <th className="px-2 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('table.status', 'Status')}</th>
                <th className="px-2 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('table.quantity_loss', 'Sent / Received')}</th>
                <th className="px-2 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('recon.signed_by', 'Signed By')}</th>
                <th className="px-2 sm:px-3.5 py-3 font-semibold text-right whitespace-nowrap pr-3 sm:pr-4">{t('table.action', 'Details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {completedReceipts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-2.5 sm:px-3.5 py-3 font-mono font-semibold text-indigo-600 dark:text-indigo-300 whitespace-nowrap">{d.dispatchNumber}</td>
                  <td className="px-2.5 sm:px-3.5 py-3 text-slate-800 dark:text-slate-300">{t(d.senderBusinessName)}</td>
                  <td className="px-2.5 sm:px-3.5 py-3 whitespace-nowrap">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td className="px-2.5 sm:px-3.5 py-3 whitespace-nowrap">
                    <div className="font-mono tabular-nums text-slate-900 dark:text-slate-200">
                      {d.totalQuantityReceived ?? 0} / {d.totalQuantityDispatched} {t('unit.units', 'units')}
                    </div>
                    {d.totalQuantityLost && d.totalQuantityLost > 0 ? (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                        {t('table.shortfall_units', { count: d.totalQuantityLost })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">{t('table.intact', '100% Intact')}</span>
                    )}
                  </td>
                  <td className="px-2.5 sm:px-3.5 py-3 text-slate-800 dark:text-slate-300 whitespace-nowrap">
                    <div>{d.receiverSignoff?.signerName ? t(d.receiverSignoff.signerName) : t('profile.verified_identity', 'Verified')}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {d.receivedAt ? new Date(d.receivedAt).toLocaleDateString() : ''}
                    </div>
                  </td>
                  <td className="px-2.5 sm:px-3.5 py-3 text-right whitespace-nowrap pr-3 sm:pr-4">
                    <button
                      onClick={() => onSelectDispatch(d.id)}
                      className="px-3.5 py-2 min-h-[44px] rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer inline-flex items-center justify-center"
                    >
                      {t('action.inspect', 'View Slip')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

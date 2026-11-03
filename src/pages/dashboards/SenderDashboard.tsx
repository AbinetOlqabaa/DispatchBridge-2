import React, { useEffect, useState } from 'react';
import {
  Truck,
  PlusCircle,
  Eye,
  CheckCircle,
  Clock,
  Share2,
  Copy,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { Dispatch } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ProfileSummaryCard } from '../../components/common/ProfileSummaryCard.js';

interface SenderDashboardProps {
  onSelectDispatch: (id: string) => void;
  onCreateDispatch: () => void;
  onOpenPublicLink: (token: string) => void;
  onOpenProfile?: () => void;
}

export const SenderDashboard: React.FC<SenderDashboardProps> = ({
  onSelectDispatch,
  onCreateDispatch,
  onOpenPublicLink,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadDispatches();
  }, []);

  const loadDispatches = async () => {
    setLoading(true);
    try {
      const data = await api.getDispatches();
      setDispatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDispatches = dispatches.filter((d) => {
    const query = searchTerm.toLowerCase();
    return (
      d.dispatchNumber.toLowerCase().includes(query) ||
      d.partnerName.toLowerCase().includes(query) ||
      d.driverName?.toLowerCase().includes(query)
    );
  });

  if (loading) return <LoadingSpinner label={t('dashboard.loading_active_dispatches')} />;

  return (
    <div className="space-y-6">
      {/* Profile Summary Card */}
      <ProfileSummaryCard onOpenProfile={onOpenProfile} />

      {/* Sender Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-950 px-2.5 py-0.5 rounded-full border border-blue-800">
              {t('role.sender')}
            </span>
            <span className="text-xs text-slate-400">{t('dashboard.dispatcher_label', { name: t(user?.name || '') })}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('nav.dispatches')}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('app.enterprise')}
          </p>
        </div>

        <button
          onClick={onCreateDispatch}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('action.create_dispatch')}</span>
        </button>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">{t('status.dispatched')} ({t('status.unviewed')})</div>
          <div className="text-xl font-bold text-blue-400">
            {dispatches.filter((d) => d.status === 'DISPATCHED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{t('status.pending', 'Awaiting partner open')}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">{t('status.viewed')}</div>
          <div className="text-xl font-bold text-indigo-400">
            {dispatches.filter((d) => d.status === 'VIEWED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{t('recon.verified_partner_view', 'List opened by receiver')}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">{t('status.shortfall_damage')}</div>
          <div className="text-xl font-bold text-rose-400">
            {dispatches.filter((d) => d.status === 'PARTIALLY_RECEIVED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{t('metric.recorded_losses', 'Losses recorded')}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">{t('analytics.fully_reconciled')}</div>
          <div className="text-xl font-bold text-emerald-400">
            {dispatches.filter((d) => ['RECEIVED', 'RECONCILED'].includes(d.status)).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{t('status.received_complete', 'Confirmed complete')}</div>
        </div>
      </div>

      {/* Search & Dispatch Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('action.search', 'Filter by DSP number, partner, driver...')}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400">
            {t('metric.out_of_total', { total: dispatches.length })} ({filteredDispatches.length})
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[700px] sm:min-w-[740px] lg:min-w-full">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40 border-b border-slate-800">
              <tr>
                <th className="px-2.5 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('table.dispatch_number', 'Dispatch #')}</th>
                <th className="px-2.5 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('table.destination_partner', 'Destination')}</th>
                <th className="px-2.5 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('table.status', 'Status')}</th>
                <th className="px-2.5 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('table.partner_view', 'Partner View')}</th>
                <th className="px-2.5 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('table.driver_cargo', 'Driver & Cargo')}</th>
                <th className="px-2.5 sm:px-3.5 py-3 font-semibold text-right whitespace-nowrap">{t('table.share_link', 'Share Link')}</th>
                <th className="px-2.5 sm:px-3.5 py-3 font-semibold text-right whitespace-nowrap pr-3.5">{t('action.details', 'Detail')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDispatches.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-2.5 sm:px-3.5 py-3.5 font-mono font-semibold text-indigo-300 whitespace-nowrap">
                    <button
                      onClick={() => onSelectDispatch(d.id)}
                      className="hover:underline text-left cursor-pointer"
                    >
                      {d.dispatchNumber}
                    </button>
                    <div className="text-[10px] text-slate-500">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-2.5 sm:px-3.5 py-3.5 text-slate-200">
                    <div className="font-semibold">{t(d.partnerName)}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{t(d.destinationSnapshot.address)}</div>
                  </td>
                  <td className="px-2.5 sm:px-3.5 py-3.5 whitespace-nowrap">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td className="px-2.5 sm:px-3.5 py-3.5 whitespace-nowrap">
                    {d.firstViewedAt ? (
                      <div className="flex items-center gap-1.5 text-indigo-300">
                        <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div>
                          <div className="font-medium text-[11px]">{t('status.viewed', 'Viewed by Partner')}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(d.firstViewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px]">{t('status.unviewed', 'Unviewed')}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-2.5 sm:px-3.5 py-3.5 text-slate-300 whitespace-nowrap">
                    <div>
                      {d.driverName
                        ? `${t(d.driverName)} (${d.vehicleReg || t('dispatch.truck_fallback')})`
                        : t('dispatch.carrier_unassigned', 'Carrier Unassigned')}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {t('dispatch.line_items_summary', { count: d.lines.length, units: d.totalQuantityDispatched })}
                    </div>
                  </td>
                  <td className="px-2.5 sm:px-3.5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleCopyLink(d.shareToken, d.id)}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                        title={t('table.share_link', 'Copy receiver access link')}
                      >
                        {copiedId === d.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onOpenPublicLink(d.shareToken)}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 cursor-pointer flex items-center justify-center"
                        title={t('dispatch.simulate_partner_view', 'Simulate partner viewing delivery manifest')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2.5 sm:px-3.5 py-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => onSelectDispatch(d.id)}
                      className="px-3 py-2 min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer inline-flex items-center justify-center"
                    >
                      {t('action.inspect', 'Inspect')}
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

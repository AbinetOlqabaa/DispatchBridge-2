import React, { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  User,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { AuditLogEntry } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const AuditPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Compiling tamper-resistant audit logs..." />;

  // Unique list of actors across all logs
  const uniqueActors = Array.from(new Set(logs.map((l) => l.actorName))).filter(Boolean).sort();

  const handleResetFilters = () => {
    setSearchTerm('');
    setActionFilter('ALL');
    setActorFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    actionFilter !== 'ALL' ||
    actorFilter !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesActor = actorFilter === 'ALL' || log.actorName === actorFilter;

    let matchesDate = true;
    if (startDate) {
      const logTime = new Date(log.timestamp).getTime();
      const startTime = new Date(`${startDate}T00:00:00`).getTime();
      if (!isNaN(startTime) && logTime < startTime) {
        matchesDate = false;
      }
    }
    if (endDate && matchesDate) {
      const logTime = new Date(log.timestamp).getTime();
      const endTime = new Date(`${endDate}T23:59:59.999`).getTime();
      if (!isNaN(endTime) && logTime > endTime) {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesAction && matchesActor && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-800">
              {t('system.audit_title', 'Audit & Compliance')}
            </span>
            <span className="text-xs text-slate-400">Append-Only Immutable Ledger</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('nav.audit', 'Tamper-Resistant Audit Trail')}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('system.audit_subtitle', 'Full event history recording dispatch creations, view receipts, dock reconciliations, and logins.')}
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('action.refresh', 'Refresh Ledger')}</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        {/* Multi-Dimensional Filter Suite (Requirement 6) */}
        <div className="space-y-3 pb-3 border-b border-slate-800/80">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search audit descriptions, entity IDs, or actors..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Event Type Filter */}
            <div className="w-full md:w-auto">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                title="Filter by event action type"
              >
                <option value="ALL">{t('audit.all_event_types', 'All Event Types')}</option>
                <option value="DISPATCH_CREATED">{t('action.create_dispatch', 'Dispatch Created')}</option>
                <option value="DISPATCH_VIEWED">{t('status.viewed', 'Dispatch Viewed')}</option>
                <option value="RECEIPT_RECORDED">{t('recon.record_receipt', 'Receipt Recorded')}</option>
                <option value="RECEIPT_DISCREPANCY_RECORDED">{t('recon.shortfall_loss', 'Loss / Shortfall Recorded')}</option>
                <option value="RECONCILIATION_FINALIZED">{t('status.reconciled', 'Reconciliation Closed')}</option>
                <option value="USER_LOGIN">{t('nav.signin', 'User Login')}</option>
              </select>
            </div>

            {/* Actor Filter (Requirement 6) */}
            <div className="w-full md:w-auto">
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                title="Filter by actor"
              >
                <option value="ALL">{t('audit.all_actors', 'All Actors')}</option>
                {uniqueActors.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 flex items-center gap-1 font-medium text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {t('audit.date_range', 'Date Range:')}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  title="Start Date"
                />
                <span className="text-slate-500 text-xs">{t('audit.to', 'to')}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  title="End Date"
                />
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer border border-slate-700"
                >
                  {t('audit.clear_filters', 'Clear Filters')}
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-400">
              {t('audit.showing_count', 'Showing {filtered} of {total} audit entries', {
                filtered: filteredLogs.length,
                total: logs.length,
              })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[820px] lg:min-w-full">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40 border-b border-slate-800">
              <tr>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('system.timestamp', 'Event Timestamp')}</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('system.actor', 'Actor & Role')}</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">{t('system.event_action', 'Action')}</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap min-w-[120px]">{t('audit.entity_col', 'Entity')}</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold min-w-[220px]">{t('system.details', 'Audit Record Summary')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="px-3 sm:px-3.5 py-3 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 sm:px-3.5 py-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-200">{log.actorName}</span>
                    <span className="text-[10px] text-slate-500 block font-sans">Role: {log.actorRole}</span>
                  </td>
                  <td className="px-3 sm:px-3.5 py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 sm:px-3.5 py-3 text-indigo-300 whitespace-nowrap">
                    {log.entityType} ({log.entityId})
                  </td>
                  <td className="px-3 sm:px-3.5 py-3 text-slate-300 font-sans text-xs">
                    {log.details}
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

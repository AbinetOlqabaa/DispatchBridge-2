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
import { AuditLogEntry } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const AuditPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

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

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-800">
              Audit & Compliance
            </span>
            <span className="text-xs text-slate-400">Append-Only Immutable Ledger</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tamper-Resistant Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full event history recording dispatch creations, view receipts, dock reconciliations, and logins.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter audit entries..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Event Types</option>
              <option value="DISPATCH_CREATED">Dispatch Created</option>
              <option value="DISPATCH_VIEWED">Dispatch Viewed</option>
              <option value="RECEIPT_RECORDED">Receipt Recorded</option>
              <option value="RECEIPT_DISCREPANCY_RECORDED">Loss / Shortfall Recorded</option>
              <option value="RECONCILIATION_FINALIZED">Reconciliation Closed</option>
              <option value="USER_LOGIN">User Login</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">Event Timestamp</th>
                <th className="pb-3 font-semibold">Actor & Role</th>
                <th className="pb-3 font-semibold">Action</th>
                <th className="pb-3 font-semibold">Entity</th>
                <th className="pb-3 font-semibold">Audit Record Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="py-3 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-200">{log.actorName}</span>
                    <span className="text-[10px] text-slate-500 block font-sans">Role: {log.actorRole}</span>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 text-indigo-300 whitespace-nowrap">
                    {log.entityType} ({log.entityId})
                  </td>
                  <td className="py-3 text-slate-300 font-sans text-xs">
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

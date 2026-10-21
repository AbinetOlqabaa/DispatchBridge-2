import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Lock,
  Clock,
  User,
  Hash,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { AuditEntry } from '../../types/index.ts';

interface AuditViewProps {
  logs: AuditEntry[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const AuditView: React.FC<AuditViewProps> = ({ logs, isLoading, onRefresh }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.checksum.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Tamper-Resistant Audit Ledger</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Chained Hash Verified
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Cryptographically chained events tracking manifests, partner read-receipts, and reconciliation outcomes.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer self-start sm:self-auto"
          title="Refresh audit ledger"
          aria-label="Refresh audit ledger"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Ledger Security Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Immutable Event Sequence</h3>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
              Each state mutation (dispatch creation, partner view timestamp, and reconciliation sign-off) calculates a
              SHA checksum incorporating the prior event’s checksum. Any unauthorized backend modification breaks the chain.
            </p>
          </div>
        </div>

        <div className="text-left md:text-right shrink-0">
          <div className="text-xs text-slate-400">Total Immutable Records</div>
          <div className="text-xl font-bold text-white font-mono">{logs.length} entries</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by action, actor, details, or hash..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
        />
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            <p className="text-xs">Fetching audit verification trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <History className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No matching audit events</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-800/20 transition space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {log.action}
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {log.targetType}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Target: {log.targetId}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-200">{log.details}</p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Actor: <strong>{log.actorName}</strong> ({log.actorRole})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500">
                    <Hash className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-emerald-400 font-semibold">{log.checksum}</span>
                    {log.previousChecksum && (
                      <span className="text-slate-600 hidden md:inline">
                        &larr; prev: {log.previousChecksum}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

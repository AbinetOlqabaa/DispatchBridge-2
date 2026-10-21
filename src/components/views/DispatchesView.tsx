import React, { useState } from 'react';
import {
  Truck,
  Search,
  Filter,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Dispatch, DispatchStatus } from '../../types/index.ts';
import { useAuth } from '../../services/authContext.tsx';

interface DispatchesViewProps {
  dispatches: Dispatch[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenNewDispatch: () => void;
  onSelectDispatch: (dispatch: Dispatch) => void;
}

export const DispatchesView: React.FC<DispatchesViewProps> = ({
  dispatches,
  isLoading,
  onRefresh,
  onOpenNewDispatch,
  onSelectDispatch,
}) => {
  const { currentRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DispatchStatus>('ALL');

  const filteredDispatches = dispatches.filter((d) => {
    const matchesSearch =
      d.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.destinationLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Dispatches & Deliveries</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Track goods sent, detect partner manifest views, and inspect itemized reconciliation outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
            title="Refresh list"
            aria-label="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenNewDispatch}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Dispatch</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracking code, partner, driver..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({dispatches.length})
          </button>
          <button
            onClick={() => setStatusFilter('IN_TRANSIT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
              statusFilter === 'IN_TRANSIT'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            In Transit ({dispatches.filter((d) => d.status === 'IN_TRANSIT').length})
          </button>
          <button
            onClick={() => setStatusFilter('VIEWED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
              statusFilter === 'VIEWED'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Viewed by Partner ({dispatches.filter((d) => d.status === 'VIEWED').length})
          </button>
          <button
            onClick={() => setStatusFilter('RECONCILED_MATCH')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
              statusFilter === 'RECONCILED_MATCH'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Matched Clean ({dispatches.filter((d) => d.status === 'RECONCILED_MATCH').length})
          </button>
          <button
            onClick={() => setStatusFilter('RECONCILED_DISCREPANCY')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
              statusFilter === 'RECONCILED_DISCREPANCY'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Discrepancies ({dispatches.filter((d) => d.status === 'RECONCILED_DISCREPANCY').length})
          </button>
        </div>
      </div>

      {/* Dispatches List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
          <p className="text-xs">Loading dispatch records from server...</p>
        </div>
      ) : filteredDispatches.length === 0 ? (
        <div className="py-16 text-center text-slate-400 border border-dashed border-slate-800 rounded-2xl">
          <Truck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-300">No matching dispatches</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your filter or search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredDispatches.map((d) => (
            <div
              key={d.id}
              onClick={() => onSelectDispatch(d)}
              className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-4 sm:p-5 rounded-2xl transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                    {d.trackingCode}
                  </span>

                  {d.status === 'IN_TRANSIT' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> IN TRANSIT
                    </span>
                  )}
                  {d.status === 'VIEWED' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" /> PARTNER VIEWED
                    </span>
                  )}
                  {d.status === 'RECONCILED_MATCH' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> RECONCILED (100% MATCH)
                    </span>
                  )}
                  {d.status === 'RECONCILED_DISCREPANCY' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> RECONCILED (SHORTAGE/LOSS)
                    </span>
                  )}

                  <span className="text-[11px] text-slate-500">
                    Dispatched {new Date(d.dispatchedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-200 transition">
                    {d.partnerName}
                  </h3>
                  <span className="text-xs text-slate-400 font-normal">
                    &bull; From: {d.originLocation}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Destination: <strong className="text-slate-300">{d.destinationLocation}</strong></span>
                  <span>Driver: <strong className="text-slate-300">{d.driverName}</strong> ({d.driverPhone})</span>
                  <span>Vehicle: <strong className="text-slate-300 font-mono">{d.vehiclePlate}</strong></span>
                </div>

                {/* Specific Real-Time Partner View Audit Notice */}
                {d.viewedAt && (
                  <div className="text-xs text-blue-300/90 flex items-center gap-1.5 bg-blue-950/30 px-2.5 py-1 rounded-lg border border-blue-500/20 w-fit">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      Manifest opened by <strong>{d.viewedByName || 'Recipient'}</strong> at{' '}
                      {new Date(d.viewedAt).toLocaleTimeString()} ({new Date(d.viewedAt).toLocaleDateString()})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-800 shrink-0 gap-2">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-200">
                    {d.items?.length || 0} line items
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {d.totals?.totalDispatchedQty || 0} units sent
                  </div>
                  {d.totals?.totalLossAmount > 0 && (
                    <div className="text-xs font-bold text-rose-400">
                      -${d.totals.totalLossAmount.toLocaleString()} USD loss
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover:text-indigo-300">
                  <span>
                    {currentRole === 'RECEIVER' && (d.status === 'IN_TRANSIT' || d.status === 'VIEWED')
                      ? 'Reconcile Cargo'
                      : 'View Manifest'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

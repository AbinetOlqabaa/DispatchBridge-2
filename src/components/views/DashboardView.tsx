import React from 'react';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  TrendingDown,
  Building2,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Dispatch, Partner, UserRole } from '../../types/index.ts';
import { useAuth } from '../../services/authContext.tsx';

interface DashboardViewProps {
  dispatches: Dispatch[];
  partners: Partner[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenNewDispatch: () => void;
  onSelectDispatch: (dispatch: Dispatch) => void;
  onGoToDispatches: () => void;
  onGoToPartners: () => void;
  onGoToStatus: () => void;
  onOpenBootstrapAdmin: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dispatches,
  partners,
  isLoading,
  onRefresh,
  onOpenNewDispatch,
  onSelectDispatch,
  onGoToDispatches,
  onGoToPartners,
  onGoToStatus,
  onOpenBootstrapAdmin,
}) => {
  const { currentRole, currentUser } = useAuth();

  // Aggregate metrics
  const totalDispatches = dispatches.length;
  const inTransitCount = dispatches.filter((d) => d.status === 'IN_TRANSIT').length;
  const viewedCount = dispatches.filter((d) => d.status === 'VIEWED').length;
  const reconciledMatchCount = dispatches.filter((d) => d.status === 'RECONCILED_MATCH').length;
  const reconciledDiscrepancyCount = dispatches.filter((d) => d.status === 'RECONCILED_DISCREPANCY').length;

  const totalLoss = dispatches.reduce((acc, d) => acc + (d.totals?.totalLossAmount || 0), 0);
  const totalDispatchedUnits = dispatches.reduce((acc, d) => acc + (d.totals?.totalDispatchedQty || 0), 0);
  const totalReceivedUnits = dispatches.reduce((acc, d) => acc + (d.totals?.totalReceivedQty || 0), 0);

  const overallLossRate =
    totalDispatchedUnits > 0
      ? (((totalDispatchedUnits - totalReceivedUnits) / totalDispatchedUnits) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Role-Specific Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Role: {currentRole}
            </span>
            <span className="text-xs text-slate-400">Authenticated as {currentUser?.fullName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
            {currentRole === 'SUPER_ADMIN' && 'System Health & Security Control Center'}
            {currentRole === 'BUSINESS_OWNER' && 'Enterprise Dispatch & Loss Reconciliation'}
            {currentRole === 'SENDER' && 'Warehouse Dispatch & Cargo Transit Pipeline'}
            {currentRole === 'RECEIVER' && 'Inbound Delivery Check-In & Verification Terminal'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            {currentRole === 'SUPER_ADMIN' &&
              'Monitor tenant compliance, privileged server API execution, and cryptographically verified audit records.'}
            {currentRole === 'BUSINESS_OWNER' &&
              'Monitor cross-partner transit operations, review quantity discrepancies, and analyze cargo losses across all distribution hubs.'}
            {currentRole === 'SENDER' &&
              'Dispatch cargo with itemized manifests, track carrier vehicles, and receive verified read-receipts when partners open delivery lists.'}
            {currentRole === 'RECEIVER' &&
              'Review incoming consignments, verify delivered unit counts against manifest records, and report damaged or missing inventory.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs cursor-pointer"
            title="Refresh latest updates"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {(currentRole === 'BUSINESS_OWNER' || currentRole === 'SENDER') && (
            <button
              onClick={onOpenNewDispatch}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Create Dispatch</span>
            </button>
          )}

          {currentRole === 'SUPER_ADMIN' && (
            <button
              onClick={onOpenBootstrapAdmin}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Bootstrap Super Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Dispatches</span>
            <Truck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{totalDispatches}</span>
            <span className="text-[11px] text-slate-400 font-mono">manifests</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-amber-400 font-semibold">{inTransitCount}</span> in transit &bull;{' '}
            <span className="text-blue-400 font-semibold">{viewedCount}</span> viewed
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Reconciled Clean</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{reconciledMatchCount}</span>
            <span className="text-[11px] text-slate-400 font-mono">100% matched</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Zero losses recorded</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Discrepancy / Shortage</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">{reconciledDiscrepancyCount}</span>
            <span className="text-[11px] text-slate-400 font-mono">flagged</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Requires loss adjustment</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Cargo Loss Valuation</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400">${totalLoss.toLocaleString()}</span>
            <span className="text-[11px] text-slate-400 font-mono">USD</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">{overallLossRate}% unit variance</div>
        </div>
      </div>

      {/* Receiver Quick Action Banner (When in Receiver mode) */}
      {currentRole === 'RECEIVER' && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-200">Receiver Inspection Station</h3>
              <p className="text-xs text-slate-300">
                Click any pending or viewed dispatch below to review quantities, inspect goods on the dock, and submit
                verified receipt outcomes with notes and digital signature.
              </p>
            </div>
          </div>
          <button
            onClick={onGoToDispatches}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap cursor-pointer transition shadow"
          >
            Review Inbound Cargo
          </button>
        </div>
      )}

      {/* Main Content Grid: Recent Dispatches & Partners Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dispatches Table / Cards */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Live Dispatches & Reconciliations</h2>
              <p className="text-xs text-slate-400">Real-time carrier manifests with partner view tracking</p>
            </div>
            <button
              onClick={onGoToDispatches}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs">Loading dispatch records from server...</p>
            </div>
          ) : dispatches.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
              <Truck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">No dispatches found</p>
              <p className="text-xs text-slate-500 mt-1">Create your first delivery manifest to get started.</p>
              <button
                onClick={onOpenNewDispatch}
                className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
              >
                Create Dispatch
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dispatches.slice(0, 5).map((d) => (
                <div
                  key={d.id}
                  onClick={() => onSelectDispatch(d)}
                  className="p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-300">{d.trackingCode}</span>
                      {d.status === 'IN_TRANSIT' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> In Transit
                        </span>
                      )}
                      {d.status === 'VIEWED' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" /> Viewed by Partner
                        </span>
                      )}
                      {d.status === 'RECONCILED_MATCH' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Reconciled (100% Match)
                        </span>
                      )}
                      {d.status === 'RECONCILED_DISCREPANCY' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Discrepancy Flagged
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-200 font-semibold">{d.partnerName}</div>
                    <div className="text-[11px] text-slate-400">
                      Destination: <span className="text-slate-300">{d.destinationLocation}</span> &bull; Driver:{' '}
                      <span className="text-slate-300">{d.driverName}</span>
                    </div>

                    {/* Partner Viewed indicator (Core product requirement) */}
                    {d.viewedAt && (
                      <div className="text-[11px] text-blue-300/90 flex items-center gap-1 pt-0.5 font-medium">
                        <Eye className="w-3 h-3 text-blue-400" />
                        <span>
                          Opened by {d.viewedByName || 'Partner'} on {new Date(d.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/60 shrink-0">
                    <span className="text-xs text-slate-300 font-medium">
                      {d.items?.length || 0} line items ({d.totals?.totalDispatchedQty || 0} units)
                    </span>
                    {d.totals?.totalLossAmount > 0 && (
                      <span className="text-xs font-semibold text-rose-400">
                        -${d.totals.totalLossAmount.toLocaleString()} loss
                      </span>
                    )}
                    <span className="text-[11px] text-indigo-400 group-hover:translate-x-0.5 transition flex items-center gap-1">
                      Inspect &gt;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Partners & Architecture Health */}
        <div className="space-y-6">
          {/* Partners Quick List */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Registered Partners</h3>
                <p className="text-[11px] text-slate-400">Recipients, haulers & suppliers</p>
              </div>
              <button
                onClick={onGoToPartners}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Directory
              </button>
            </div>

            <div className="space-y-2">
              {partners.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>{p.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                      {p.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Contact: {p.contactPerson} &bull; {p.phone}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture Status Widget */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 rounded-2xl border border-slate-800 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Architecture & Verification</h3>
            </div>
            <p className="text-xs text-slate-300">
              Running live full-stack kernel on container web layer (Responsive PWA). Native Android APK compilation is not available in this container environment.
            </p>
            <div className="text-[11px] space-y-1 text-slate-400 font-mono">
              <div className="flex items-center justify-between">
                <span>Persistence Adapter:</span>
                <span className="text-emerald-400 font-semibold">Local Express Ledger</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tamper Evidence:</span>
                <span className="text-emerald-400 font-semibold">Chained SHA Hashing</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Privilege Security:</span>
                <span className="text-emerald-400 font-semibold">Server-Enforced</span>
              </div>
            </div>
            <button
              onClick={onGoToStatus}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 hover:text-white text-xs font-semibold text-center transition cursor-pointer"
            >
              Inspect Diagnostic Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

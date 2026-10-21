import React, { useEffect, useState } from 'react';
import {
  Activity,
  ShieldCheck,
  Smartphone,
  Server,
  Database,
  Lock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Layers,
  Key,
} from 'lucide-react';
import { SystemDiagnostic } from '../../types/index.ts';
import { api } from '../../services/api.ts';

export const SystemStatusView: React.FC = () => {
  const [diagnostic, setDiagnostic] = useState<SystemDiagnostic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSystemStatus();
      setDiagnostic(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch diagnostic state.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">System Architecture & Diagnostic Center</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Kernel v0.1
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Transparent disclosure of connected layers, mock/local adapters, and production readiness requirements.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer self-start sm:self-auto"
          title="Refresh diagnostics"
          aria-label="Refresh diagnostics"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
          {error}
        </div>
      )}

      {/* Grid of Key Subsystems */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Platform Assessment Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Web PWA
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">Environment & Platform</h3>
            <p className="text-xs text-slate-300 mt-1">
              <strong>Container Web Application (Responsive Mobile-First PWA)</strong>
            </p>
          </div>

          <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Native Android APK is NOT supported in this container.</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Inspection evidence: Workspace is a Node.js/Vite environment lacking Android SDK, Gradle, and Java runtime
              required for compilation. PWA installability is provided via <code className="text-slate-300">manifest.json</code> and{' '}
              <code className="text-slate-300">sw.js</code>.
            </p>
          </div>
        </div>

        {/* Backend & Security Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Server className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Express API
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">Privileged Server Operations</h3>
            <p className="text-xs text-slate-300 mt-1">
              <strong>Server-Side Enforced Endpoints (/api/*)</strong>
            </p>
          </div>

          <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Role checks enforced server-side.</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Idempotency token validation active.</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>No secrets or service accounts in client bundle.</span>
            </div>
          </div>
        </div>

        {/* Persistence Adapter Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Local Ledger
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">Persistence & Audit Adapter</h3>
            <p className="text-xs text-slate-300 mt-1">
              <strong>In-Memory Adapter with Cryptographic Hash Chaining</strong>
            </p>
          </div>

          <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span>Dispatches in memory:</span>
              <span className="text-slate-200 font-mono font-bold">
                {diagnostic?.storageRecordCount.dispatches ?? '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Partners registered:</span>
              <span className="text-slate-200 font-mono font-bold">
                {diagnostic?.storageRecordCount.partners ?? '...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Audit events chained:</span>
              <span className="text-slate-200 font-mono font-bold">
                {diagnostic?.storageRecordCount.auditLogs ?? '...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Production Readiness Roadmap & Remaining Configuration */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          <span>Production Migration Roadmap (Stage 2 Integration Points)</span>
        </h3>
        <p className="text-xs text-slate-300">
          The application kernel has decoupled data models and service adapters ready for persistent cloud infrastructure:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Cloud Firestore Database Migration</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Replace the in-memory maps in <code className="text-indigo-300">server.ts</code> with Firestore collections
              (<code className="text-slate-300">dispatches</code>, <code className="text-slate-300">partners</code>,{' '}
              <code className="text-slate-300">audit_logs</code>) via the Firebase Admin SDK once Firebase is provisioned.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>SMS Gateway Integration</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Bind Twilio or AWS SNS credentials to dispatch real SMS delivery notifications and OTP verification codes
              to driver and receiving supervisor phone numbers.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Firebase App Check Attestation</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Enforce client token attestation on server endpoints to verify all incoming dispatch calls originate from
              genuine, untampered web client instances.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Super Administrator Provisioning Ceremony</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Zero hardcoded passwords. The first super-admin is established exclusively via the server-side one-time setup
              endpoint (<code className="text-indigo-300">/api/auth/bootstrap-superadmin</code>) requiring the server bootstrap secret.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  X,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  CloudUpload,
} from 'lucide-react';
import { useOfflineSync } from '../../utils/offlineSync.js';
import { useTranslation } from '../../context/LanguageContext.js';

interface OfflineSyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSyncDrawer: React.FC<OfflineSyncDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const {
    isOnline,
    isSimulatedOffline,
    setSimulatedOffline,
    queue,
    queueCount,
    stats,
    isSyncing,
    lastSyncSummary,
    replayNow,
    removeItem,
    clearQueue,
  } = useOfflineSync();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-hidden">
      <div
        data-testid="offline-sync-drawer"
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col"
      >
        {/* Pinned Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isOnline
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/70 dark:border-emerald-700/60 dark:text-emerald-400'
                  : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/70 dark:border-amber-700/60 dark:text-amber-400'
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('offline_sync.title', 'Local-First Storage & Auto-Sync')}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                  {stats.storageEngine}
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isOnline
                  ? t(
                      'offline_sync.status_online_desc',
                      'Connected • Manifests cached locally in IndexedDB; queued field updates auto-sync.'
                    )
                  : t(
                      'offline_sync.status_offline_desc',
                      'Offline Mode • Delivery updates save to IndexedDB and sync automatically on reconnect.'
                    )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('action.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Storage & Sync Telemetry Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="truncate">{t('offline_sync.cached_manifests', 'Cached Manifests')}</span>
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {stats.cachedDispatchCount}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <CloudUpload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">{t('offline_sync.pending_updates', 'Pending Outbox')}</span>
              </div>
              <div
                className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                  queueCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {queueCount}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">{t('offline_sync.last_sync', 'Last Synced')}</span>
              </div>
              <div className="text-xs font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200 mt-1.5 truncate">
                {stats.lastSyncedAt
                  ? new Date(stats.lastSyncedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : t('offline_sync.just_now', 'Ready')}
              </div>
            </div>
          </div>

          {/* Connectivity & Sync Controls */}
          <div className="bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {t('offline_sync.field_mode_title', 'Field Connectivity Simulation')}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                {t(
                  'offline_sync.field_mode_desc',
                  'Test logging scans or dock receipts in dead zones; switching back Online auto-syncs.'
                )}
              </div>
            </div>

            <button
              type="button"
              data-testid="toggle-field-offline-btn"
              onClick={() => setSimulatedOffline(!isSimulatedOffline)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[44px] shrink-0 border ${
                isSimulatedOffline
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700 dark:hover:bg-amber-900'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700'
              }`}
            >
              {isSimulatedOffline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('offline_sync.go_online_sync', 'Reconnect & Auto-Sync')}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>{t('offline_sync.work_offline_btn', 'Work Offline (Test Queue)')}</span>
                </>
              )}
            </button>
          </div>

          {/* Auto-Sync Feedback Banner */}
          {lastSyncSummary && lastSyncSummary.synced > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {t(
                  'offline_sync.synced_toast',
                  'Automatically synchronized {count} queued update(s) from IndexedDB to server.',
                  { count: lastSyncSummary.synced }
                )}
              </span>
            </div>
          )}

          {/* Queued Offline Delivery Updates List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t('offline_sync.outbox_queue_title', 'IndexedDB Delivery Update Outbox ({count})', {
                  count: queueCount,
                })}
              </h3>
              {queueCount > 0 && (
                <button
                  type="button"
                  onClick={() => clearQueue()}
                  className="text-[11px] font-medium text-rose-700 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer px-2 py-1 rounded min-h-[36px]"
                >
                  {t('offline_sync.clear_all', 'Clear Outbox')}
                </button>
              )}
            </div>

            {queueCount === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center space-y-1.5">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  {t('offline_sync.all_synced_title', 'All Delivery Updates Synchronized')}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {t(
                    'offline_sync.all_synced_desc',
                    'Zero pending mutations in IndexedDB. Any updates logged while offline will appear here until synced.'
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 text-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.dispatchNumber && (
                          <span className="font-mono font-bold text-indigo-700 dark:text-sky-400">
                            {item.dispatchNumber}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            item.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                              : item.status === 'SYNCING'
                              ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
                              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {t('status.' + item.status.toLowerCase(), item.status)}
                        </span>
                        <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {new Date(item.queuedAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="font-semibold text-slate-900 dark:text-white">{item.actionSummary}</div>

                      {item.errorMessage && (
                        <div className="text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.errorMessage}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800 cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title={t('offline_sync.remove_entry', 'Remove queued update')}
                      aria-label={t('offline_sync.remove_entry', 'Remove queued update')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pinned Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer min-h-[44px]"
          >
            {t('action.close', 'Close')}
          </button>

          <button
            type="button"
            onClick={() => replayNow()}
            disabled={!isOnline || queueCount === 0 || isSyncing}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer min-h-[44px] shadow-md shadow-indigo-600/20"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? t('offline_sync.syncing_now', 'Synchronizing...')
                : t('offline_sync.sync_now_btn', 'Sync Now ({count})', { count: queueCount })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

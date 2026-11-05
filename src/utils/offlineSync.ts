/**
 * Local-First Offline Sync & Outbox Queue Manager backed by IndexedDB
 * Allows field staff to inspect manifests and log delivery updates (transit scans,
 * GPS telemetry pings, dock receipt confirmations, and draft dispatches) while offline,
 * persisting state in IndexedDB and automatically syncing FIFO when connectivity returns.
 */

import { useState, useEffect, useCallback } from 'react';
import { Dispatch, User } from '../types/dispatch.js';
import {
  OfflineMutationType,
  OfflineQueueItem,
  LocalFirstStats,
  buildOfflineDraftDispatch,
  cacheSingleDispatchInDb,
  clearOutboxInDb,
  deleteOutboxItemFromDb,
  getActiveStorageBackend,
  getCachedReferenceDataFromDb,
  getLocalFirstStats,
  getOutboxItemsFromDb,
  getRawCachedDispatchRecord,
  nextOutboxSeq,
  projectDispatchFromBaseAndOutbox,
  putOutboxItemInDb,
  recordLastSyncTimestampInDb,
  removeDispatchFromDb,
  saveCachedDispatchRecordInDb,
} from './indexedDbStore.js';
import { saveMapCache, clearOfflineTelemetryQueue, queueOfflineTelemetry } from './mapCache.js';

export type { OfflineQueueItem, OfflineMutationType, LocalFirstStats };

const SIMULATED_OFFLINE_KEY = 'dispatchbridge_simulated_offline';
const PRIMARY_TOKEN_KEY = 'dispatchbridge_auth_token';
const LEGACY_TOKEN_KEY = 'dispatchbridge_token';
const AUTH_USER_KEY = 'dispatchbridge_auth_user';

let memorySimulatedOffline = false;
let activeReplayPromise: Promise<{ synced: number; failed: number; syncedDispatchIds: string[] }> | null = null;
let autoSyncIntervalStarted = false;

function readAuthToken(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (
        window.localStorage.getItem(PRIMARY_TOKEN_KEY) ||
        window.localStorage.getItem(LEGACY_TOKEN_KEY)
      );
    }
  } catch {
    // ignore
  }
  return null;
}

function readCurrentStoredUser(): User | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(AUTH_USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    }
  } catch {
    // ignore
  }
  return null;
}

export function isSimulatedOfflineActive(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
    }
  } catch {
    // ignore
  }
  return memorySimulatedOffline;
}

export function isEffectivelyOffline(): boolean {
  const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return browserOffline || isSimulatedOfflineActive();
}

export function setSimulatedOffline(
  offline: boolean,
  options?: { autoSync?: boolean }
): void {
  const wasOffline = isEffectivelyOffline();
  memorySimulatedOffline = offline;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (offline) {
        window.localStorage.setItem(SIMULATED_OFFLINE_KEY, 'true');
      } else {
        window.localStorage.removeItem(SIMULATED_OFFLINE_KEY);
      }
    }
  } catch {
    // ignore
  }

  emitOfflineSyncEvent();

  const shouldAutoSync = options?.autoSync !== false;
  const nowOnline = !isEffectivelyOffline();
  if (wasOffline && nowOnline && shouldAutoSync) {
    replayOfflineQueue().catch((err) => {
      console.warn('[OfflineSync] Auto-replay on reconnect warning:', err);
    });
  }
}

export function emitOfflineSyncEvent(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('dispatchbridge_offline_sync'));
  }
}

export interface EnqueueOfflineUpdateParams {
  type: OfflineMutationType;
  dispatchId?: string;
  dispatchNumber?: string;
  actionSummary: string;
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  payload: any;
  idempotencyKey?: string;
  baseDispatch?: Dispatch | null;
  currentUser?: User | null;
}

export interface EnqueueOfflineUpdateResult {
  queueItem: OfflineQueueItem;
  optimisticDispatch: Dispatch | null;
}

/**
 * Persists an offline delivery update or draft dispatch into IndexedDB `syncOutbox`
 * and optimistically updates the cached Dispatch record in IndexedDB `dispatches` store.
 */
export async function enqueueOfflineDeliveryUpdate(
  params: EnqueueOfflineUpdateParams
): Promise<EnqueueOfflineUpdateResult> {
  const backend = getActiveStorageBackend();
  const now = new Date().toISOString();
  const seq = nextOutboxSeq();
  const id = `off_${seq}_${Math.random().toString(36).substring(2, 7)}`;
  const idempotencyKey = params.idempotencyKey || `idem_${id}`;

  const dispatchId =
    params.type === 'CREATE_DISPATCH'
      ? params.dispatchId || `off_dsp_${seq}_${Math.random().toString(36).substring(2, 6)}`
      : params.dispatchId;

  const queueItem: OfflineQueueItem = {
    id,
    seq,
    type: params.type,
    dispatchId,
    dispatchNumber: params.dispatchNumber,
    actionSummary: params.actionSummary,
    url: params.url,
    method: params.method || 'POST',
    payload: params.payload,
    idempotencyKey,
    queuedAt: now,
    status: 'PENDING',
    attempts: 0,
  };

  await putOutboxItemInDb(queueItem, backend);

  let optimisticDispatch: Dispatch | null = null;

  if (params.type === 'CREATE_DISPATCH') {
    const partners = await getCachedReferenceDataFromDb<any>('partners', backend);
    const user = params.currentUser ?? readCurrentStoredUser();
    const draftDispatch = buildOfflineDraftDispatch(queueItem, user, partners || undefined);
    optimisticDispatch = draftDispatch;
    await saveCachedDispatchRecordInDb(
      {
        id: draftDispatch.id,
        serverDispatch: draftDispatch,
        dispatch: draftDispatch,
        cachedAt: now,
        hasPendingSync: true,
      },
      backend
    );
    try {
      saveMapCache(draftDispatch);
    } catch {
      // ignore
    }
  } else if (dispatchId) {
    if (params.type === 'TELEMETRY_UPDATE') {
      try {
        queueOfflineTelemetry(dispatchId, params.payload);
      } catch {
        // ignore
      }
    }

    const rawRecord = await getRawCachedDispatchRecord(dispatchId, backend);
    const cleanBase = rawRecord?.serverDispatch || rawRecord?.dispatch || params.baseDispatch;

    if (cleanBase) {
      const sortedOutbox = await getOutboxItemsFromDb(backend);
      const { projected } = projectDispatchFromBaseAndOutbox(cleanBase, sortedOutbox);
      optimisticDispatch = projected;

      await saveCachedDispatchRecordInDb(
        {
          id: dispatchId,
          serverDispatch: cleanBase,
          dispatch: projected,
          cachedAt: rawRecord?.cachedAt || now,
          hasPendingSync: true,
        },
        backend
      );
      try {
        saveMapCache(projected);
      } catch {
        // ignore
      }
    }
  }

  emitOfflineSyncEvent();
  return { queueItem, optimisticDispatch };
}

export async function removeOfflineQueueItem(id: string): Promise<void> {
  const backend = getActiveStorageBackend();
  const outbox = await getOutboxItemsFromDb(backend);
  const target = outbox.find((i) => i.id === id);
  await deleteOutboxItemFromDb(id, backend);
  if (target?.type === 'CREATE_DISPATCH' && target.dispatchId) {
    await removeDispatchFromDb(target.dispatchId, backend);
  }
  emitOfflineSyncEvent();
}

export async function clearAllOfflineQueueItems(): Promise<void> {
  const backend = getActiveStorageBackend();
  await clearOutboxInDb(backend);
  emitOfflineSyncEvent();
}

export interface ReplayOptions {
  fetchFn?: typeof fetch;
  getToken?: () => string | null;
  forceEvenIfNavigatorOffline?: boolean;
}

/**
 * Replays all pending/failed IndexedDB outbox items in strict FIFO order.
 * Protected by an in-flight singleton lock so concurrent online events never duplicate requests.
 */
export async function replayOfflineQueue(
  options?: ReplayOptions
): Promise<{ synced: number; failed: number; syncedDispatchIds: string[] }> {
  if (activeReplayPromise) {
    return activeReplayPromise;
  }

  activeReplayPromise = executeReplay(options).finally(() => {
    activeReplayPromise = null;
  });

  return activeReplayPromise;
}

async function executeReplay(
  options?: ReplayOptions
): Promise<{ synced: number; failed: number; syncedDispatchIds: string[] }> {
  const backend = getActiveStorageBackend();
  const queue = await getOutboxItemsFromDb(backend);
  if (queue.length === 0) {
    return { synced: 0, failed: 0, syncedDispatchIds: [] };
  }

  if (!options?.forceEvenIfNavigatorOffline && isEffectivelyOffline()) {
    return { synced: 0, failed: 0, syncedDispatchIds: [] };
  }

  const doFetch = options?.fetchFn || fetch;
  const getToken = options?.getToken || readAuthToken;

  let synced = 0;
  let failed = 0;
  const syncedDispatchIds = new Set<string>();
  const tempIdMap: Record<string, string> = {};

  emitOfflineSyncEvent();

  for (const item of queue) {
    let targetUrl = item.url;
    let targetDispatchId = item.dispatchId;
    if (targetDispatchId && tempIdMap[targetDispatchId]) {
      const realId = tempIdMap[targetDispatchId];
      targetUrl = targetUrl.replace(targetDispatchId, realId);
      targetDispatchId = realId;
    }

    const syncingItem: OfflineQueueItem = {
      ...item,
      dispatchId: targetDispatchId,
      url: targetUrl,
      status: 'SYNCING',
      attempts: (item.attempts || 0) + 1,
    };
    await putOutboxItemInDb(syncingItem, backend);

    try {
      const token = getToken();
      const response = await doFetch(targetUrl, {
        method: syncingItem.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': syncingItem.idempotencyKey,
          'X-Offline-Queued-At': syncingItem.queuedAt,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(syncingItem.payload),
      });

      if (response.ok) {
        synced++;
        let serverDispatch: Dispatch | null = null;
        try {
          const data = await response.json();
          if (data && typeof data === 'object' && data.id && Array.isArray(data.lines)) {
            serverDispatch = data as Dispatch;
          }
        } catch {
          // Non-JSON or empty body
        }

        if (item.type === 'CREATE_DISPATCH' && item.dispatchId && serverDispatch && item.dispatchId !== serverDispatch.id) {
          tempIdMap[item.dispatchId] = serverDispatch.id;
          // Also update dispatchId on any subsequent queued items referencing tempId so projection works cleanly
          const currentQueue = await getOutboxItemsFromDb(backend);
          for (const q of currentQueue) {
            if (q.id !== item.id && q.dispatchId === item.dispatchId) {
              await putOutboxItemInDb(
                {
                  ...q,
                  dispatchId: serverDispatch.id,
                  url: q.url.replace(item.dispatchId, serverDispatch.id),
                },
                backend
              );
            }
          }
          await removeDispatchFromDb(item.dispatchId, backend);
        }

        await deleteOutboxItemFromDb(item.id, backend);

        if (serverDispatch) {
          await cacheSingleDispatchInDb(serverDispatch, backend);
          syncedDispatchIds.add(serverDispatch.id);
          try {
            saveMapCache(serverDispatch);
            clearOfflineTelemetryQueue(serverDispatch.id);
          } catch {
            // ignore
          }
        } else if (targetDispatchId) {
          syncedDispatchIds.add(targetDispatchId);
          try {
            clearOfflineTelemetryQueue(targetDispatchId);
          } catch {
            // ignore
          }
        }
      } else {
        let errText = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.error) errText = errJson.error;
        } catch {
          // ignore
        }
        failed++;
        await putOutboxItemInDb(
          {
            ...syncingItem,
            status: 'FAILED',
            errorMessage: errText,
          },
          backend
        );
      }
    } catch (err: any) {
      failed++;
      await putOutboxItemInDb(
        {
          ...syncingItem,
          status: 'FAILED',
          errorMessage: err?.message || 'Network unavailable during sync',
        },
        backend
      );
    }
  }

  if (synced > 0) {
    await recordLastSyncTimestampInDb(backend);
  }

  emitOfflineSyncEvent();

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('dispatchbridge_sync_completed', {
        detail: {
          synced,
          failed,
          syncedDispatchIds: Array.from(syncedDispatchIds),
        },
      })
    );
  }

  return {
    synced,
    failed,
    syncedDispatchIds: Array.from(syncedDispatchIds),
  };
}

/**
 * Registers global connectivity listeners once so returning online always flushes IndexedDB outbox.
 */
export function ensureGlobalOfflineSyncListeners(): void {
  if (autoSyncIntervalStarted || typeof window === 'undefined') return;
  autoSyncIntervalStarted = true;

  window.addEventListener('online', () => {
    emitOfflineSyncEvent();
    replayOfflineQueue().catch(() => {});
  });

  window.addEventListener('offline', () => {
    emitOfflineSyncEvent();
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !isEffectivelyOffline()) {
        replayOfflineQueue().catch(() => {});
      }
    });
  }
}

/**
 * React hook exposing IndexedDB cache metrics, outbox queue, connectivity controls,
 * and automatic synchronization status.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(() => !isEffectivelyOffline());
  const [simOffline, setSimOffline] = useState<boolean>(() => isSimulatedOfflineActive());
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [stats, setStats] = useState<LocalFirstStats>({
    cachedDispatchCount: 0,
    pendingOutboxCount: 0,
    failedOutboxCount: 0,
    storageEngine: 'IndexedDB',
    lastSyncedAt: null,
  });
  const [lastSyncSummary, setLastSyncSummary] = useState<{
    synced: number;
    failed: number;
    timestamp: string;
  } | null>(null);

  const refreshState = useCallback(async () => {
    setIsOnline(!isEffectivelyOffline());
    setSimOffline(isSimulatedOfflineActive());
    try {
      const [outbox, dbStats] = await Promise.all([
        getOutboxItemsFromDb(),
        getLocalFirstStats(),
      ]);
      setQueue(outbox);
      setStats(dbStats);
      setIsSyncing(outbox.some((i) => i.status === 'SYNCING'));
    } catch {
      // ignore transient IDB read error
    }
  }, []);

  useEffect(() => {
    ensureGlobalOfflineSyncListeners();
    refreshState();

    // Auto-sync on mount if online and outbox has pending items
    if (!isEffectivelyOffline()) {
      replayOfflineQueue()
        .then((res) => {
          if (res.synced > 0) {
            setLastSyncSummary({
              synced: res.synced,
              failed: res.failed,
              timestamp: new Date().toISOString(),
            });
          }
          refreshState();
        })
        .catch(() => {});
    }

    const handleSyncUpdate = () => {
      refreshState();
    };

    const handleSyncCompleted = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (detail && (detail.synced > 0 || detail.failed > 0)) {
        setLastSyncSummary({
          synced: detail.synced,
          failed: detail.failed,
          timestamp: new Date().toISOString(),
        });
      }
      refreshState();
    };

    window.addEventListener('online', handleSyncUpdate);
    window.addEventListener('offline', handleSyncUpdate);
    window.addEventListener('dispatchbridge_offline_sync', handleSyncUpdate);
    window.addEventListener('dispatchbridge_sync_completed', handleSyncCompleted);

    return () => {
      window.removeEventListener('online', handleSyncUpdate);
      window.removeEventListener('offline', handleSyncUpdate);
      window.removeEventListener('dispatchbridge_offline_sync', handleSyncUpdate);
      window.removeEventListener('dispatchbridge_sync_completed', handleSyncCompleted);
    };
  }, [refreshState]);

  const replayNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await replayOfflineQueue();
      setLastSyncSummary({
        synced: res.synced,
        failed: res.failed,
        timestamp: new Date().toISOString(),
      });
      await refreshState();
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshState]);

  const pendingDispatchIds = new Set<string>(
    queue.map((i) => i.dispatchId).filter(Boolean) as string[]
  );

  return {
    isOnline,
    isSimulatedOffline: simOffline,
    setSimulatedOffline: (val: boolean) => setSimulatedOffline(val),
    queueCount: queue.length,
    queue,
    pendingDispatchIds,
    stats,
    isSyncing,
    lastSyncSummary,
    refreshState,
    replayNow,
    removeItem: removeOfflineQueueItem,
    clearQueue: clearAllOfflineQueueItems,
  };
}

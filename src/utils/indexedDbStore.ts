/**
 * Local-First IndexedDB Storage & Event-Sourced Projection Engine
 * Persists dispatch manifests, partner/dock catalogs, and the offline mutation outbox
 * in browser IndexedDB (`dispatchbridge_local_first_db`) so field staff can view manifests
 * and log delivery updates offline, with automatic FIFO synchronization on reconnect.
 */

import {
  Dispatch,
  DispatchStatus,
  DiscrepancyCase,
  DispatchLine,
  RouteWaypoint,
  User,
} from '../types/dispatch.js';

export type OfflineMutationType =
  | 'TRANSIT_SCAN'
  | 'TELEMETRY_UPDATE'
  | 'RECORD_RECEIPT'
  | 'PUBLIC_RECORD_RECEIPT'
  | 'CREATE_DISPATCH';

export interface OfflineQueueItem {
  id: string;
  seq: number;
  type: OfflineMutationType;
  dispatchId?: string;
  dispatchNumber?: string;
  actionSummary: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  payload: any;
  idempotencyKey: string;
  queuedAt: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  attempts: number;
  errorMessage?: string;
}

export interface CachedDispatchRecord {
  id: string;
  /** Clean server snapshot (undefined only for offline-created draft dispatches not yet synced) */
  serverDispatch?: Dispatch;
  /** Current projected view (serverDispatch + all pending outbox mutations in FIFO order) */
  dispatch: Dispatch;
  cachedAt: string;
  hasPendingSync?: boolean;
}

export interface ReferenceDataRecord {
  key: 'partners' | 'locations' | 'meta';
  items?: any[];
  lastSyncedAt?: string;
  cachedAt: string;
}

export interface LocalFirstStats {
  cachedDispatchCount: number;
  pendingOutboxCount: number;
  failedOutboxCount: number;
  storageEngine: 'IndexedDB' | 'MemoryFallback';
  lastSyncedAt: string | null;
}

export interface LocalFirstStorageBackend {
  readonly engineName: 'IndexedDB' | 'MemoryFallback';
  getAll<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox'): Promise<T[]>;
  get<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', key: string): Promise<T | undefined>;
  put<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', value: T): Promise<void>;
  putMany<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', values: T[]): Promise<void>;
  delete(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', key: string): Promise<void>;
  clear(storeName: 'dispatches' | 'referenceData' | 'syncOutbox'): Promise<void>;
}

const DB_NAME = 'dispatchbridge_local_first_db';
const DB_VERSION = 1;

export function createMemoryStorageBackend(): LocalFirstStorageBackend {
  const stores: Record<'dispatches' | 'referenceData' | 'syncOutbox', Map<string, any>> = {
    dispatches: new Map(),
    referenceData: new Map(),
    syncOutbox: new Map(),
  };

  const getKey = (storeName: 'dispatches' | 'referenceData' | 'syncOutbox', value: any): string => {
    return storeName === 'referenceData' ? String(value.key) : String(value.id);
  };

  return {
    engineName: 'MemoryFallback',
    async getAll<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox'): Promise<T[]> {
      return Array.from(stores[storeName].values()).map((v) => JSON.parse(JSON.stringify(v)));
    },
    async get<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', key: string): Promise<T | undefined> {
      const val = stores[storeName].get(key);
      return val !== undefined ? (JSON.parse(JSON.stringify(val)) as T) : undefined;
    },
    async put<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', value: T): Promise<void> {
      stores[storeName].set(getKey(storeName, value), JSON.parse(JSON.stringify(value)));
    },
    async putMany<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', values: T[]): Promise<void> {
      for (const value of values) {
        stores[storeName].set(getKey(storeName, value), JSON.parse(JSON.stringify(value)));
      }
    },
    async delete(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', key: string): Promise<void> {
      stores[storeName].delete(key);
    },
    async clear(storeName: 'dispatches' | 'referenceData' | 'syncOutbox'): Promise<void> {
      stores[storeName].clear();
    },
  };
}

function createBrowserIndexedDbBackend(): LocalFirstStorageBackend {
  const fallback = createMemoryStorageBackend();
  let dbPromise: Promise<IDBDatabase> | null = null;

  const openDb = (): Promise<IDBDatabase> => {
    if (typeof window === 'undefined' || !('indexedDB' in window) || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB unavailable'));
    }
    if (dbPromise) return dbPromise;

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('dispatches')) {
            db.createObjectStore('dispatches', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('referenceData')) {
            db.createObjectStore('referenceData', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('syncOutbox')) {
            db.createObjectStore('syncOutbox', { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          dbPromise = null;
          reject(request.error || new Error('Failed to open IndexedDB'));
        };
      } catch (err) {
        dbPromise = null;
        reject(err);
      }
    });

    return dbPromise;
  };

  const isIdbAvailable = (): boolean => {
    return typeof window !== 'undefined' && 'indexedDB' in window && Boolean(window.indexedDB);
  };

  return {
    get engineName(): 'IndexedDB' | 'MemoryFallback' {
      return isIdbAvailable() ? 'IndexedDB' : 'MemoryFallback';
    },

    async getAll<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox'): Promise<T[]> {
      try {
        const db = await openDb();
        return await new Promise<T[]>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => resolve((req.result || []) as T[]);
          req.onerror = () => reject(req.error);
        });
      } catch {
        return fallback.getAll<T>(storeName);
      }
    },

    async get<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', key: string): Promise<T | undefined> {
      try {
        const db = await openDb();
        return await new Promise<T | undefined>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result as T | undefined);
          req.onerror = () => reject(req.error);
        });
      } catch {
        return fallback.get<T>(storeName, key);
      }
    },

    async put<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', value: T): Promise<void> {
      await fallback.put(storeName, value);
      try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.put(value);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Fallback already populated
      }
    },

    async putMany<T>(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', values: T[]): Promise<void> {
      await fallback.putMany(storeName, values);
      if (values.length === 0) return;
      try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          for (const v of values) {
            store.put(v);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Fallback already populated
      }
    },

    async delete(storeName: 'dispatches' | 'referenceData' | 'syncOutbox', key: string): Promise<void> {
      await fallback.delete(storeName, key);
      try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Fallback already updated
      }
    },

    async clear(storeName: 'dispatches' | 'referenceData' | 'syncOutbox'): Promise<void> {
      await fallback.clear(storeName);
      try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        // Fallback already cleared
      }
    },
  };
}

let activeBackend: LocalFirstStorageBackend = createBrowserIndexedDbBackend();
let monotonicSeq = 0;

export function nextOutboxSeq(): number {
  monotonicSeq += 1;
  return Date.now() * 1000 + (monotonicSeq % 1000);
}

export function setStorageBackendForTesting(backend: LocalFirstStorageBackend): void {
  activeBackend = backend;
}

export function resetStorageBackend(): void {
  activeBackend = createBrowserIndexedDbBackend();
}

export function getActiveStorageBackend(): LocalFirstStorageBackend {
  return activeBackend;
}

export function getActiveStorageEngine(): 'IndexedDB' | 'MemoryFallback' {
  return activeBackend.engineName;
}

function sortOutboxFifo(items: OfflineQueueItem[]): OfflineQueueItem[] {
  return [...items].sort((a, b) => {
    const timeDiff = new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (a.seq || 0) - (b.seq || 0);
  });
}

/**
 * Pure deterministic projection: applies an offline outbox mutation onto a Dispatch snapshot
 * so field staff immediately see their offline delivery updates in the UI and cached manifest.
 */
export function applyOfflineMutationToDispatch(
  baseDispatch: Dispatch,
  mutation: OfflineQueueItem
): Dispatch {
  const next: Dispatch = JSON.parse(JSON.stringify(baseDispatch));
  const payload = mutation.payload || {};
  next.updatedAt = mutation.queuedAt || new Date().toISOString();

  if (mutation.type === 'TRANSIT_SCAN') {
    if (payload.statusUpdate) {
      next.status = payload.statusUpdate as DispatchStatus;
    } else if (next.status === 'DISPATCHED' || next.status === 'VIEWED') {
      next.status = 'IN_TRANSIT';
    }
    const checkpoint =
      payload.checkpointLocation || next.currentCoordinates?.checkpointName || 'Offline Checkpoint';
    next.currentCoordinates = {
      latitude: next.currentCoordinates?.latitude ?? next.originLocationSnapshot?.latitude ?? 41.8781,
      longitude: next.currentCoordinates?.longitude ?? next.originLocationSnapshot?.longitude ?? -87.6298,
      updatedAt: next.updatedAt,
      speedKmh: next.currentCoordinates?.speedKmh ?? 75,
      heading: next.currentCoordinates?.heading ?? 310,
      checkpointName: checkpoint,
      source: 'DRIVER_SCAN',
    };
    const scanNote = `[Offline QR Scan ${payload.statusUpdate || 'IN_TRANSIT'} @ ${checkpoint}]${
      payload.driverNotes ? ` ${payload.driverNotes}` : ''
    }`;
    next.notes = next.notes ? `${next.notes}\n${scanNote}` : scanNote;
    return next;
  }

  if (mutation.type === 'TELEMETRY_UPDATE') {
    if (next.status === 'DISPATCHED' || next.status === 'VIEWED') {
      next.status = 'IN_TRANSIT';
    }
    const lat = Number(payload.latitude ?? next.currentCoordinates?.latitude ?? 41.8781);
    const lng = Number(payload.longitude ?? next.currentCoordinates?.longitude ?? -87.6298);
    const cpName = payload.checkpointName || `Offline GPS (${lat.toFixed(3)}, ${lng.toFixed(3)})`;

    next.currentCoordinates = {
      latitude: lat,
      longitude: lng,
      updatedAt: next.updatedAt,
      speedKmh: payload.speedKmh !== undefined ? Number(payload.speedKmh) : 80,
      heading: payload.heading !== undefined ? Number(payload.heading) : 310,
      checkpointName: cpName,
      source: payload.source || 'GPS',
    };

    const newWaypoint: RouteWaypoint = {
      id: `wp_off_${mutation.id}`,
      latitude: lat,
      longitude: lng,
      label: cpName,
      timestamp: next.updatedAt,
      speedKmh: next.currentCoordinates.speedKmh,
      passed: true,
    };

    if (!next.pathHistory) {
      next.pathHistory = {
        plannedWaypoints: [],
        actualWaypoints: [newWaypoint],
      };
    } else {
      next.pathHistory.actualWaypoints = [...next.pathHistory.actualWaypoints, newWaypoint];
    }
    return next;
  }

  if (mutation.type === 'RECORD_RECEIPT' || mutation.type === 'PUBLIC_RECORD_RECEIPT') {
    const incomingLines: Array<any> = Array.isArray(payload.lines) ? payload.lines : [];
    let totalReceived = 0;
    let totalLost = 0;
    const openedCases: DiscrepancyCase[] = [];

    next.lines = next.lines.map((line: DispatchLine) => {
      const match = incomingLines.find((il) => il.id === line.id);
      const qtyReceived =
        match && match.quantityReceived !== undefined
          ? Math.max(0, Number(match.quantityReceived))
          : line.quantitySent;
      const loss = Math.max(0, Math.round((line.quantitySent - qtyReceived) * 1000) / 1000);
      const condition = (match?.condition || 'GOOD') as DispatchLine['condition'];
      const discrepancyType = (
        match?.discrepancyType && match.discrepancyType !== 'NONE'
          ? match.discrepancyType
          : loss > 0
          ? condition === 'DAMAGED'
            ? 'DAMAGED'
            : 'SHORTAGE'
          : 'NONE'
      ) as DispatchLine['discrepancyType'];

      totalReceived = Math.round((totalReceived + qtyReceived) * 1000) / 1000;
      totalLost = Math.round((totalLost + loss) * 1000) / 1000;

      if (
        loss > 0 ||
        (condition && condition !== 'GOOD') ||
        (discrepancyType && discrepancyType !== 'NONE')
      ) {
        openedCases.push({
          id: `disc_off_${mutation.id}_${line.id}`,
          dispatchId: next.id,
          dispatchNumber: next.dispatchNumber,
          lineId: line.id,
          itemName: line.itemName,
          type: discrepancyType || 'SHORTAGE',
          status: 'OPEN',
          expectedQuantity: line.quantitySent,
          reportedQuantity: qtyReceived,
          shortfallQuantity: loss,
          openedByUserId: 'offline_field_user',
          openedByName: payload.signoff?.signerName || 'Offline Receiver',
          openedAt: next.updatedAt,
          notes: match?.notes || line.notes || 'Recorded while offline',
          evidence: match?.evidence || [],
        });
      }

      return {
        ...line,
        quantityReceived: qtyReceived,
        lossQty: loss,
        condition,
        discrepancyType,
        notes: match?.notes !== undefined ? match.notes : line.notes,
        evidence: match?.evidence || line.evidence,
      };
    });

    next.totalQuantityReceived = totalReceived;
    next.totalQuantityLost = totalLost;
    next.receivedAt = next.updatedAt;
    next.status = openedCases.length > 0 ? 'PARTIALLY_RECEIVED' : 'RECEIVED';

    if (payload.signoff) {
      next.receiverSignoff = {
        signerName: payload.signoff.signerName || 'Verified Receiver',
        signerRole: payload.signoff.signerRole || 'Receiving Lead',
        signedAt: next.updatedAt,
        comments: payload.signoff.comments,
        signatureSvgOrBase64: payload.signoff.signatureSvgOrBase64,
      };
    }

    if (openedCases.length > 0) {
      next.discrepancyCases = [...(next.discrepancyCases || []), ...openedCases];
    }

    return next;
  }

  return next;
}

/**
 * Projects a clean Dispatch snapshot across all pending FIFO outbox mutations for that dispatch.
 */
export function projectDispatchFromBaseAndOutbox(
  cleanBase: Dispatch,
  sortedOutbox: OfflineQueueItem[]
): { projected: Dispatch; hasPending: boolean } {
  const relevant = sortedOutbox.filter(
    (item) => item.dispatchId === cleanBase.id && item.type !== 'CREATE_DISPATCH'
  );
  let projected = JSON.parse(JSON.stringify(cleanBase)) as Dispatch;
  for (const item of relevant) {
    projected = applyOfflineMutationToDispatch(projected, item);
  }
  return {
    projected,
    hasPending: relevant.length > 0,
  };
}

/**
 * Builds a local draft Dispatch when a field dispatcher creates a manifest offline.
 */
export function buildOfflineDraftDispatch(
  mutation: OfflineQueueItem,
  currentUser?: User | null,
  partnersCache?: any[]
): Dispatch {
  const payload = mutation.payload || {};
  const linesInput: Array<any> = Array.isArray(payload.lines) ? payload.lines : [];
  const tempId = mutation.dispatchId || `off_dsp_${mutation.id}`;
  const draftNumber = mutation.dispatchNumber || `DSP-OFF-${Date.now().toString().slice(-5)}`;

  const builtLines: DispatchLine[] = linesInput.map((l, idx) => {
    const qty = Number(l.quantitySent) || 1;
    const price = Number(l.unitPrice) || 0;
    return {
      id: `off_line_${mutation.id}_${idx + 1}`,
      ordinal: idx + 1,
      sku: l.sku || `SKU-${String(idx + 1).padStart(3, '0')}`,
      itemName: l.itemName || 'Cargo Item',
      unit: l.unit || 'cases',
      unitPrice: price,
      quantitySent: qty,
      notes: l.notes,
    };
  });

  const totalQty = builtLines.reduce((sum, l) => sum + l.quantitySent, 0);
  const partnerMatch = partnersCache?.find((p) => p.id === payload.partnerId);

  return {
    id: tempId,
    dispatchNumber: draftNumber,
    shareToken: `off_tok_${mutation.id}`,
    senderBusinessId: currentUser?.businessId || 'biz_apex_supply',
    senderBusinessName: currentUser?.businessName || 'Apex Supply Logistics',
    senderUserId: currentUser?.id || 'usr_offline_sender',
    senderName: currentUser?.name || 'Field Dispatcher',
    originLocationSnapshot: {
      label: payload.originLocationLabel || 'Main Distribution Terminal',
      address: payload.originAddress || 'Registered Origin Dock',
      latitude: 41.8781,
      longitude: -87.6298,
    },
    partnerId: payload.partnerId || 'part_offline',
    partnerName: partnerMatch?.name || 'Receiving Partner',
    destinationSnapshot: {
      partnerName: partnerMatch?.name || 'Receiving Partner',
      contactPerson: partnerMatch?.contactPerson || 'Dock Supervisor',
      phone: partnerMatch?.phone || '+1-555-010-0000',
      address: payload.destinationAddress || partnerMatch?.deliveryAddress || 'Destination Dock',
      latitude: partnerMatch?.latitude ?? 44.9866,
      longitude: partnerMatch?.longitude ?? -93.2581,
    },
    driverName: payload.driverName || undefined,
    driverPhone: payload.driverPhone || undefined,
    vehicleReg: payload.vehicleReg || undefined,
    notes: payload.notes
      ? `${payload.notes}\n[Queued Offline in IndexedDB]`
      : '[Queued Offline in IndexedDB]',
    status: 'DISPATCHED',
    version: 1,
    totalQuantityDispatched: Math.round(totalQty * 1000) / 1000,
    createdAt: mutation.queuedAt,
    updatedAt: mutation.queuedAt,
    dispatchedAt: mutation.queuedAt,
    lines: builtLines,
    discrepancyCases: [],
    currentCoordinates: {
      latitude: 41.8781,
      longitude: -87.6298,
      updatedAt: mutation.queuedAt,
      speedKmh: 0,
      heading: 0,
      checkpointName: payload.originLocationLabel || 'Origin Dock (Offline Draft)',
      source: 'CHECKPOINT',
    },
  };
}

/**
 * Caches a fresh list of server dispatches into IndexedDB while preserving any un-synced
 * local draft dispatches and re-projecting any pending outbox mutations on top.
 */
export async function cacheDispatchesInDb(
  serverDispatches: Dispatch[],
  backend: LocalFirstStorageBackend = activeBackend
): Promise<Dispatch[]> {
  const rawOutbox = await backend.getAll<OfflineQueueItem>('syncOutbox');
  const sortedOutbox = sortOutboxFifo(rawOutbox);

  const pendingCreateItems = sortedOutbox.filter(
    (item) => item.type === 'CREATE_DISPATCH' && item.dispatchId
  );

  const existingRecords = await backend.getAll<CachedDispatchRecord>('dispatches');
  const now = new Date().toISOString();

  const nextRecords: CachedDispatchRecord[] = [];

  // Preserve offline-created draft dispatches that haven't synced yet
  for (const createItem of pendingCreateItems) {
    const draftId = createItem.dispatchId!;
    if (!serverDispatches.some((sd) => sd.id === draftId)) {
      const existingDraftRec = existingRecords.find((r) => r.id === draftId);
      const baseDraft = existingDraftRec?.serverDispatch || existingDraftRec?.dispatch || buildOfflineDraftDispatch(createItem);
      const { projected } = projectDispatchFromBaseAndOutbox(baseDraft, sortedOutbox);
      nextRecords.push({
        id: draftId,
        serverDispatch: baseDraft,
        dispatch: projected,
        cachedAt: existingDraftRec?.cachedAt || now,
        hasPendingSync: true,
      });
    }
  }

  for (const srv of serverDispatches) {
    const { projected, hasPending } = projectDispatchFromBaseAndOutbox(srv, sortedOutbox);
    nextRecords.push({
      id: srv.id,
      serverDispatch: srv,
      dispatch: projected,
      cachedAt: now,
      hasPendingSync: hasPending,
    });
  }

  await backend.clear('dispatches');
  await backend.putMany('dispatches', nextRecords);

  const meta = await backend.get<ReferenceDataRecord>('referenceData', 'meta');
  await backend.put<ReferenceDataRecord>('referenceData', {
    key: 'meta',
    lastSyncedAt: meta?.lastSyncedAt || now,
    cachedAt: now,
  });

  return nextRecords.map((r) => r.dispatch);
}

/**
 * Stores a clean server Dispatch snapshot into IndexedDB and projects any remaining outbox mutations.
 */
export async function cacheSingleDispatchInDb(
  cleanServerDispatch: Dispatch,
  backend: LocalFirstStorageBackend = activeBackend
): Promise<Dispatch> {
  const rawOutbox = await backend.getAll<OfflineQueueItem>('syncOutbox');
  const sortedOutbox = sortOutboxFifo(rawOutbox);
  const { projected, hasPending } = projectDispatchFromBaseAndOutbox(
    cleanServerDispatch,
    sortedOutbox
  );

  const record: CachedDispatchRecord = {
    id: cleanServerDispatch.id,
    serverDispatch: cleanServerDispatch,
    dispatch: projected,
    cachedAt: new Date().toISOString(),
    hasPendingSync: hasPending,
  };
  await backend.put('dispatches', record);
  return projected;
}

/**
 * Stores or updates a CachedDispatchRecord directly when enqueueing an offline mutation.
 */
export async function saveCachedDispatchRecordInDb(
  record: CachedDispatchRecord,
  backend: LocalFirstStorageBackend = activeBackend
): Promise<void> {
  await backend.put('dispatches', record);
}

export async function removeDispatchFromDb(
  dispatchId: string,
  backend: LocalFirstStorageBackend = activeBackend
): Promise<void> {
  await backend.delete('dispatches', dispatchId);
}

/**
 * Reads cached dispatches from IndexedDB with pending local outbox mutations projected cleanly.
 */
export async function getCachedDispatchesFromDb(
  statusFilter?: string,
  backend: LocalFirstStorageBackend = activeBackend
): Promise<Dispatch[]> {
  const [records, rawOutbox] = await Promise.all([
    backend.getAll<CachedDispatchRecord>('dispatches'),
    backend.getAll<OfflineQueueItem>('syncOutbox'),
  ]);

  const sortedOutbox = sortOutboxFifo(rawOutbox);

  let dispatches = records.map((rec) => {
    const cleanBase = rec.serverDispatch || rec.dispatch;
    return projectDispatchFromBaseAndOutbox(cleanBase, sortedOutbox).projected;
  });

  if (statusFilter && statusFilter !== 'ALL') {
    dispatches = dispatches.filter((d) => d.status === statusFilter);
  }

  return dispatches.sort(
    (a, b) =>
      new Date(b.dispatchedAt || b.createdAt).getTime() -
      new Date(a.dispatchedAt || a.createdAt).getTime()
  );
}

/**
 * Reads a single cached dispatch record from IndexedDB (including clean baseline + projected view).
 */
export async function getRawCachedDispatchRecord(
  dispatchId: string,
  backend: LocalFirstStorageBackend = activeBackend
): Promise<CachedDispatchRecord | null> {
  const rec = await backend.get<CachedDispatchRecord>('dispatches', dispatchId);
  return rec || null;
}

/**
 * Reads a single cached dispatch from IndexedDB with pending local outbox mutations projected once.
 */
export async function getCachedDispatchByIdFromDb(
  dispatchId: string,
  backend: LocalFirstStorageBackend = activeBackend
): Promise<Dispatch | null> {
  const [rec, rawOutbox] = await Promise.all([
    backend.get<CachedDispatchRecord>('dispatches', dispatchId),
    backend.getAll<OfflineQueueItem>('syncOutbox'),
  ]);

  if (!rec) return null;

  const sortedOutbox = sortOutboxFifo(rawOutbox);
  const cleanBase = rec.serverDispatch || rec.dispatch;
  return projectDispatchFromBaseAndOutbox(cleanBase, sortedOutbox).projected;
}

export async function cacheReferenceDataInDb(
  key: 'partners' | 'locations',
  items: any[],
  backend: LocalFirstStorageBackend = activeBackend
): Promise<void> {
  await backend.put<ReferenceDataRecord>('referenceData', {
    key,
    items,
    cachedAt: new Date().toISOString(),
  });
}

export async function getCachedReferenceDataFromDb<T>(
  key: 'partners' | 'locations',
  backend: LocalFirstStorageBackend = activeBackend
): Promise<T[] | null> {
  const record = await backend.get<ReferenceDataRecord>('referenceData', key);
  return record?.items ? (record.items as T[]) : null;
}

export async function getOutboxItemsFromDb(
  backend: LocalFirstStorageBackend = activeBackend
): Promise<OfflineQueueItem[]> {
  const items = await backend.getAll<OfflineQueueItem>('syncOutbox');
  return sortOutboxFifo(items);
}

export async function putOutboxItemInDb(
  item: OfflineQueueItem,
  backend: LocalFirstStorageBackend = activeBackend
): Promise<void> {
  await backend.put('syncOutbox', item);
}

export async function deleteOutboxItemFromDb(
  id: string,
  backend: LocalFirstStorageBackend = activeBackend
): Promise<void> {
  await backend.delete('syncOutbox', id);
}

export async function clearOutboxInDb(
  backend: LocalFirstStorageBackend = activeBackend
): Promise<void> {
  await backend.clear('syncOutbox');
}

export async function recordLastSyncTimestampInDb(
  backend: LocalFirstStorageBackend = activeBackend
): Promise<string> {
  const now = new Date().toISOString();
  await backend.put<ReferenceDataRecord>('referenceData', {
    key: 'meta',
    lastSyncedAt: now,
    cachedAt: now,
  });
  return now;
}

export async function getLocalFirstStats(
  backend: LocalFirstStorageBackend = activeBackend
): Promise<LocalFirstStats> {
  const [dispatches, outbox, meta] = await Promise.all([
    backend.getAll<CachedDispatchRecord>('dispatches'),
    backend.getAll<OfflineQueueItem>('syncOutbox'),
    backend.get<ReferenceDataRecord>('referenceData', 'meta'),
  ]);

  const failedOutboxCount = outbox.filter((i) => i.status === 'FAILED').length;

  return {
    cachedDispatchCount: dispatches.length,
    pendingOutboxCount: outbox.length,
    failedOutboxCount,
    storageEngine: backend.engineName,
    lastSyncedAt: meta?.lastSyncedAt || null,
  };
}

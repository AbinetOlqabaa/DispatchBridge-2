import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMemoryStorageBackend,
  setStorageBackendForTesting,
  resetStorageBackend,
  cacheDispatchesInDb,
  getCachedDispatchesFromDb,
  getCachedDispatchByIdFromDb,
  getOutboxItemsFromDb,
  getLocalFirstStats,
} from './indexedDbStore.js';
import {
  enqueueOfflineDeliveryUpdate,
  replayOfflineQueue,
  setSimulatedOffline,
} from './offlineSync.js';
import { Dispatch } from '../types/dispatch.js';

const sampleDispatch: Dispatch = {
  id: 'dsp_test_local_1',
  dispatchNumber: 'DSP-2026-9001',
  shareToken: 'tok_local_1',
  senderBusinessId: 'biz_apex_supply',
  senderBusinessName: 'Apex Supply Logistics',
  senderUserId: 'usr_sender',
  senderName: 'Carlos Ruiz',
  originLocationSnapshot: {
    label: 'Chicago Central Hub',
    address: '104 Logistics Blvd, Chicago, IL',
    latitude: 41.8781,
    longitude: -87.6298,
  },
  partnerId: 'part_1',
  partnerName: 'Metro Retail North',
  destinationSnapshot: {
    partnerName: 'Metro Retail North',
    contactPerson: 'David Miller',
    phone: '+1-555-014-4411',
    address: '800 Commerce Way, Minneapolis, MN',
    latitude: 44.9866,
    longitude: -93.2581,
  },
  status: 'DISPATCHED',
  version: 1,
  totalQuantityDispatched: 50,
  createdAt: '2026-11-01T08:00:00.000Z',
  updatedAt: '2026-11-01T08:00:00.000Z',
  dispatchedAt: '2026-11-01T08:00:00.000Z',
  lines: [
    {
      id: 'line_1',
      ordinal: 1,
      sku: 'SKU-GLS-101',
      itemName: 'Premium Olive Oil 750ml',
      unit: 'boxes',
      unitPrice: 54,
      quantitySent: 50,
    },
  ],
  discrepancyCases: [],
};

describe('Local-First IndexedDB Caching & Auto-Sync Engine', () => {
  beforeEach(() => {
    setStorageBackendForTesting(createMemoryStorageBackend());
    setSimulatedOffline(false);
  });

  afterEach(() => {
    setSimulatedOffline(false, { autoSync: false });
    resetStorageBackend();
  });

  it('caches dispatches in IndexedDB store and serves them offline with optimistic updates applied', async () => {
    await cacheDispatchesInDb([sampleDispatch]);

    const cachedList = await getCachedDispatchesFromDb();
    assert.equal(cachedList.length, 1);
    assert.equal(cachedList[0].id, 'dsp_test_local_1');
    assert.equal(cachedList[0].status, 'DISPATCHED');

    // Simulate field driver going offline and logging a transit scan + GPS ping + dock receipt
    setSimulatedOffline(true);

    const scanRes = await enqueueOfflineDeliveryUpdate({
      type: 'TRANSIT_SCAN',
      dispatchId: 'dsp_test_local_1',
      dispatchNumber: 'DSP-2026-9001',
      actionSummary: 'Transit Scan: IN_TRANSIT @ Rockford Gate',
      url: '/api/dispatches/dsp_test_local_1/transit-scan',
      payload: {
        barcode: 'DSP-2026-9001',
        statusUpdate: 'IN_TRANSIT',
        checkpointLocation: 'Rockford Gate I-90',
        driverNotes: 'All seals intact',
      },
      baseDispatch: sampleDispatch,
    });

    assert.equal(scanRes.queueItem.status, 'PENDING');
    assert.equal(scanRes.optimisticDispatch?.status, 'IN_TRANSIT');
    assert.equal(scanRes.optimisticDispatch?.currentCoordinates?.checkpointName, 'Rockford Gate I-90');

    await enqueueOfflineDeliveryUpdate({
      type: 'TELEMETRY_UPDATE',
      dispatchId: 'dsp_test_local_1',
      dispatchNumber: 'DSP-2026-9001',
      actionSummary: 'GPS Ping (43.80°N, 91.24°W)',
      url: '/api/dispatches/dsp_test_local_1/telemetry',
      payload: {
        latitude: 43.8014,
        longitude: -91.2396,
        speedKmh: 84,
        heading: 315,
        checkpointName: 'La Crosse River Bridge',
        source: 'GPS',
      },
      baseDispatch: scanRes.optimisticDispatch,
    });

    const stats = await getLocalFirstStats();
    assert.equal(stats.cachedDispatchCount, 1);
    assert.equal(stats.pendingOutboxCount, 2);

    // Local-first read reflects both offline updates in chronological order
    const offlineRead = await getCachedDispatchByIdFromDb('dsp_test_local_1');
    assert.ok(offlineRead);
    assert.equal(offlineRead.status, 'IN_TRANSIT');
    assert.equal(offlineRead.currentCoordinates?.checkpointName, 'La Crosse River Bridge');
    assert.equal(offlineRead.currentCoordinates?.latitude, 43.8014);
    assert.equal(offlineRead.pathHistory?.actualWaypoints.length, 1);
  });

  it('projects offline dock receipt reconciliation including shortfall discrepancies', async () => {
    await cacheDispatchesInDb([sampleDispatch]);
    setSimulatedOffline(true);

    const receiptRes = await enqueueOfflineDeliveryUpdate({
      type: 'RECORD_RECEIPT',
      dispatchId: 'dsp_test_local_1',
      dispatchNumber: 'DSP-2026-9001',
      actionSummary: 'Dock Receipt Sign-off (46/50 boxes)',
      url: '/api/dispatches/dsp_test_local_1/reconcile',
      payload: {
        lines: [
          {
            id: 'line_1',
            quantityReceived: 46,
            condition: 'DAMAGED',
            discrepancyType: 'DAMAGED',
            notes: '4 boxes crushed on tailgate',
          },
        ],
        signoff: {
          signerName: 'David Miller',
          signerRole: 'Dock Lead',
          comments: 'Signed offline at receiving bay',
        },
      },
      baseDispatch: sampleDispatch,
    });

    const updated = receiptRes.optimisticDispatch!;
    assert.equal(updated.status, 'PARTIALLY_RECEIVED');
    assert.equal(updated.totalQuantityReceived, 46);
    assert.equal(updated.totalQuantityLost, 4);
    assert.equal(updated.receiverSignoff?.signerName, 'David Miller');
    assert.equal(updated.discrepancyCases?.length, 1);
    assert.equal(updated.discrepancyCases?.[0].shortfallQuantity, 4);
  });

  it('replays offline draft dispatches and subsequent transit scans in FIFO order with ID resolution', async () => {
    setSimulatedOffline(true);

    const draftRes = await enqueueOfflineDeliveryUpdate({
      type: 'CREATE_DISPATCH',
      actionSummary: 'New Dispatch (120 cases)',
      url: '/api/dispatches',
      payload: {
        partnerId: 'part_1',
        originLocationId: 'loc_1',
        destinationAddress: '800 Commerce Way',
        lines: [{ sku: 'SKU-NEW-1', itemName: 'Sparkling Water', unit: 'cases', quantitySent: 120 }],
      },
    });

    const tempId = draftRes.optimisticDispatch!.id;
    assert.ok(tempId.startsWith('off_dsp_'));

    await enqueueOfflineDeliveryUpdate({
      type: 'TRANSIT_SCAN',
      dispatchId: tempId,
      dispatchNumber: draftRes.optimisticDispatch!.dispatchNumber,
      actionSummary: 'Departure Gate Scan',
      url: `/api/dispatches/${tempId}/transit-scan`,
      payload: {
        barcode: tempId,
        statusUpdate: 'IN_TRANSIT',
        checkpointLocation: 'South Exit Gate',
      },
      baseDispatch: draftRes.optimisticDispatch,
    });

    const requestsSent: Array<{ url: string; auth: string | null; idempotencyKey: string | null }> = [];
    const serverCreatedDispatch: Dispatch = {
      ...sampleDispatch,
      id: 'dsp_server_999',
      dispatchNumber: 'DSP-2026-9999',
      status: 'DISPATCHED',
    };
    const serverScannedDispatch: Dispatch = {
      ...serverCreatedDispatch,
      status: 'IN_TRANSIT',
    };

    const mockFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      const headers = (init?.headers || {}) as Record<string, string>;
      requestsSent.push({
        url,
        auth: headers.Authorization || null,
        idempotencyKey: headers['X-Idempotency-Key'] || null,
      });

      if (url === '/api/dispatches') {
        return new Response(JSON.stringify(serverCreatedDispatch), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url === '/api/dispatches/dsp_server_999/transit-scan') {
        return new Response(JSON.stringify(serverScannedDispatch), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Unexpected URL ' + url }), { status: 404 });
    };

    const result = await replayOfflineQueue({
      fetchFn: mockFetch,
      getToken: () => 'tok_hmac_verified_123',
      forceEvenIfNavigatorOffline: true,
    });

    assert.equal(result.synced, 2);
    assert.equal(result.failed, 0);
    assert.equal(requestsSent.length, 2);
    assert.equal(requestsSent[0].url, '/api/dispatches');
    assert.equal(requestsSent[0].auth, 'Bearer tok_hmac_verified_123');
    assert.ok(requestsSent[0].idempotencyKey);
    // Second request had its temporary ID rewritten to the newly created server ID!
    assert.equal(requestsSent[1].url, '/api/dispatches/dsp_server_999/transit-scan');

    const remainingOutbox = await getOutboxItemsFromDb();
    assert.equal(remainingOutbox.length, 0);

    // Temp draft removed and server dispatch cached
    const oldDraft = await getCachedDispatchByIdFromDb(tempId);
    assert.equal(oldDraft, null);
    const syncedRecord = await getCachedDispatchByIdFromDb('dsp_server_999');
    assert.ok(syncedRecord);
    assert.equal(syncedRecord.status, 'IN_TRANSIT');
  });

  it('retains failed items in IndexedDB outbox with error metadata while clearing succeeded ones', async () => {
    await cacheDispatchesInDb([sampleDispatch]);
    setSimulatedOffline(true);

    await enqueueOfflineDeliveryUpdate({
      type: 'TRANSIT_SCAN',
      dispatchId: 'dsp_test_local_1',
      actionSummary: 'Scan 1 (Will Succeed)',
      url: '/api/dispatches/dsp_test_local_1/transit-scan',
      payload: { barcode: 'A1', statusUpdate: 'IN_TRANSIT' },
      baseDispatch: sampleDispatch,
    });

    await enqueueOfflineDeliveryUpdate({
      type: 'RECORD_RECEIPT',
      dispatchId: 'dsp_test_local_1',
      actionSummary: 'Receipt 2 (Server 500)',
      url: '/api/dispatches/dsp_test_local_1/reconcile',
      payload: { lines: [], signoff: { signerName: 'Test', signerRole: 'Lead' } },
      baseDispatch: sampleDispatch,
    });

    const partialMockFetch: typeof fetch = async (input) => {
      if (String(input).endsWith('/transit-scan')) {
        return new Response(JSON.stringify({ ...sampleDispatch, status: 'IN_TRANSIT' }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'Database lock timeout' }), { status: 500 });
    };

    const res = await replayOfflineQueue({
      fetchFn: partialMockFetch,
      getToken: () => 'tok_123',
      forceEvenIfNavigatorOffline: true,
    });

    assert.equal(res.synced, 1);
    assert.equal(res.failed, 1);

    const outbox = await getOutboxItemsFromDb();
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0].status, 'FAILED');
    assert.equal(outbox[0].attempts, 1);
    assert.equal(outbox[0].errorMessage, 'Database lock timeout');
  });
});

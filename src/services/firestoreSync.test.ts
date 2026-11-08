import test from 'node:test';
import assert from 'node:assert/strict';
import {
  subscribeToDispatchLive,
  subscribeToTelemetryLive,
  syncDispatchToFirestore,
  syncTelemetryToFirestore,
} from './firestoreSync.js';

test('Firestore Sync: Safe handling of invalid or empty IDs', () => {
  const unsub1 = subscribeToDispatchLive('', () => {});
  assert.equal(typeof unsub1, 'function', 'Returns a no-op function on empty ID');
  unsub1();

  const unsub2 = subscribeToTelemetryLive('', () => {});
  assert.equal(typeof unsub2, 'function', 'Returns a no-op function on empty ID');
  unsub2();
});

test('Firestore Sync: Safe handling of sync calls with invalid payload', async () => {
  const syncResult = await syncDispatchToFirestore(null as any);
  assert.equal(syncResult, false, 'Rejects null dispatch without throwing');

  const telemetryResult = await syncTelemetryToFirestore('', {
    latitude: 41.8781,
    longitude: -87.6298,
    updatedAt: new Date().toISOString(),
  });
  assert.equal(telemetryResult, false, 'Rejects empty dispatch ID for telemetry without throwing');
});

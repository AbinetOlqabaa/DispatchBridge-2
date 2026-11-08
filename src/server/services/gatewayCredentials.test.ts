import test from 'node:test';
import assert from 'node:assert/strict';
import { getGatewayCredentials, dispatchExternalSms, dispatchExternalWhatsApp } from './gatewayCredentials.js';

test('External Gateway: Credentials detection and masking', () => {
  const creds = getGatewayCredentials();
  assert.equal(creds.isFirestoreConfigured, true, 'Persistent Firestore is configured');
  assert.equal(typeof creds.firestoreProjectId, 'string', 'Firestore project ID is present');
  assert.equal(typeof creds.firestoreDatabaseId, 'string', 'Firestore database ID is present');
  assert.equal(typeof creds.isSmsConfigured, 'boolean', 'SMS configured flag is boolean');
  assert.equal(typeof creds.isWhatsAppConfigured, 'boolean', 'WhatsApp configured flag is boolean');
});

test('External Gateway: Staging fallback dispatch for SMS and WhatsApp', async () => {
  // Test simulated dispatch when live secrets are omitted
  const smsResult = await dispatchExternalSms('+15550192831', 'Test dispatch notice');
  assert.equal(smsResult.success, true, 'SMS dispatch succeeds in staging/fallback');
  assert.equal(typeof smsResult.providerMessageId, 'string', 'Provider message ID returned');

  const waResult = await dispatchExternalWhatsApp('+15550192831', 'Test WhatsApp dispatch notice');
  assert.equal(waResult.success, true, 'WhatsApp dispatch succeeds in staging/fallback');
  assert.equal(typeof waResult.providerMessageId, 'string', 'WhatsApp provider message ID returned');
});

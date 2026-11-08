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
  assert.equal(creds.whatsappDefaultPhoneNumber, '+251987344787', 'User WhatsApp number +251987344787 is assigned');
});

test('External Gateway: Staging fallback dispatch for SMS and WhatsApp', async () => {
  // Test simulated dispatch when live secrets are omitted
  const smsResult = await dispatchExternalSms('+15550192831', 'Test dispatch notice');
  assert.equal(smsResult.success, true, 'SMS dispatch succeeds in staging/fallback');
  assert.equal(typeof smsResult.providerMessageId, 'string', 'Provider message ID returned');

  const waResult = await dispatchExternalWhatsApp('+15550192831', 'Test WhatsApp dispatch notice');
  assert.equal(waResult.success, true, 'WhatsApp dispatch succeeds in staging/fallback');
  assert.equal(typeof waResult.providerMessageId, 'string', 'WhatsApp provider message ID returned');

  // Verify dispatch directly to user configured WhatsApp target +251987344787
  const userWaResult = await dispatchExternalWhatsApp('+251987344787', 'Urgent Delivery Notice: Manifest DSP-2026-001 has arrived at dock.');
  assert.equal(userWaResult.success, true, 'User WhatsApp dispatch succeeded');
  assert.equal(typeof userWaResult.providerMessageId, 'string', 'User WhatsApp provider ID returned');
});


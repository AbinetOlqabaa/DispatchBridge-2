import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { hapticFeedback } from './haptics.js';

describe('Vibration & Haptic Feedback API Utility', () => {
  beforeEach(() => {
    hapticFeedback.setEnabled(true);
  });

  it('safely handles non-browser environments without throwing', () => {
    // In Node.js environment, navigator.vibrate is typically undefined
    assert.doesNotThrow(() => {
      const res = hapticFeedback.barcodeScanned();
      assert.equal(typeof res, 'boolean');
    });

    assert.doesNotThrow(() => {
      const res = hapticFeedback.dispatchCreated();
      assert.equal(typeof res, 'boolean');
    });

    assert.doesNotThrow(() => {
      const res = hapticFeedback.syncSuccess();
      assert.equal(typeof res, 'boolean');
    });
  });

  it('triggers vibration patterns with navigator.vibrate mock', () => {
    const recordedPatterns: any[] = [];
    const origVibrate = (globalThis.navigator as any)?.vibrate;

    Object.defineProperty(globalThis.navigator, 'vibrate', {
      value: (pattern: any) => {
        recordedPatterns.push(pattern);
        return true;
      },
      configurable: true,
      writable: true,
    });

    assert.equal(hapticFeedback.isSupported(), true);

    // 1. Barcode scan haptic pattern
    const scanResult = hapticFeedback.barcodeScanned();
    assert.equal(scanResult, true);
    assert.deepEqual(recordedPatterns[recordedPatterns.length - 1], [35]);

    // 2. Dispatch created haptic pattern
    const dispatchResult = hapticFeedback.dispatchCreated();
    assert.equal(dispatchResult, true);
    assert.deepEqual(recordedPatterns[recordedPatterns.length - 1], [50, 40, 80]);

    // 3. Offline sync success pattern
    const syncResult = hapticFeedback.syncSuccess();
    assert.equal(syncResult, true);
    assert.deepEqual(recordedPatterns[recordedPatterns.length - 1], [40, 60, 40]);

    // 4. Error alert pattern
    const errorResult = hapticFeedback.errorAlert();
    assert.equal(errorResult, true);
    assert.deepEqual(recordedPatterns[recordedPatterns.length - 1], [70, 50, 70]);

    // 5. Cancel pattern
    const cancelResult = hapticFeedback.cancel();
    assert.equal(cancelResult, true);
    assert.equal(recordedPatterns[recordedPatterns.length - 1], 0);

    // 6. Respects user disabling haptics
    hapticFeedback.setEnabled(false);
    assert.equal(hapticFeedback.isEnabled(), false);
    const disabledResult = hapticFeedback.barcodeScanned();
    assert.equal(disabledResult, false);

    // Clean up mock
    if (origVibrate !== undefined) {
      Object.defineProperty(globalThis.navigator, 'vibrate', { value: origVibrate, configurable: true, writable: true });
    } else {
      delete (globalThis.navigator as any).vibrate;
    }
  });
});

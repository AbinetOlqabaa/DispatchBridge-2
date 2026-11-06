/**
 * Haptic & Vibration Feedback Utility using the Web Vibration API
 * Provides tactile confirmation for critical mobile/tablet warehouse interactions:
 * - Scanning a 1D barcode or QR code item
 * - Creating or queueing a dispatch manifest
 * - Successfully syncing offline IndexedDB queue data upon reconnection
 * - Warning/error feedback when an unrecognized barcode or network failure occurs
 *
 * Safe fallback: Gracefully no-ops in desktop environments, iOS Safari, or devices
 * without vibration motor hardware.
 */

export type VibrationPattern = number | number[];

export interface HapticFeedbackOptions {
  /** Override or force-disable haptics if user toggles vibration off */
  enabled?: boolean;
}

const HAPTIC_ENABLED_STORAGE_KEY = 'dispatchbridge_haptics_enabled';

class HapticsService {
  private memoryEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(HAPTIC_ENABLED_STORAGE_KEY);
        if (stored !== null) {
          this.memoryEnabled = stored === 'true';
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Check if the Vibration API is supported on the current device and browser.
   */
  public isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator &&
      typeof navigator.vibrate === 'function'
    );
  }

  /**
   * Check if haptic feedback is currently enabled by user preference.
   */
  public isEnabled(): boolean {
    return this.memoryEnabled;
  }

  /**
   * Set user preference for haptic feedback.
   */
  public setEnabled(enabled: boolean): void {
    this.memoryEnabled = enabled;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(HAPTIC_ENABLED_STORAGE_KEY, String(enabled));
      } catch {
        // ignore
      }
    }
  }

  /**
   * Core vibration execution with safety wrappers.
   */
  public trigger(pattern: VibrationPattern, options?: HapticFeedbackOptions): boolean {
    const isExplicitlyDisabled = options?.enabled === false || !this.memoryEnabled;
    if (isExplicitlyDisabled || !this.isSupported()) {
      return false;
    }

    try {
      return navigator.vibrate(pattern);
    } catch {
      // In case permissions policy or user gesture restrictions reject vibrate call
      return false;
    }
  }

  /**
   * 1. Barcode / QR Code Scanned:
   * Short, crisp tactile pulse (35ms) providing immediate confirmation that an item
   * has been captured and added/incremented into the manifest.
   */
  public barcodeScanned(options?: HapticFeedbackOptions): boolean {
    return this.trigger([35], options);
  }

  /**
   * 2. Dispatch Created / Manifest Sealed:
   * Multi-stage celebratory pulse pattern [50ms pulse, 40ms pause, 80ms pulse]
   * confirming successful dispatch manifest creation or local offline queueing.
   */
  public dispatchCreated(options?: HapticFeedbackOptions): boolean {
    return this.trigger([50, 40, 80], options);
  }

  /**
   * 3. Offline Data Synced Successfully:
   * Double confirmation rhythm [40ms pulse, 60ms pause, 40ms pulse]
   * confirming that IndexedDB outbox items have successfully synchronized to the server.
   */
  public syncSuccess(options?: HapticFeedbackOptions): boolean {
    return this.trigger([40, 60, 40], options);
  }

  /**
   * 4. Error / Discrepancy / Unrecognized Barcode Alert:
   * Urgent dual buzz [70ms pulse, 50ms pause, 70ms pulse]
   */
  public errorAlert(options?: HapticFeedbackOptions): boolean {
    return this.trigger([70, 50, 70], options);
  }

  /**
   * 5. Light button tap / navigation select:
   * Minimal 15ms micro-pulse for key buttons
   */
  public lightTap(options?: HapticFeedbackOptions): boolean {
    return this.trigger([15], options);
  }

  /**
   * Cancel any active vibration sequence immediately.
   */
  public cancel(): boolean {
    if (!this.isSupported()) return false;
    try {
      return navigator.vibrate(0);
    } catch {
      return false;
    }
  }
}

export const hapticFeedback = new HapticsService();

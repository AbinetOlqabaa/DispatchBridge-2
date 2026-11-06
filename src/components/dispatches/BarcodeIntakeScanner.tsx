import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  QrCode,
  ScanBarcode,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plus,
  RefreshCw,
  X,
  Volume2,
  VolumeX,
  Vibrate,
  VibrateOff,
} from 'lucide-react';
import {
  BARCODE_CATALOG,
  ParsedIntakeItem,
  parseIntakeBarcode,
} from '../../utils/barcodeParser.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { hapticFeedback } from '../../utils/haptics.js';

interface BarcodeIntakeScannerProps {
  onItemsScanned: (
    items: ParsedIntakeItem[],
    meta: { rawCode: string; format: string }
  ) => { addedCount: number; incrementedCount: number; totalUnitsAdded: number };
  onClose?: () => void;
}

function playScannerBeep(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime); // D6 clean handheld scanner chirp
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // AudioContext optional
  }
}

export const BarcodeIntakeScanner: React.FC<BarcodeIntakeScannerProps> = ({
  onItemsScanned,
  onClose,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastScanRef = useRef<{ code: string; timestamp: number }>({ code: '', timestamp: 0 });

  const [cameraState, setCameraState] = useState<'initializing' | 'active' | 'fallback'>('initializing');
  const [detectorSupported, setDetectorSupported] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState('');
  const [qtyMultiplier, setQtyMultiplier] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(() => hapticFeedback.isEnabled());
  const [lastFeedback, setLastFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    code?: string;
  } | null>(null);
  const [recentScans, setRecentScans] = useState<Array<{ sku: string; qty: number; time: string }>>([]);

  const processRawCode = useCallback(
    (rawCode: string, format: string = 'BARCODE') => {
      const parsed = parseIntakeBarcode(rawCode, format);
      if (!parsed.ok || parsed.items.length === 0) {
        hapticFeedback.errorAlert({ enabled: vibrateEnabled });
        setLastFeedback({
          type: 'error',
          message: parsed.error || t('intake_scanner.err_invalid_code', 'Unrecognized barcode or QR format.'),
        });
        return;
      }

      // Apply batch multiplier when scanning single unit barcodes
      const scaledItems: ParsedIntakeItem[] =
        qtyMultiplier > 1 && parsed.format !== 'QR_JSON'
          ? parsed.items.map((item) => ({
              ...item,
              quantitySent: Math.round(item.quantitySent * qtyMultiplier * 1000) / 1000,
            }))
          : parsed.items;

      const summary = onItemsScanned(scaledItems, {
        rawCode: parsed.rawCode,
        format: parsed.format,
      });

      if (soundEnabled) {
        playScannerBeep();
      }
      hapticFeedback.barcodeScanned({ enabled: vibrateEnabled });

      const skusText = scaledItems.map((i) => `${i.sku} (+${i.quantitySent})`).join(', ');
      const actionLabel =
        summary.incrementedCount > 0 && summary.addedCount === 0
          ? t('intake_scanner.incremented_msg', 'Incremented quantity for {items}', { items: skusText })
          : t('intake_scanner.added_msg', 'Added to manifest: {items}', { items: skusText });

      setLastFeedback({
        type: 'success',
        message: actionLabel,
        code: parsed.rawCode,
      });

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setRecentScans((prev) => [
        ...scaledItems.map((i) => ({ sku: i.sku, qty: i.quantitySent, time: nowStr })),
        ...prev.slice(0, 5),
      ]);
    },
    [onItemsScanned, qtyMultiplier, soundEnabled, vibrateEnabled, t]
  );

  // Initialize device camera & native BarcodeDetector API when mounted
  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let cancelled = false;

    const hasNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    setDetectorSupported(hasNativeDetector);

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!cancelled) setCameraState('fallback');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraState('active');

        if (hasNativeDetector && videoRef.current) {
          const BarcodeDetectorCtor = (window as any).BarcodeDetector;
          const detector = new BarcodeDetectorCtor({
            formats: [
              'qr_code',
              'ean_13',
              'ean_8',
              'code_128',
              'code_39',
              'upc_a',
              'upc_e',
              'itf',
              'data_matrix',
            ],
          });

          const scanFrame = async () => {
            if (cancelled) return;
            try {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                const barcodes = await detector.detect(videoRef.current);
                if (Array.isArray(barcodes) && barcodes.length > 0) {
                  const first = barcodes[0];
                  const val = String(first.rawValue || '').trim();
                  const now = Date.now();
                  if (
                    val &&
                    (val !== lastScanRef.current.code || now - lastScanRef.current.timestamp > 1600)
                  ) {
                    lastScanRef.current = { code: val, timestamp: now };
                    processRawCode(val, first.format || 'CAMERA_BARCODE');
                  }
                }
              }
            } catch {
              // Ignore transient frame decode error
            }
            if (!cancelled) {
              rafId = window.setTimeout(() => {
                requestAnimationFrame(scanFrame);
              }, 220);
            }
          };

          requestAnimationFrame(scanFrame);
        }
      } catch {
        if (!cancelled) {
          setCameraState('fallback');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (rafId !== null) clearTimeout(rafId);
      if (stream) {
        stream.getTracks().forEach((tr) => tr.stop());
      }
    };
  }, [processRawCode]);

  const handleManualSubmit = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!manualInput.trim()) return;
    processRawCode(manualInput, 'MANUAL_OR_WEDGE');
    setManualInput('');
  };

  const quickPresets = [
    {
      label: `${BARCODE_CATALOG[0].sku} • ${t('unit.boxes', 'boxes')}`,
      code: BARCODE_CATALOG[0].sku,
      hint: 'Olive Oil 750ml',
    },
    {
      label: `${BARCODE_CATALOG[7].sku} • ${t('unit.bags', 'bags')}`,
      code: BARCODE_CATALOG[7].sku,
      hint: 'Coffee Beans 20kg',
    },
    {
      label: `${BARCODE_CATALOG[3].sku} • ${t('unit.sacks', 'sacks')}`,
      code: BARCODE_CATALOG[3].sku,
      hint: 'Rolled Oats 25kg',
    },
    {
      label: t('intake_scanner.pallet_qr_preset', 'Pallet Batch QR (2 SKUs)'),
      code: JSON.stringify({
        items: [
          { sku: 'SKU-COLD-501', itemName: 'Insulated Thermal Pallet Blankets (Reusable)', unit: 'units', quantity: 4 },
          { sku: 'SKU-SEC-602', itemName: 'Tamper-Evident High-Security Bolt Seals (Pack of 50)', unit: 'boxes', quantity: 2 },
        ],
      }),
      hint: '2 items QR JSON',
    },
  ];

  return (
    <div
      data-testid="create-dispatch-barcode-scanner"
      className="bg-slate-50 dark:bg-slate-950/90 border border-indigo-200 dark:border-indigo-500/40 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-sm dark:shadow-lg"
    >
      {/* Top Scanner Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5">
            <ScanBarcode className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
              <span>{t('intake_scanner.title', 'Barcode & QR Item Intake Scanner')}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  cameraState === 'active'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/70'
                    : 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700/70'
                }`}
              >
                {cameraState === 'active'
                  ? detectorSupported
                    ? t('intake_scanner.camera_live_badge', 'Camera + Auto-Decode Live')
                    : t('intake_scanner.camera_preview_badge', 'Camera Active')
                  : t('intake_scanner.wedge_ready_badge', 'Scanner & Quick-Intake Ready')}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              {t(
                'intake_scanner.subtitle',
                'Scan 1D barcodes (EAN-13, Code-128) or structured QR codes to add or increment line items.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Batch Qty Multiplier */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5 text-[11px]">
            {[1, 5, 10].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => setQtyMultiplier(mult)}
                className={`px-2 py-1 rounded font-mono font-bold cursor-pointer min-h-[32px] ${
                  qtyMultiplier === mult
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title={t('intake_scanner.multiplier_title', 'Quantity added per scan')}
              >
                ×{mult}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Toggle scanner beep"
            title={soundEnabled ? 'Mute scanner beep' : 'Enable scanner beep'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !vibrateEnabled;
              setVibrateEnabled(next);
              hapticFeedback.setEnabled(next);
              if (next) hapticFeedback.barcodeScanned({ enabled: true });
            }}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Toggle haptic vibration"
            title={vibrateEnabled ? 'Disable haptic vibration' : 'Enable haptic vibration'}
          >
            {vibrateEnabled ? <Vibrate className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <VibrateOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label={t('action.close', 'Close')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Responsive 2-column layout on tablet/desktop: Camera Viewfinder + Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
        {/* Live Camera Viewfinder (5 cols on md+) */}
        <div className="md:col-span-5 relative rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[156px] flex items-center justify-center">
          {cameraState === 'active' ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-40 object-cover"
                autoPlay
                playsInline
                muted
              />
              {/* Target Reticle Overlay */}
              <div className="absolute inset-5 border border-indigo-400/50 rounded-lg pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-indigo-500 dark:bg-sky-400/85 shadow-[0_0_10px_#6366f1] animate-pulse" />
              </div>
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-white/90 dark:bg-slate-950/80 text-[10px] font-mono text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 font-semibold">
                {t('intake_scanner.aim_reticle', 'Align barcode or QR inside frame')}
              </span>
            </>
          ) : (
            <div className="p-4 text-center space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                {cameraState === 'initializing' ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200">
                {cameraState === 'initializing'
                  ? t('intake_scanner.starting_camera', 'Initializing device camera...')
                  : t('intake_scanner.camera_standby', 'Camera Standby • Manual & Wedge Active')}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug max-w-[230px] mx-auto">
                {t(
                  'intake_scanner.standby_hint',
                  'Enter or scan a SKU / EAN / QR payload on the right, or tap a catalog chip below.'
                )}
              </p>
            </div>
          )}
        </div>

        {/* Manual / Hardware Barcode Wedge Input + Quick Presets (7 cols on md+) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-2.5">
          {/* Hardware Wedge / Manual Entry Input (non-form container to avoid nested form inside CreateDispatchModal) */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <QrCode className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                data-testid="barcode-intake-input"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleManualSubmit(e);
                  }
                }}
                placeholder={t(
                  'intake_scanner.input_placeholder',
                  'Scan barcode / QR or type SKU (e.g. SKU-GLS-101)...'
                )}
                aria-label={t('intake_scanner.title', 'Barcode & QR Item Intake Scanner')}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono min-h-[44px] focus:outline-none"
              />
            </div>
            <button
              type="button"
              data-testid="barcode-intake-submit"
              onClick={() => handleManualSubmit()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 min-h-[44px] shadow-sm shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>{t('intake_scanner.add_btn', 'Scan / Add')}</span>
            </button>
          </div>

          {/* Quick Warehouse Catalog Barcodes (1-Tap Intake) */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600 dark:text-sky-400" />
                {t('intake_scanner.quick_presets_label', 'Quick Catalog Barcodes (1-Tap Intake):')}
              </span>
              {qtyMultiplier > 1 && (
                <span className="text-indigo-600 dark:text-indigo-300 font-mono text-[10px] font-bold">
                  ×{qtyMultiplier} {t('intake_scanner.per_scan', 'per scan')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => processRawCode(preset.code, 'QUICK_PRESET')}
                  className="text-left px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-700/80 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between gap-2 min-h-[44px] shadow-xs"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300 truncate">
                      {preset.label}
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{preset.hint}</div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Scan Result Banner */}
      {lastFeedback && (
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            lastFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {lastFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="truncate font-semibold">{lastFeedback.message}</span>
          </div>
          {recentScans.length > 0 && (
            <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300/80 shrink-0 font-bold">
              {recentScans[0].time}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Truck,
  MapPin,
  FileText,
  ScanLine,
  RefreshCw,
  Package,
  WifiOff,
} from 'lucide-react';
import { Dispatch, DispatchStatus } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { useOfflineSync } from '../../utils/offlineSync.js';
import { hapticFeedback } from '../../utils/haptics.js';

interface QrScannerModalProps {
  dispatch: Dispatch;
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (updatedDispatch: Dispatch) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  dispatch,
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedItems, setScannedItems] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<DispatchStatus>('IN_TRANSIT');
  const [checkpointLocation, setCheckpointLocation] = useState(
    dispatch.originLocationSnapshot?.label
      ? `En route from ${dispatch.originLocationSnapshot.label}`
      : 'Highway Transit Checkpoint'
  );
  const [driverNotes, setDriverNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Initialize camera when modal opens
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen) {
      setScanMessage({
        text: t('scanner.ready_msg', 'Scanner ready. Point camera at manifest barcode or choose a quick-scan package line below.'),
        type: 'info',
      });

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' } })
          .then((mediaStream) => {
            stream = mediaStream;
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.play().catch(() => {});
            }
            setCameraActive(true);
            setCameraError(null);
          })
          .catch(() => {
            setCameraActive(false);
            setCameraError(
              t('scanner.camera_unavailable', 'Live camera access unavailable or denied in this environment. Quick-scan and manual verification are fully active below.')
            );
          });
      } else {
        setCameraActive(false);
        setCameraError(t('scanner.camera_unsupported', 'Web camera API is not available on this device.'));
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, t]);

  if (!isOpen) return null;

  const handleSimulateScan = (code: string, itemName?: string) => {
    setManualCode(code);
    if (!scannedItems.includes(code)) {
      setScannedItems((prev) => [...prev, code]);
    }
    hapticFeedback.barcodeScanned();
    setScanMessage({
      text: `${t('scanner.scanned', 'Scanned')}: ${code}${itemName ? ` (${itemName})` : ''}`,
      type: 'success',
    });
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const trimmed = manualCode.trim().toUpperCase();
    if (!scannedItems.includes(trimmed)) {
      setScannedItems((prev) => [...prev, trimmed]);
    }
    hapticFeedback.barcodeScanned();
    setScanMessage({
      text: `${t('scanner.verified_badge', 'Verified')}: ${trimmed}`,
      type: 'success',
    });
  };

  const handleApplyTransitUpdate = async () => {
    setIsSubmitting(true);
    try {
      const activeBarcode = manualCode.trim() || dispatch.dispatchNumber;
      const matchedLineIds = dispatch.lines
        .filter((l) => scannedItems.includes(l.sku.toUpperCase()) || scannedItems.includes(dispatch.dispatchNumber))
        .map((l) => l.id);

      const updated = await api.recordTransitScan(dispatch.id, {
        barcode: activeBarcode,
        statusUpdate: selectedStatus,
        checkpointLocation: checkpointLocation.trim(),
        driverNotes: driverNotes.trim(),
        scannedLineIds: matchedLineIds,
        actorName: dispatch.driverName || 'Courier Driver',
      });

      hapticFeedback.dispatchCreated();
      setScanMessage({
        text: !isOnline
          ? t(
              'offline_sync.saved_offline_msg',
              'Delivery update saved locally in IndexedDB and will sync automatically when connectivity returns.'
            )
          : `${t('scanner.record_scan', 'Record Transit Scan')}: ${t('status.' + selectedStatus.toLowerCase(), selectedStatus.replace(/_/g, ' '))}`,
        type: 'success',
      });

      setTimeout(() => {
        onScanSuccess(updated);
        onClose();
      }, 650);
    } catch (err: any) {
      hapticFeedback.errorAlert();
      setScanMessage({
        text: err.message || t('msg.error'),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-white my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('scanner.title')}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t('scanner.subtitle', { dispatch: dispatch.dispatchNumber })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('action.close', 'Close')}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isOnline && scanMessage?.type !== 'success' && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {t(
                'offline_sync.saved_offline_msg',
                'Delivery update saved locally in IndexedDB and will sync automatically when connectivity returns.'
              )}
            </span>
          </div>
        )}

        {/* Scan Message / Alert */}
        {scanMessage && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              scanMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                : scanMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
            }`}
          >
            {scanMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : scanMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            ) : (
              <ScanLine className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>{scanMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          {/* Viewfinder Column */}
          <div className="space-y-4">
            <div className="relative aspect-video sm:aspect-square bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  <div className="absolute inset-8 border-2 border-indigo-400/60 rounded-xl pointer-events-none">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400"></div>
                    <div className="w-full h-0.5 bg-indigo-400/80 shadow-[0_0_8px_#818cf8] animate-pulse my-[45%]"></div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center space-y-2">
                  <Camera className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t('scanner.emulation_title')}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {cameraError || t('scanner.emulation_desc')}
                  </p>
                </div>
              )}
            </div>

            {/* Manual Scan Input */}
            <form onSubmit={handleManualScanSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={t('scanner.manual_input')}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-indigo-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-indigo-300 dark:border-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                {t('scanner.scan_btn')}
              </button>
            </form>
          </div>

          {/* Quick Line Item Verification Column */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  {t('scanner.package_lines_count', { count: dispatch.lines.length })}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('scanner.verified_count', { count: scannedItems.length })}
                </span>
              </div>

              {/* Master Manifest Barcode Button */}
              <button
                type="button"
                onClick={() => handleSimulateScan(dispatch.dispatchNumber, t('scanner.master_waybill'))}
                className={`w-full text-left p-2.5 min-h-[44px] rounded-xl border text-xs cursor-pointer transition-all mb-2 flex items-center justify-between ${
                  scannedItems.includes(dispatch.dispatchNumber)
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800 dark:bg-slate-950/60 dark:border-slate-800 dark:hover:border-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">{dispatch.dispatchNumber}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('scanner.master_waybill')}</div>
                  </div>
                </div>
                {scannedItems.includes(dispatch.dispatchNumber) ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" /> {t('scanner.scanned')}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-700 bg-white border border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700 px-2 py-0.5 rounded">
                    {t('scanner.quick_scan')}
                  </span>
                )}
              </button>

              {/* Line items quick scan list */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {dispatch.lines.map((line) => {
                  const isScanned = scannedItems.includes(line.sku.toUpperCase());
                  return (
                    <button
                      type="button"
                      key={line.id}
                      onClick={() => handleSimulateScan(line.sku.toUpperCase(), line.itemName)}
                      className={`w-full text-left p-2 min-h-[44px] rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isScanned
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800 dark:bg-slate-950/40 dark:border-slate-800/80 dark:hover:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-white">{line.sku}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">({line.quantitySent} {t('unit.' + line.unit.toLowerCase(), line.unit)})</span>
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[180px]">{t(line.itemName)}</div>
                      </div>

                      {isScanned ? (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> {t('scanner.verified_badge')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/60 dark:border-indigo-900/60 px-2 py-0.5 rounded">
                          {t('scanner.scan_line_btn')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transit Milestone & Status Select */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {t('scanner.transit_milestone')}
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_DOCK'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status as DispatchStatus)}
                    className={`py-2 px-2 min-h-[40px] rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      selectedStatus === status
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {status === 'IN_TRANSIT'
                      ? t('scanner.status_in_transit')
                      : status === 'OUT_FOR_DELIVERY'
                      ? t('scanner.status_out_delivery')
                      : t('scanner.status_arrived_dock')}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-sky-600 dark:text-sky-400" /> {t('scanner.checkpoint_location')}
                </label>
                <input
                  type="text"
                  value={checkpointLocation}
                  onChange={(e) => setCheckpointLocation(e.target.value)}
                  placeholder={t('scanner.placeholder_checkpoint', 'e.g., Chicago North Dock Bay 4')}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-500 dark:text-slate-400" /> {t('scanner.driver_notes')}
                </label>
                <input
                  type="text"
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder={t('scanner.placeholder_notes', 'e.g., Cargo verified intact on trailer 4921.')}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            {t('action.cancel')}
          </button>

          <button
            type="button"
            onClick={handleApplyTransitUpdate}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{t('scanner.record_scan')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

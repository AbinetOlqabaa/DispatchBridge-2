import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Truck,
  Package,
  MapPin,
  Warehouse,
  AlertCircle,
  CheckCircle2,
  Phone,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  ScanBarcode,
  WifiOff,
  Database,
} from 'lucide-react';
import { Location, Partner } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { BarcodeIntakeScanner } from '../../components/dispatches/BarcodeIntakeScanner.js';
import { mergeScannedItemsIntoDispatchLines, ParsedIntakeItem } from '../../utils/barcodeParser.js';
import { useOfflineSync } from '../../utils/offlineSync.js';
import { hapticFeedback } from '../../utils/haptics.js';

interface CreateDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dispatchId: string) => void;
  preselectedPartnerId?: string;
  preselectedItem?: {
    sku: string;
    name: string;
    unit: string;
    unitPrice: number;
  } | null;
}

export const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedPartnerId,
  preselectedItem,
}) => {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Form Fields
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState(preselectedPartnerId || '');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [notes, setNotes] = useState('');

  // Item lines
  const [lines, setLines] = useState<
    Array<{
      sku: string;
      itemName: string;
      unit: string;
      unitPrice: number;
      quantitySent: number;
      notes?: string;
    }>
  >([
    {
      sku: 'SKU-001',
      itemName: '',
      unit: 'cases',
      unitPrice: 0,
      quantitySent: 10,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(true);
  const [highlightedSkus, setHighlightedSkus] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      if (preselectedItem) {
        setLines([
          {
            sku: preselectedItem.sku,
            itemName: preselectedItem.name,
            unit: preselectedItem.unit || 'cases',
            unitPrice: preselectedItem.unitPrice || 0,
            quantitySent: 10,
          },
        ]);
      }
      loadData();
      setStep('input');
    }
  }, [isOpen, preselectedPartnerId, preselectedItem]);

  const loadData = async () => {
    try {
      const [pData, lData] = await Promise.all([api.getPartners(), api.getLocations()]);
      setPartners(pData);
      setLocations(lData);

      if (lData.length > 0 && !selectedLocationId) {
        const defaultLoc = lData.find((l) => l.isDefault) || lData[0];
        setSelectedLocationId(defaultLoc.id);
      }

      const effectivePartnerId = preselectedPartnerId || selectedPartnerId;
      if (effectivePartnerId) {
        setSelectedPartnerId(effectivePartnerId);
        const match = pData.find((p) => p.id === effectivePartnerId);
        if (match) setDestinationAddress(match.deliveryAddress);
      } else if (pData.length > 0) {
        setSelectedPartnerId(pData[0].id);
        setDestinationAddress(pData[0].deliveryAddress);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePartnerChange = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    const partner = partners.find((p) => p.id === partnerId);
    if (partner) {
      setDestinationAddress(partner.deliveryAddress);
    }
  };

  const handleAddLine = () => {
    const nextIndex = lines.length + 1;
    setLines([
      ...lines,
      {
        sku: `SKU-${String(nextIndex).padStart(3, '0')}`,
        itemName: '',
        unit: 'cases',
        unitPrice: 0,
        quantitySent: 1,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleItemsScanned = (
    scannedItems: ParsedIntakeItem[]
  ): { addedCount: number; incrementedCount: number; totalUnitsAdded: number } => {
    const res = mergeScannedItemsIntoDispatchLines(lines, scannedItems);
    setLines(res.lines);
    setErrorMessage(null);
    const matched = new Set<string>(res.affectedSkus);
    setHighlightedSkus(matched);
    setTimeout(() => {
      setHighlightedSkus((prev) => {
        const next = new Set(prev);
        matched.forEach((s) => next.delete(s));
        return next;
      });
    }, 1800);
    return {
      addedCount: res.addedCount,
      incrementedCount: res.incrementedCount,
      totalUnitsAdded: res.totalUnitsAdded,
    };
  };

  const validateInput = (): boolean => {
    setErrorMessage(null);
    if (!selectedPartnerId) {
      setErrorMessage(t('dispatch.err_select_partner', 'Please select a receiving partner.'));
      return false;
    }
    if (lines.length === 0) {
      setErrorMessage(t('dispatch.err_add_line', 'Please add at least one line item to the dispatch.'));
      return false;
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.itemName.trim()) {
        setErrorMessage(t('dispatch.err_missing_desc', 'Item line #{index} is missing a description.', { index: i + 1 }));
        return false;
      }
      if (typeof l.quantitySent !== 'number' || isNaN(l.quantitySent) || l.quantitySent <= 0) {
        setErrorMessage(
          t('dispatch.err_quantity_invalid', 'Item line #{index} ({name}) must have quantity > 0.', {
            index: i + 1,
            name: l.itemName || `#${i + 1}`,
          })
        );
        return false;
      }
    }
    return true;
  };

  const handleGoToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateInput()) {
      setStep('review');
    }
  };

  const handleCommitSubmit = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    const chosenLoc = locations.find((l) => l.id === selectedLocationId);
    const originLabel = chosenLoc?.label || 'Main Distribution Terminal';
    const originAddr = chosenLoc
      ? `${chosenLoc.addressLines}, ${chosenLoc.city}, ${chosenLoc.region}`
      : 'Registered Commercial Facility';

    try {
      const payload = {
        originLocationId: selectedLocationId,
        originLocationLabel: originLabel,
        originAddress: originAddr,
        partnerId: selectedPartnerId,
        destinationAddress,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleReg: vehicleReg.trim(),
        notes: notes.trim(),
        lines,
      };

      const created = await api.createDispatch(payload);
      hapticFeedback.dispatchCreated();
      onSuccess(created.id);
      onClose();
    } catch (err: any) {
      hapticFeedback.errorAlert();
      setErrorMessage(err.message || 'Failed to dispatch manifest.');
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalUnits = lines.reduce((sum, itm) => sum + (Number(itm.quantitySent) || 0), 0);
  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-slate-100 max-h-[92vh] flex flex-col">
        {/* Pinned Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {/* Stepper indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                step === 'input'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span>{t('dispatch.step_manifest_details')}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                step === 'review'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span>{t('dispatch.step_review')}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t('action.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isOnline && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 shrink-0">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {t(
                'dispatch.offline_queued',
                'Offline Mode: New dispatch manifest will be stored locally in IndexedDB and synced automatically when online.'
              )}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="my-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: INPUT DETAILS */}
        {step === 'input' && (
          <form onSubmit={handleGoToReview} className="flex-1 flex flex-col min-h-0 pt-3">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  {t('dispatch.origin_terminal_label')}
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {t(loc.label)} ({t(loc.city)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  {t('dispatch.dest_partner_label')}
                </label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => handlePartnerChange(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {t(p.name)} ({t(`partner.type_${p.type.toLowerCase()}`, p.type)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('dispatch.dest_address_label')}</label>
              <input
                type="text"
                required
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder={t('dispatch.placeholder_dest_address', 'Street address, Dock number, City')}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Carrier info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('dispatch.driver_name')}</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder={t('dispatch.placeholder_driver_name', 'e.g. Robert Lang')}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('dispatch.driver_phone')}</label>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+1 555-019-9021"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('dispatch.truck_plate')}</label>
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  placeholder={t('dispatch.placeholder_vehicle_plate', 'TRK-4921')}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>

            {/* Itemized Lines + Rapid Barcode / QR Intake Scanner */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  {t('dispatch.line_items_title', { count: lines.length })}
                </label>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums">{t('dispatch.total_units', { total: totalUnits })}</span>
                  <button
                    type="button"
                    data-testid="toggle-barcode-intake-btn"
                    onClick={() => setIsScannerOpen(!isScannerOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors min-h-[44px] ${
                      isScannerOpen
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:text-indigo-300 dark:border-indigo-500/50 dark:hover:bg-indigo-600/30'
                        : 'bg-slate-100 text-sky-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-sky-300 dark:border-slate-700 dark:hover:bg-slate-700'
                    }`}
                  >
                    <ScanBarcode className="w-4 h-4 shrink-0" />
                    <span>
                      {isScannerOpen
                        ? t('intake_scanner.hide_btn', 'Hide Scanner')
                        : t('intake_scanner.open_btn', 'Scan Barcode / QR')}
                    </span>
                  </button>
                </div>
              </div>

              {isScannerOpen && (
                <BarcodeIntakeScanner
                  onItemsScanned={handleItemsScanned}
                  onClose={() => setIsScannerOpen(false)}
                />
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {lines.map((item, index) => {
                  const isHighlighted = highlightedSkus.has(item.sku.trim().toUpperCase());
                  return (
                  <div
                    key={index}
                    className={`grid grid-cols-12 gap-2 p-2.5 rounded-xl border items-center text-xs transition-all ${
                      isHighlighted
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => handleLineChange(index, 'sku', e.target.value)}
                        placeholder={t('dispatch.placeholder_sku', 'SKU')}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-slate-200 font-mono text-[11px]"
                      />
                    </div>

                    <div className="col-span-8 sm:col-span-5">
                      <input
                        type="text"
                        required
                        value={item.itemName}
                        onChange={(e) => handleLineChange(index, 'itemName', e.target.value)}
                        placeholder={t('dispatch.placeholder_item_name', 'Item name / description')}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-slate-200"
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-2">
                      <select
                        value={item.unit}
                        onChange={(e) => handleLineChange(index, 'unit', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-slate-900 dark:text-slate-200"
                      >
                        <option value="cases">{t('unit.cases')}</option>
                        <option value="boxes">{t('unit.boxes')}</option>
                        <option value="cartons">{t('unit.cartons')}</option>
                        <option value="bags">{t('unit.bags')}</option>
                        <option value="units">{t('unit.units')}</option>
                        <option value="kg">{t('unit.kg')}</option>
                        <option value="pallets">{t('unit.pallets')}</option>
                        <option value="sacks">{t('unit.sacks')}</option>
                      </select>
                    </div>

                    <div className="col-span-5 sm:col-span-2">
                      <input
                        type="number"
                        required
                        min={0.1}
                        step="any"
                        value={item.quantitySent}
                        onChange={(e) => handleLineChange(index, 'quantitySent', parseFloat(e.target.value) || 0)}
                        placeholder={t('dispatch.placeholder_qty', 'Qty')}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white font-mono text-right"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1 text-right flex justify-end">
                      <button
                        type="button"
                        disabled={lines.length <= 1}
                        onClick={() => handleRemoveLine(index)}
                        aria-label={`Remove line ${index + 1}`}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>

              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg min-h-[44px] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('dispatch.add_line_item')}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('dispatch.delivery_notes')}</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('dispatch.placeholder_dispatch_instructions', 'Handling notes, temperature limits, delivery dock instructions...')}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0 mt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl cursor-pointer min-h-[44px]"
              >
                {t('action.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer min-h-[44px]"
              >
                <span>{t('dispatch.continue_review')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: PRE-SUBMISSION REVIEW */}
        {step === 'review' && (
          <div className="flex-1 flex flex-col min-h-0 pt-3">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {t('dispatch.review_summary')}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-500 font-semibold block">{t('dispatch.origin_terminal', 'Origin Terminal')}:</span>
                    <div className="font-semibold text-slate-900 dark:text-white">{t(selectedLocation?.label || 'Main Dock')}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">{t('table.destination_partner', 'Destination Partner')}:</span>
                    <div className="font-semibold text-slate-900 dark:text-white">{t(selectedPartner?.name || '')}</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">{destinationAddress}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">{t('dispatch.carrier_driver', 'Carrier / Driver')}:</span>
                    <div className="text-slate-800 dark:text-slate-200">{driverName || t('dispatch.carrier_unassigned', 'Unassigned')} ({vehicleReg || 'TRK'})</div>
                    {driverPhone && <div className="text-[11px] text-slate-600 dark:text-slate-400">{driverPhone}</div>}
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">{t('dispatch.total_manifest_qty')}</span>
                    <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-sm tabular-nums">
                      {t('dispatch.units_across_lines', { units: totalUnits, lines: lines.length })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line items preview table */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">{t('dispatch.item_breakdown')}</div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {lines.map((l, i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-indigo-600 dark:text-indigo-300 mr-2 text-[11px]">{l.sku}</span>
                        <span className="text-slate-800 dark:text-slate-200">{l.itemName}</span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-200 tabular-nums">
                        {l.quantitySent} {t(`unit.${l.unit}`, l.unit)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {notes && (
                <div className="bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500 font-semibold block">{t('dispatch.delivery_notes')}:</span>
                  {notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0 mt-3">
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('dispatch.back_to_edit')}</span>
              </button>

              <button
                type="button"
                onClick={handleCommitSubmit}
                disabled={isLoading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer min-h-[44px]"
              >
                {isLoading ? (
                  <span>{t('dispatch.generating_manifest')}</span>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>{t('dispatch.confirm_transmit')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

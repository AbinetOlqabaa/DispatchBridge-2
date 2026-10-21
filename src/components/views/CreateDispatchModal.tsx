import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Save,
  Building2,
  Calendar,
} from 'lucide-react';
import { Partner, UserRole } from '../../types/index.ts';
import { useAuth } from '../../services/authContext.tsx';
import { validatePhoneNumber } from '../../utils/reconciliation.ts';

interface CreateDispatchModalProps {
  partners: Partner[];
  onClose: () => void;
  onCreate: (
    payload: {
      originLocation: string;
      partnerId: string;
      destinationLocation: string;
      driverName: string;
      driverPhone: string;
      vehiclePlate: string;
      items: Array<{
        name: string;
        sku: string;
        dispatchedQty: number;
        unit: string;
        unitPrice: number;
      }>;
    },
    idempotencyKey: string
  ) => Promise<void>;
}

export const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  partners,
  onClose,
  onCreate,
}) => {
  const { currentUser, currentRole } = useAuth();

  // Form Fields
  const [originLocation, setOriginLocation] = useState('Central Warehouse Depot #1 (Dock B)');
  const [partnerId, setPartnerId] = useState(partners[0]?.id || '');
  const [destinationLocation, setDestinationLocation] = useState(partners[0]?.locationAddress || '');
  const [driverName, setDriverName] = useState('Carlos Gomez');
  const [driverPhone, setDriverPhone] = useState('+14155557788');
  const [vehiclePlate, setVehiclePlate] = useState('TRK-882-CAL');

  // Items Manifest
  const [items, setItems] = useState<
    Array<{
      id: string;
      name: string;
      sku: string;
      dispatchedQty: number;
      unit: string;
      unitPrice: number;
    }>
  >([
    {
      id: 'itm_init_1',
      name: 'Roasted Ethiopian Yirgacheffe (1kg)',
      sku: 'COF-ETH-001',
      dispatchedQty: 60,
      unit: 'Bags',
      unitPrice: 22.0,
    },
  ]);

  // Idempotency key generated once when the form opens
  const [idempotencyKey] = useState(
    () => `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update destination location when partner changes
  const handlePartnerChange = (newPartnerId: string) => {
    setPartnerId(newPartnerId);
    const selected = partners.find((p) => p.id === newPartnerId);
    if (selected) {
      setDestinationLocation(selected.locationAddress);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `itm_${Date.now()}_${prev.length}`,
        name: '',
        sku: `SKU-00${prev.length + 1}`,
        dispatchedQty: 10,
        unit: 'Units',
        unitPrice: 15.0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemFieldChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]:
          field === 'dispatchedQty' || field === 'unitPrice'
            ? Math.max(0, Number(value) || 0)
            : value,
      };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);

    // Validation
    if (!originLocation.trim()) {
      setErrorMessage('Origin location is required.');
      return;
    }
    if (!partnerId) {
      setErrorMessage('Please select a recipient trading partner.');
      return;
    }
    if (!driverName.trim()) {
      setErrorMessage('Driver name is required.');
      return;
    }

    const phoneValidation = validatePhoneNumber(driverPhone);
    if (!phoneValidation.isValid) {
      setErrorMessage(`Driver Phone: ${phoneValidation.error}`);
      return;
    }

    // Verify all items have names and quantities > 0
    for (let i = 0; i < items.length; i++) {
      if (!items[i].name.trim()) {
        setErrorMessage(`Item #${i + 1} must have a valid item description/name.`);
        return;
      }
      if (items[i].dispatchedQty <= 0) {
        setErrorMessage(`Item "${items[i].name}" must have a dispatched quantity greater than 0.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await onCreate(
        {
          originLocation: originLocation.trim(),
          partnerId,
          destinationLocation: destinationLocation.trim(),
          driverName: driverName.trim(),
          driverPhone: phoneValidation.normalized,
          vehiclePlate: vehiclePlate.trim().toUpperCase(),
          items: items.map((it) => ({
            name: it.name.trim(),
            sku: it.sku.trim().toUpperCase(),
            dispatchedQty: it.dispatchedQty,
            unit: it.unit.trim(),
            unitPrice: it.unitPrice,
          })),
        },
        idempotencyKey
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create dispatch.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-dispatch-title"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-dispatch-title" className="text-base sm:text-lg font-bold text-white">
                Create Delivery Dispatch
              </h2>
              <p className="text-xs text-slate-400">
                Generate an itemized shipment manifest with carrier details and recipient tracking.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Route & Recipient Partner */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>1. Partner & Destination</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Origin Location / Warehouse Depot *</label>
                <input
                  type="text"
                  required
                  value={originLocation}
                  onChange={(e) => setOriginLocation(e.target.value)}
                  placeholder="e.g. Central Warehouse Depot #1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Recipient Trading Partner *</label>
                <select
                  value={partnerId}
                  onChange={(e) => handlePartnerChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role}) - {p.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-medium mb-1">Destination Address / Receiving Bay *</label>
                <input
                  type="text"
                  required
                  value={destinationLocation}
                  onChange={(e) => setDestinationLocation(e.target.value)}
                  placeholder="e.g. Dock 4, 1800 Metro Parkway"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Driver & Transport Fleet */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-400" />
              <span>2. Transport & Carrier Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Driver Name *</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Driver Phone (E.164) *</label>
                <input
                  type="text"
                  required
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+14155557788"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Vehicle Plate / Unit ID *</label>
                <input
                  type="text"
                  required
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="TRK-882-CAL"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Cargo Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>3. Cargo Line Items Manifest ({items.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-medium border border-indigo-500/30 flex items-center gap-1 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] text-slate-400 mb-0.5">Item Name / Description</label>
                    <input
                      type="text"
                      required
                      value={item.name}
                      onChange={(e) => handleItemFieldChange(idx, 'name', e.target.value)}
                      placeholder="e.g. Colombian Supremo Coffee (500g)"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-[11px] text-slate-400 mb-0.5">SKU</label>
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => handleItemFieldChange(idx, 'sku', e.target.value)}
                      placeholder="SKU"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono"
                    />
                  </div>

                  <div className="w-full sm:w-20">
                    <label className="block text-[11px] text-slate-400 mb-0.5">Qty</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={item.dispatchedQty}
                      onChange={(e) => handleItemFieldChange(idx, 'dispatchedQty', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-bold"
                    />
                  </div>

                  <div className="w-full sm:w-24">
                    <label className="block text-[11px] text-slate-400 mb-0.5">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                    >
                      <option value="Units">Units</option>
                      <option value="Bags">Bags</option>
                      <option value="Boxes">Boxes</option>
                      <option value="Crates">Crates</option>
                      <option value="Tins">Tins</option>
                      <option value="Bottles">Bottles</option>
                      <option value="Pallets">Pallets</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-24">
                    <label className="block text-[11px] text-slate-400 mb-0.5">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => handleItemFieldChange(idx, 'unitPrice', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer sm:mt-4"
                      title="Remove item"
                      aria-label={`Remove item ${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Idempotency Notice */}
          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>Idempotency token: {idempotencyKey.slice(0, 16)}...</span>
            <span>Duplicate submissions guarded</span>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering Dispatch...' : 'Dispatch Shipment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

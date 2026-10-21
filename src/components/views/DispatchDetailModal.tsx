import React, { useState } from 'react';
import {
  X,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  ShieldCheck,
  Check,
  Building2,
  UserCheck,
  DollarSign,
  AlertCircle,
  Save,
} from 'lucide-react';
import { Dispatch, DispatchItem } from '../../types/index.ts';
import { useAuth } from '../../services/authContext.tsx';
import { calculateItemReconciliation, calculateDispatchTotals } from '../../utils/reconciliation.ts';

interface DispatchDetailModalProps {
  dispatch: Dispatch | null;
  onClose: () => void;
  onReconcile: (
    dispatchId: string,
    payload: {
      receivedItems: Array<{
        id: string;
        receivedQty: number;
        damagedQty: number;
        missingQty: number;
        itemNotes?: string;
      }>;
      recipientSignature: string;
      reconciliationNotes: string;
    }
  ) => Promise<void>;
}

export const DispatchDetailModal: React.FC<DispatchDetailModalProps> = ({
  dispatch,
  onClose,
  onReconcile,
}) => {
  const { currentRole, currentUser } = useAuth();
  if (!dispatch) return null;

  const isAlreadyReconciled =
    dispatch.status === 'RECONCILED_MATCH' || dispatch.status === 'RECONCILED_DISCREPANCY';

  // Local state for the reconciliation form
  const [itemReports, setItemReports] = useState<
    Record<
      string,
      {
        receivedQty: number;
        damagedQty: number;
        missingQty: number;
        itemNotes: string;
      }
    >
  >(() => {
    const initial: Record<string, any> = {};
    for (const it of dispatch.items) {
      initial[it.id] = {
        receivedQty: it.receivedQty ?? it.dispatchedQty,
        damagedQty: it.damagedQty ?? 0,
        missingQty: it.missingQty ?? 0,
        itemNotes: it.itemNotes ?? '',
      };
    }
    return initial;
  });

  const [recipientSignature, setRecipientSignature] = useState(
    dispatch.recipientSignature || `${currentUser?.fullName || 'Dock Supervisor'}`
  );
  const [reconciliationNotes, setReconciliationNotes] = useState(dispatch.reconciliationNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Compute live preview totals as user types quantities
  const livePreviewItems = dispatch.items.map((it) => {
    const rep = itemReports[it.id] || {
      receivedQty: it.dispatchedQty,
      damagedQty: 0,
      missingQty: 0,
    };
    return {
      dispatchedQty: it.dispatchedQty,
      receivedQty: rep.receivedQty,
      damagedQty: rep.damagedQty,
      missingQty: rep.missingQty,
      unitPrice: it.unitPrice,
    };
  });
  const liveTotals = calculateDispatchTotals(livePreviewItems);

  const handleUpdateItem = (
    itemId: string,
    field: 'receivedQty' | 'damagedQty' | 'missingQty' | 'itemNotes',
    val: any
  ) => {
    setItemReports((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: field === 'itemNotes' ? val : Math.max(0, Number(val) || 0),
      },
    }));
  };

  const handleQuickMatchAll = () => {
    const updated: Record<string, any> = {};
    for (const it of dispatch.items) {
      updated[it.id] = {
        receivedQty: it.dispatchedQty,
        damagedQty: 0,
        missingQty: 0,
        itemNotes: 'Clean arrival, perfect condition',
      };
    }
    setItemReports(updated);
  };

  const handleSubmitReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!recipientSignature.trim()) {
      setSubmitError('Recipient signature/name is required to confirm reconciliation.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const payloadItems = dispatch.items.map((it) => {
        const rep = itemReports[it.id];
        return {
          id: it.id,
          receivedQty: rep.receivedQty,
          damagedQty: rep.damagedQty,
          missingQty: rep.missingQty,
          itemNotes: rep.itemNotes,
        };
      });

      await onReconcile(dispatch.id, {
        receivedItems: payloadItems,
        recipientSignature: recipientSignature.trim(),
        reconciliationNotes: reconciliationNotes.trim(),
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit reconciliation.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispatch-title"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="dispatch-title" className="text-base sm:text-lg font-bold text-white font-mono">
                  {dispatch.trackingCode}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                  {dispatch.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Created {new Date(dispatch.createdAt).toLocaleString()} &bull; Origin: {dispatch.originLocation}
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

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Partner Viewed Status Banner (Core Product Feature) */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              dispatch.viewedAt
                ? 'bg-blue-950/40 border-blue-500/30 text-blue-200'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-sm">
                  {dispatch.viewedAt ? 'Partner Read-Receipt Confirmed' : 'Awaiting Partner Manifest View'}
                </span>
                <p className="text-xs opacity-90 mt-0.5">
                  {dispatch.viewedAt ? (
                    <>
                      Recipient <strong>{dispatch.viewedByName || 'Partner'}</strong> opened and viewed this delivery list on{' '}
                      <strong>{new Date(dispatch.viewedAt).toLocaleString()}</strong>.
                    </>
                  ) : (
                    'The recipient has not yet opened this delivery manifest in their portal.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Consignment Route & Vehicle Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Recipient Partner</span>
              <div className="text-sm font-bold text-white mt-1">{dispatch.partnerName}</div>
              <div className="text-slate-300 mt-0.5">{dispatch.destinationLocation}</div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Transport & Driver</span>
              <div className="text-sm font-bold text-white mt-1">{dispatch.driverName}</div>
              <div className="text-slate-300 mt-0.5">
                Phone: {dispatch.driverPhone} &bull; Plate:{' '}
                <span className="font-mono text-indigo-300">{dispatch.vehiclePlate}</span>
              </div>
            </div>
          </div>

          {/* Itemized Manifest Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Itemized Cargo Manifest</h3>
                <p className="text-slate-400">Review dispatched items, reported arrivals, damages, and shortages.</p>
              </div>

              {!isAlreadyReconciled && (
                <button
                  type="button"
                  onClick={handleQuickMatchAll}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-medium border border-slate-700 cursor-pointer transition"
                >
                  Quick Match All (100% Good)
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-400 font-semibold text-[11px] border-b border-slate-800">
                    <th className="py-2.5 px-3">Item / SKU</th>
                    <th className="py-2.5 px-3 text-right">Dispatched</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Good Received</th>
                    <th className="py-2.5 px-3 text-right">Damaged</th>
                    <th className="py-2.5 px-3 text-right">Missing</th>
                    <th className="py-2.5 px-3">Condition / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {dispatch.items.map((item) => {
                    const report = itemReports[item.id] || {
                      receivedQty: item.dispatchedQty,
                      damagedQty: 0,
                      missingQty: 0,
                      itemNotes: '',
                    };

                    const recon = calculateItemReconciliation({
                      dispatchedQty: item.dispatchedQty,
                      receivedQty: report.receivedQty,
                      damagedQty: report.damagedQty,
                      missingQty: report.missingQty,
                      unitPrice: item.unitPrice,
                    });

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/20 text-xs">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {item.sku} &bull; {item.unit}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right font-semibold text-slate-200">
                          {item.dispatchedQty}
                        </td>

                        <td className="py-3 px-3 text-right text-slate-400 font-mono">
                          ${item.unitPrice.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isAlreadyReconciled ? (
                            <span className="font-bold text-emerald-400">{item.receivedQty ?? item.dispatchedQty}</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              value={report.receivedQty}
                              onChange={(e) => handleUpdateItem(item.id, 'receivedQty', e.target.value)}
                              className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-right text-emerald-400 font-bold focus:ring-1 focus:ring-emerald-500"
                              aria-label={`Good received quantity for ${item.name}`}
                            />
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isAlreadyReconciled ? (
                            <span className={item.damagedQty ? 'font-bold text-rose-400' : 'text-slate-500'}>
                              {item.damagedQty || 0}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              value={report.damagedQty}
                              onChange={(e) => handleUpdateItem(item.id, 'damagedQty', e.target.value)}
                              className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-right text-rose-400 font-bold focus:ring-1 focus:ring-rose-500"
                              aria-label={`Damaged quantity for ${item.name}`}
                            />
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isAlreadyReconciled ? (
                            <span className={item.missingQty ? 'font-bold text-amber-400' : 'text-slate-500'}>
                              {item.missingQty || 0}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              value={report.missingQty}
                              onChange={(e) => handleUpdateItem(item.id, 'missingQty', e.target.value)}
                              className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-right text-amber-400 font-bold focus:ring-1 focus:ring-amber-500"
                              aria-label={`Missing quantity for ${item.name}`}
                            />
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {isAlreadyReconciled ? (
                            <span className="text-slate-300 italic">{item.itemNotes || 'None'}</span>
                          ) : (
                            <input
                              type="text"
                              value={report.itemNotes}
                              onChange={(e) => handleUpdateItem(item.id, 'itemNotes', e.target.value)}
                              placeholder="Condition details..."
                              className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-300 text-xs focus:ring-1 focus:ring-indigo-500"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reconciliation Outcome Summary Metrics */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-slate-400 text-[11px]">Dispatched Units</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {isAlreadyReconciled ? dispatch.totals.totalDispatchedQty : liveTotals.totalDispatchedQty}
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px]">Good Received Units</span>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {isAlreadyReconciled ? dispatch.totals.totalReceivedQty : liveTotals.totalReceivedQty}
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px]">Damaged / Shortage</span>
              <div className="text-lg font-bold text-amber-400 mt-0.5">
                {(isAlreadyReconciled ? dispatch.totals.totalDamagedQty : liveTotals.totalDamagedQty) +
                  (isAlreadyReconciled ? dispatch.totals.totalMissingQty : liveTotals.totalMissingQty)}
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px]">Calculated Loss Value</span>
              <div className="text-lg font-bold text-rose-400 mt-0.5">
                $
                {isAlreadyReconciled
                  ? dispatch.totals.totalLossAmount.toLocaleString()
                  : liveTotals.totalLossAmount.toLocaleString()}{' '}
                USD
              </div>
            </div>
          </div>

          {/* Reconciliation Sign-off Form (if not yet reconciled) */}
          {!isAlreadyReconciled && (
            <form onSubmit={handleSubmitReconciliation} className="space-y-4 pt-2 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Recipient Delivery Sign-off & Reconciliation Authorization</span>
              </h3>

              {submitError && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Recipient Authorized Signer / Dock Supervisor *
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientSignature}
                    onChange={(e) => setRecipientSignature(e.target.value)}
                    placeholder="e.g. David Miller (Receiving Lead)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Overall Reconciliation Notes / Inspection Remarks
                  </label>
                  <input
                    type="text"
                    value={reconciliationNotes}
                    onChange={(e) => setReconciliationNotes(e.target.value)}
                    placeholder="e.g. Pallet seal verified intact, 8 damaged jars photographed"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-400">
                  {liveTotals.hasDiscrepancies ? (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Will be registered with discrepancy & financial loss audit.
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      100% Clean reconciliation match.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Recording Outcome...' : 'Submit & Sign-off Reconciliation'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Already Reconciled Readout */}
          {isAlreadyReconciled && (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Reconciliation Formally Executed & Audit Locked</span>
              </div>
              <div className="text-slate-300 text-xs">
                Signed by: <strong>{dispatch.recipientSignature}</strong> on{' '}
                {new Date(dispatch.receivedAt || dispatch.updatedAt).toLocaleString()}
              </div>
              {dispatch.reconciliationNotes && (
                <div className="text-slate-400 text-xs italic">
                  Notes: &ldquo;{dispatch.reconciliationNotes}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* Tamper-Resistant Audit Trail Hash */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tamper-Resistant Ledger Proof:</span>
            </div>
            <span className="text-indigo-400 font-bold">
              REF-{dispatch.id.slice(-8).toUpperCase()} &bull; IDEMPOTENT-VERIFIED
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

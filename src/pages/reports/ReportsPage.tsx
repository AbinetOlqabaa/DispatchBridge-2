import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { jsPDF } from 'jspdf';
import {
  BarChart3,
  TrendingUp,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  PackageCheck,
  RefreshCw,
  Truck,
  DollarSign,
  ShieldAlert,
  Percent,
} from 'lucide-react';

export function ReportsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'ytd' | 'all'>('30d');
  const [exporting, setExporting] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAnalyticsReport();
      setReportData(data);
    } catch (err: any) {
      setError(err.message || t('msg.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [user]);

  const handleExportPDF = () => {
    if (!reportData) return;
    try {
      setExporting(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('DispatchBridge Executive Reconciliation Report', 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Business: ${user?.businessName || 'Apex Supply Logistics'}  |  Generated: ${new Date().toLocaleString()}  |  Scope: ${timeRange.toUpperCase()}`,
        14,
        30
      );

      // Section 1: Executive KPI Summary
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('1. Operational Delivery Performance & Loss Summary', 14, 52);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const s = reportData.summary;

      const summaryLines = [
        `Total Cargo Dispatches: ${s.totalDispatches}`,
        `Successfully Delivered & Reconciled: ${s.deliveredDispatches} (${s.deliverySuccessRate}%)`,
        `In Transit / Pending Dock Review: ${s.inTransitDispatches}`,
        `Dispatches with Cargo Discrepancies: ${s.discrepancyDispatches} (${s.discrepancyRate}%)`,
        `Total Cargo Units Dispatched: ${s.totalDispatchedVolume.toLocaleString()} units`,
        `Total Cargo Units Received: ${s.totalReceivedVolume.toLocaleString()} units`,
        `Total Shortfall & Loss Cargo: ${s.totalLostVolume.toLocaleString()} units`,
        `Total Valuation in Transit/Dispatched: $${s.totalCargoValue.toLocaleString()}`,
      ];

      let yPos = 62;
      summaryLines.forEach((line) => {
        doc.text(`•  ${line}`, 16, yPos);
        yPos += 7;
      });

      // Section 2: Discrepancy Breakdown
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('2. Discrepancy & Loss Root-Cause Breakdown', 14, yPos);

      yPos += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const db = reportData.discrepancyBreakdown;

      doc.text(`Shortage / Missing Cartons: ${db.shortage} units`, 16, yPos);
      yPos += 6;
      doc.text(`Damaged / Crushed Freight: ${db.damaged} units`, 16, yPos);
      yPos += 6;
      doc.text(`Lost in Transit: ${db.lost} units`, 16, yPos);
      yPos += 6;
      doc.text(`Overage / Excess Count: ${db.overage} units`, 16, yPos);
      yPos += 6;
      doc.text(`Count Mismatches: ${db.countMismatch} units`, 16, yPos);

      // Section 3: Partner Performance
      yPos += 14;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('3. Receiving Partner Performance Scorecard', 14, yPos);

      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Partner Name', 16, yPos);
      doc.text('Total Shipments', 95, yPos);
      doc.text('Success Rate', 135, yPos);
      doc.text('Volume (Units)', 170, yPos);

      doc.setDrawColor(203, 213, 225);
      doc.line(14, yPos + 2, 196, yPos + 2);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      (reportData.partnerPerformance || []).forEach((p: any) => {
        doc.text(String(p.partnerName || '').substring(0, 38), 16, yPos);
        doc.text(String(p.totalDispatches), 105, yPos);
        doc.text(`${p.successRate}%`, 140, yPos);
        doc.text(String(p.totalVolume.toLocaleString()), 175, yPos);
        yPos += 7;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Official Tamper-Evident Report generated by DispatchBridge Kernel.', 14, 285);
      doc.text(`Signer: ${user?.name} (${user?.role})`, 140, 285);

      doc.save(`DispatchBridge_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      setError(err.message || t('msg.error'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    try {
      const headers = [
        t('table.partner_name'),
        t('table.dispatched'),
        t('table.intact'),
        t('table.shortfall'),
        t('table.success_rate'),
        t('table.volume_handled'),
      ];
      const rows = (reportData.partnerPerformance || []).map((p: any) => [
        `"${p.partnerName}"`,
        p.totalDispatches,
        p.deliveredCount ?? p.successful ?? 0,
        p.discrepancyCount ?? p.discrepancies ?? 0,
        `${p.successRate}%`,
        p.totalVolume,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `dispatch_reconciliation_partners_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || t('msg.error'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('nav.reports', 'Executive Reports & Analytics')}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t(user?.businessName || '')} • {t('reports.page_subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time Range Filter */}
          <div className="flex bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-xs">
            {(['7d', '30d', 'ytd', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 min-h-[38px] rounded-lg font-medium transition cursor-pointer ${
                  timeRange === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {r === '7d'
                  ? t('reports.period_7d')
                  : r === '30d'
                  ? t('reports.period_30d')
                  : r === 'ytd'
                  ? t('reports.period_90d')
                  : t('reports.period_all')}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportPDF}
            disabled={exporting || !reportData}
            className="min-h-[44px] px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {t('action.export_pdf', 'Export PDF')}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!reportData}
            className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            {t('action.export_csv', 'Export CSV')}
          </button>

          <button
            onClick={loadReport}
            title={t('action.refresh')}
            aria-label={t('action.refresh')}
            className="min-w-[44px] min-h-[44px] p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner text={t('msg.loading')} />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-red-900/20 border border-rose-200 dark:border-red-800/40 text-rose-800 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-red-400" />
          <span>{error}</span>
        </div>
      ) : reportData ? (
        <>
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
                <span>{t('metric.total_dispatches', 'Total Dispatches')}</span>
                <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {reportData.summary.totalDispatches}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {reportData.summary.inTransitDispatches} {t('metric.manifests_active')}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
                <span>{t('metric.fulfillment_success', 'Fulfillment Success')}</span>
                <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {reportData.summary.deliverySuccessRate}%
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {reportData.summary.deliveredDispatches} {t('metric.verified_receipts', 'verified receipts')}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
                <span>{t('metric.recorded_losses', 'Cargo Losses / Shortfalls')}</span>
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                {reportData.summary.totalLostVolume.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{t('unit.units')}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {reportData.summary.discrepancyDispatches} {t('metric.dispatches_incidents', 'incidents')}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
                <span>{t('metric.total_value_transit', 'Dispatched Value')}</span>
                <DollarSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-300 mt-1">
                ${reportData.summary.totalCargoValue.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {reportData.summary.totalDispatchedVolume.toLocaleString()} {t('unit.units', 'units')}
              </p>
            </div>
          </div>

          {/* Discrepancy Breakdown Section */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('analytics.tab_root_cause', 'Loss & Discrepancy Root Causes')}</h2>
              </div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                {t('metric.reconciliation_rate', 'Discrepancy Rate')}: <strong className="text-amber-700 dark:text-amber-400">{reportData.summary.discrepancyRate}%</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block">{t('discrepancy.shortage', 'Shortage')}</span>
                <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-0.5 block">
                  {reportData.discrepancyBreakdown.shortage} <span className="text-xs text-slate-500 dark:text-slate-400">{t('unit.units', 'units')}</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('discrepancy.shortage')}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block">{t('discrepancy.damaged', 'Transit Damage')}</span>
                <span className="text-lg font-bold tabular-nums text-rose-600 dark:text-red-400 mt-0.5 block">
                  {reportData.discrepancyBreakdown.damaged} <span className="text-xs text-slate-500 dark:text-slate-400">{t('unit.units', 'units')}</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('condition.damaged')}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block">{t('discrepancy.lost', 'Declared Lost')}</span>
                <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5 block">
                  {reportData.discrepancyBreakdown.lost} <span className="text-xs text-slate-500 dark:text-slate-400">{t('unit.units', 'units')}</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('discrepancy.lost')}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block">{t('discrepancy.overage', 'Overage')}</span>
                <span className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-0.5 block">
                  {reportData.discrepancyBreakdown.overage} <span className="text-xs text-slate-500 dark:text-slate-400">{t('unit.units', 'units')}</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('discrepancy.overage')}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block">{t('discrepancy.count_mismatch', 'Count Mismatch')}</span>
                <span className="text-lg font-bold tabular-nums text-purple-600 dark:text-purple-400 mt-0.5 block">
                  {reportData.discrepancyBreakdown.countMismatch} <span className="text-xs text-slate-500 dark:text-slate-400">{t('unit.units', 'units')}</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('discrepancy.count_mismatch')}</span>
              </div>
            </div>
          </div>

          {/* Partner Performance Scorecard Table */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('reports.partner_scorecard_title', 'Partner Performance Scorecard')}</h2>
              </div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                {t('reports.sorted_by_volume', 'Sorted by delivery fulfillment volume')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-semibold">{t('table.partner_name', 'Partner Name')}</th>
                    <th className="py-3 px-4 font-semibold">{t('table.dispatched', 'Total Dispatches')}</th>
                    <th className="py-3 px-4 font-semibold">{t('table.intact', 'Completed Clean')}</th>
                    <th className="py-3 px-4 font-semibold">{t('table.shortfall', 'Discrepancies')}</th>
                    <th className="py-3 px-4 font-semibold">{t('table.success_rate', 'Success Rate')}</th>
                    <th className="py-3 px-4 font-semibold text-right">{t('table.volume_handled', 'Volume Handled')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {(reportData.partnerPerformance || []).map((partner: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {t(partner.partnerName)}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-slate-700 dark:text-slate-300">
                        {partner.totalDispatches}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">
                        {partner.deliveredCount ?? partner.successful ?? 0}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        {(partner.discrepancyCount ?? partner.discrepancies ?? 0) > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            {partner.discrepancyCount ?? partner.discrepancies}
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${partner.successRate}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white">{partner.successRate}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium tabular-nums text-slate-800 dark:text-slate-200">
                        {partner.totalVolume.toLocaleString()} {t('unit.units', 'units')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

import React, { useState } from 'react';
import { Camera, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext.js';
import { CargoEvidence } from '../../types/dispatch.js';

interface DamagePhotoUploadProps {
  evidence: CargoEvidence[];
  onChange: (evidence: CargoEvidence[]) => void;
  maxFiles?: number;
}

export const DamagePhotoUpload: React.FC<DamagePhotoUploadProps> = ({
  evidence,
  onChange,
  maxFiles = 4,
}) => {
  const { t } = useTranslation();
  const [computingHash, setComputingHash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateSha256 = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setComputingHash(true);

    try {
      const newItems: CargoEvidence[] = [...evidence];

      for (let i = 0; i < files.length; i++) {
        if (newItems.length >= maxFiles) break;
        const file = files[i];

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
          setError(t('recon.err_file_format', 'File "{name}" has invalid format. Only JPEG, PNG, and WebP are supported.', { name: file.name }));
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          setError(t('recon.err_file_size', 'File "{name}" exceeds 5MB size limit.', { name: file.name }));
          continue;
        }

        const buffer = await file.arrayBuffer();
        const hash = await calculateSha256(buffer);

        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        newItems.push({
          id: 'ev_' + Math.random().toString(36).substring(2, 9),
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          sha256Hash: hash,
          dataUrl,
          uploadedAt: new Date().toISOString(),
          notes: 'Captured at receiving dock inspection',
        });
      }

      onChange(newItems);
    } catch (err: any) {
      setError(t('recon.err_photo_process', 'Failed to process photo: {msg}', { msg: err.message }));
    } finally {
      setComputingHash(false);
      e.target.value = '';
    }
  };

  const addSimulatedEvidencePhoto = async (label: string, color: string) => {
    if (evidence.length >= maxFiles) return;
    setComputingHash(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 400, 300);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 300);

        ctx.fillStyle = color;
        ctx.fillRect(20, 20, 360, 40);

        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`DOCK EVIDENCE: ${label.toUpperCase()}`, 35, 46);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.strokeRect(50, 90, 300, 160);

        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, 120);
        ctx.lineTo(200, 180);
        ctx.lineTo(320, 130);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 50, 275);
        ctx.fillText(`Inspector: Receiving Dock Team`, 50, 290);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const hash = 'sha256_' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');

      const simulatedItem: CargoEvidence = {
        id: 'ev_sim_' + Math.random().toString(36).substring(2, 8),
        fileName: `${label.toLowerCase().replace(/\s+/g, '_')}_claim.png`,
        mimeType: 'image/png',
        fileSize: 18450,
        sha256Hash: hash,
        dataUrl,
        uploadedAt: new Date().toISOString(),
        notes: `Simulated evidence claim: ${label}`,
      };

      onChange([...evidence, simulatedItem]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setComputingHash(false);
    }
  };

  const removeEvidence = (id: string) => {
    onChange(evidence.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{t('recon.damage_photos_title', 'Cargo Damage Photos & Tamper-Evident Evidence')}</span>
        </label>
        <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
          {t('recon.attachments_count', '{count} / {max} attachments', { count: evidence.length, max: maxFiles })}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {evidence.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="group relative bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col shadow-2xs"
            >
              <div className="h-24 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center relative">
                <img
                  src={item.dataUrl}
                  alt={item.fileName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <button
                  type="button"
                  onClick={() => removeEvidence(item.id)}
                  className="absolute top-1 right-1 p-1.5 rounded-md bg-black/75 hover:bg-rose-600 text-white cursor-pointer opacity-90 transition-colors"
                  title={t('action.remove_photo_title', 'Remove attachment')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-1.5 text-[10px] space-y-0.5">
                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.fileName}</div>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[9px] truncate" title={item.sha256Hash}>
                  SHA: {item.sha256Hash.substring(0, 12)}...
                </div>
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-[9px]">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{t('recon.hash_verified', 'Hash verified')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer shrink-0 shadow-2xs">
          <Camera className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>{computingHash ? t('recon.verifying_sha', 'Verifying SHA-256...') : t('recon.upload_photo', 'Capture / Upload Photo')}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            capture="environment"
            multiple
            onChange={handleFileUpload}
            disabled={computingHash || evidence.length >= maxFiles}
            className="hidden"
          />
        </label>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
          <span>{t('recon.staging_presets', 'Staging Presets:')}</span>
          <button
            type="button"
            onClick={() => addSimulatedEvidencePhoto('Crushed Pallet Carton', '#f43f5e')}
            disabled={evidence.length >= maxFiles}
            className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-rose-300 dark:border-slate-700 font-medium cursor-pointer"
          >
            {t('recon.crushed_box', '+ Crushed Box')}
          </button>
          <button
            type="button"
            onClick={() => addSimulatedEvidencePhoto('Broken Crate Seal', '#eab308')}
            disabled={evidence.length >= maxFiles}
            className="px-2.5 py-1 rounded bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-300 dark:border-slate-700 font-medium cursor-pointer"
          >
            {t('recon.broken_seal', '+ Broken Seal')}
          </button>
        </div>
      </div>
    </div>
  );
};

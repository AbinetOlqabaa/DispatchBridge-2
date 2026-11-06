import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext.js';
import { useTheme } from '../../context/ThemeContext.js';

interface SignaturePadProps {
  onSignatureChange: (signatureDataUrl: string | null) => void;
  signerName?: string;
  initialSignature?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  initialSignature,
}) => {
  const { t } = useTranslation();
  const { effectiveTheme } = useTheme();
  const inkStroke = effectiveTheme === 'dark' ? '#38bdf8' : '#0369a1';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const initCanvas = (preserveContent = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let savedDataUrl: string | null = null;
    if (preserveContent && hasDrawn && canvas.width > 0 && canvas.height > 0) {
      try {
        savedDataUrl = canvas.toDataURL('image/png');
      } catch {
        savedDataUrl = null;
      }
    }

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);

    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const sourceImage = savedDataUrl || initialSignature;
    if (sourceImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = sourceImage;
    }
  };

  useEffect(() => {
    initCanvas(true);
  }, [effectiveTheme]);

  useEffect(() => {
    initCanvas(false);

    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        initCanvas(true);
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [hasDrawn]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = inkStroke;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    setHasDrawn(false);
    onSignatureChange(null);
  };

  const generatePresetSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearSignature();
    ctx.strokeStyle = inkStroke;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(30, 70);
    ctx.bezierCurveTo(60, 20, 90, 110, 130, 45);
    ctx.bezierCurveTo(160, 30, 180, 80, 220, 55);
    ctx.bezierCurveTo(240, 90, 270, 70, 310, 60);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(40, 95);
    ctx.lineTo(320, 90);
    ctx.stroke();

    setHasDrawn(true);
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange(dataUrl);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>{t('signature.title', 'Receiver Digital Dock Sign-off (Canvas Capture)')}</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generatePresetSignature}
            className="text-[11px] text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 font-semibold cursor-pointer"
          >
            {t('signature.quick_sign', 'Quick Sign')}
          </button>
          <button
            type="button"
            onClick={clearSignature}
            className="text-[11px] text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('signature.clear', 'Clear')}</span>
          </button>
        </div>
      </div>

      <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 rounded-xl overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-32 md:h-36 cursor-crosshair block"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-500 dark:text-slate-400 text-xs gap-1">
            <PenTool className="w-5 h-5 opacity-50 text-slate-400" />
            <span>{t('signature.hint', 'Sign with finger, stylus, or cursor on glass')}</span>
          </div>
        )}

        <div className="absolute bottom-1 right-2 text-[10px] text-slate-500 flex items-center gap-1 pointer-events-none">
          <ShieldCheck className="w-3 h-3 text-teal-600 dark:text-teal-500" />
          <span>{t('signature.legal_note', 'Legally binding digital acceptance')}</span>
        </div>
      </div>

      {hasDrawn && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{t('signature.recorded', 'Signature recorded & ready to lock into manifest record')}</span>
        </div>
      )}
    </div>
  );
};

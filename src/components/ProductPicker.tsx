import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Product } from '../types';
import { toEnglishDigits, toPersianDigits } from '../utils/jalali';

// اسکن بارکد با دوربین (در Chrome اندروید با BarcodeDetector)
export const BarcodeScannerModal: React.FC<{ onDetected: (code: string) => void; onClose: () => void }> = ({
  onDetected,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setError('این مرورگر اسکن با دوربین را پشتیبانی نمی‌کند. کد را با اسکنر بارکد یا تایپ وارد کنید.');
      return;
    }
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: number | undefined;
    const detector = new Detector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => undefined);
        }
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length && !stopped) {
              stopped = true;
              onDetected(codes[0].rawValue);
              return;
            }
          } catch {
            // فریم بعدی را امتحان کن
          }
          timer = window.setTimeout(tick, 300);
        };
        tick();
      })
      .catch(() => setError('دسترسی به دوربین داده نشد.'));

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[95] bg-black/80 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">اسکن بارکد</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        {error ? (
          <p className="text-xs text-rose-600">{error}</p>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black aspect-[4/3] object-cover" />
            <p className="text-[11px] text-slate-500 text-center">بارکد را در کادر قرار بده.</p>
          </>
        )}
      </div>
    </div>
  );
};

interface PickerProps {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
}

// انتخاب کالا با جستجو، بارکد (تایپ یا اسکنر) و دوربین
export const ProductPicker: React.FC<PickerProps> = ({ products, value, onChange }) => {
  const [q, setQ] = useState('');
  const [scanning, setScanning] = useState(false);
  const norm = toEnglishDigits(q).trim().toLowerCase();

  const list = useMemo(
    () =>
      products.filter(
        (p) => !norm || p.name.toLowerCase().includes(norm) || p.code.toLowerCase().includes(norm)
      ),
    [products, norm]
  );

  const pickByCode = (code: string): boolean => {
    const c = toEnglishDigits(code).trim();
    const hit = products.find((p) => p.code === c);
    if (hit) {
      onChange(hit.id);
      setQ('');
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !q.trim()) return;
            if (!pickByCode(q) && list[0]) {
              onChange(list[0].id);
              setQ('');
            }
          }}
          placeholder="جستجوی نام، کد یا بارکد (و Enter)"
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="shrink-0 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center gap-1"
        >
          <Camera className="w-3.5 h-3.5" />
          اسکن
        </button>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        <option value="">انتخاب کنید...</option>
        {list.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.code}) - موجودی: {toPersianDigits(p.stock)}
          </option>
        ))}
      </select>
      {scanning && (
        <BarcodeScannerModal
          onClose={() => setScanning(false)}
          onDetected={(code) => {
            setScanning(false);
            if (!pickByCode(code)) setQ(code);
          }}
        />
      )}
    </div>
  );
};

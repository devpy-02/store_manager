import React, { useMemo, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { buildEan13Svg } from '../utils/barcodeUtils';
import { formatToman, toPersianDigits } from '../utils/jalali';

interface Props {
  open: boolean;
  name: string;
  code: string;
  price: number;
  onClose: () => void;
}

// چاپ برچسب بارکد: فقط برچسب‌ها در حالت چاپ دیده می‌شوند
export const BarcodeLabelModal: React.FC<Props> = ({ open, name, code, price, onClose }) => {
  const [copies, setCopies] = useState<number>(1);
  const svg = useMemo(() => buildEan13Svg(code), [code]);

  if (!open) return null;

  const safeCopies = Math.min(Math.max(copies, 1), 100);
  const labels = Array.from({ length: safeCopies });

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" dir="rtl">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #barcode-print-area, #barcode-print-area * { visibility: visible !important; }
          #barcode-print-area { position: fixed; left: 0; top: 0; width: 100%; background: #fff; }
          .barcode-label { page-break-inside: avoid; }
        }
      `}</style>

      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">چاپ برچسب بارکد</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">تعداد برچسب:</label>
          <input
            type="number"
            min={1}
            max={100}
            value={copies}
            onChange={(e) => setCopies(Number(e.target.value) || 1)}
            className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
        </div>

        {!svg ? (
          <p className="text-xs text-rose-600">این کد بارکد معتبر (EAN-13) نیست. ابتدا یک بارکد تولید کنید.</p>
        ) : (
          <div className="overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
            <div id="barcode-print-area" className="grid grid-cols-2 gap-2">
              {labels.map((_, idx) => (
                <div
                  key={idx}
                  className="barcode-label bg-white text-black rounded-md p-1.5 flex flex-col items-center"
                  style={{ width: '100%' }}
                >
                  <div className="text-[10px] font-bold leading-tight text-center line-clamp-1 w-full truncate">{name}</div>
                  <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} />
                  <div className="text-[10px] font-bold">{formatToman(price)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!svg}
          onClick={() => window.print()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm"
        >
          <Printer className="w-4 h-4" />
          چاپ {toPersianDigits(safeCopies)} برچسب
        </button>
      </div>
    </div>
  );
};

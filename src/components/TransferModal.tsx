import React, { useState } from 'react';
import { X, ArrowLeftRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Product, User } from '../types';
import { StorageService } from '../services/storageService';
import { toEnglishDigits, toPersianDigits } from '../utils/jalali';
import { soundManager } from '../utils/audio';

interface Props {
  product: Product;
  currentUser: User;
  onClose: () => void;
  onDone: () => void;
}

// انتقال سریع یک کالا بین مکان‌ها از روی کارت کالا
export const TransferModal: React.FC<Props> = ({ product, currentUser, onClose, onDone }) => {
  const dist = product.locationStock || {};
  const sources = Object.entries<number>(dist).filter(([, q]) => q > 0);
  const options = StorageService.getLocationOptions();
  const [from, setFrom] = useState(sources[0]?.[0] || '');
  const [to, setTo] = useState('');
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const submit = () => {
    setError('');
    setMsg('');
    if (!from || !to) return setError('مبدأ و مقصد را انتخاب کنید.');
    if (from === to) return setError('مبدأ و مقصد نباید یکی باشند.');
    const n = Number(toEnglishDigits(qty).replace(/,/g, '').trim());
    if (!Number.isInteger(n) || n <= 0) return setError('تعداد باید عدد صحیح و بزرگ‌تر از صفر باشد.');
    const available = dist[from] || 0;
    if (n > available) return setError(`در مبدأ فقط ${toPersianDigits(available)} عدد موجود است.`);
    if (!StorageService.transferStock(product.id, from, to, n, currentUser)) {
      return setError('انتقال انجام نشد.');
    }
    soundManager.playSuccessSound();
    setMsg(`${toPersianDigits(n)} عدد منتقل شد.`);
    setQty('');
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-amber-600" />
            انتقال «{product.name}»
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[11px] text-slate-500 space-y-0.5">
          {sources.length === 0 ? (
            <p>این کالا هنوز در هیچ مکانی ثبت نشده است.</p>
          ) : (
            sources.map(([id, q]) => (
              <p key={id}>
                {StorageService.getLocationPath(id)}: {toPersianDigits(q)}
              </p>
            ))
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">از</label>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
              <option value="">انتخاب</option>
              {sources.map(([id, q]) => (
                <option key={id} value={id}>
                  {StorageService.getLocationPath(id)} ({toPersianDigits(q)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">به</label>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
              <option value="">انتخاب</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">تعداد</label>
          <input
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {msg && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        <button type="button" onClick={submit} className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm">
          انجام انتقال
        </button>
      </div>
    </div>
  );
};

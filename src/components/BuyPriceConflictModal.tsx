import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatToman } from '../utils/jalali';

export interface ConflictRow {
  key: string;
  name: string;
  newBuy: number;
  current: number;
  target: number;
}

interface Props {
  rows: ConflictRow[];
  onConfirm: (decisions: Record<string, boolean>) => void;
  onCancel: () => void;
}

// با قیمت خرید جدید، سود از سود تعریف‌شده کمتر شده؛ فروشنده تصمیم می‌گیرد
export const BuyPriceConflictModal: React.FC<Props> = ({ rows, onConfirm, onCancel }) => {
  const [apply, setApply] = useState<Record<string, boolean>>({});
  const setAll = (v: boolean) => setApply(Object.fromEntries(rows.map((r) => [r.key, v])));

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3 max-h-[90vh] flex flex-col">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">سود با قیمت خرید جدید تغییر کرده</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              سود شما با سود مشخص‌شده برابر نیست. برای هر کالا انتخاب کن:
              قیمت فروش فعلی بماند، یا سود تعریف‌شده اعمال شود.
            </p>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button type="button" onClick={() => setAll(false)} className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">همه: قیمت فعلی بماند</button>
          <button type="button" onClick={() => setAll(true)} className="flex-1 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-[11px] font-bold">همه: سود ثابت اعمال شود</button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2">
          {rows.map((r) => {
            const on = !!apply[r.key];
            return (
              <div key={r.key} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold truncate">{r.name}</span>
                  <span className={`text-[10px] font-bold shrink-0 ${r.target > r.current ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {r.target > r.current ? 'سود کمتر از حد' : 'سود بیشتر از حد'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  قیمت خرید جدید: {formatToman(r.newBuy)} · قیمت فروش فعلی: {formatToman(r.current)} · با سود تعریف‌شده: <strong>{formatToman(r.target)}</strong>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => setApply((a) => ({ ...a, [r.key]: false }))} className={`py-1.5 rounded-lg text-[11px] font-bold ${!on ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    قیمت فعلی بماند
                  </button>
                  <button type="button" onClick={() => setApply((a) => ({ ...a, [r.key]: true }))} className={`py-1.5 rounded-lg text-[11px] font-bold ${on ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    سود ثابت اعمال شود
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">انصراف</button>
          <button type="button" onClick={() => onConfirm(apply)} className="flex-1 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold">ادامه</button>
        </div>
      </div>
    </div>
  );
};

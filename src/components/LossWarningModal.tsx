import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatToman } from '../utils/jalali';

export interface LossRow {
  key: string;
  name: string;
  sell: number;
  buy: number;
}

interface Props {
  rows: LossRow[];
  onProceed: () => void;
  onCancel: () => void;
}

// هشدار زیان: قیمت فروش از قیمت خرید کمتر است
export const LossWarningModal: React.FC<Props> = ({ rows, onProceed, onCancel }) => (
  <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" dir="rtl">
    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3 max-h-[90vh] flex flex-col">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">هشدار زیان</h3>
          <p className="text-[11px] text-slate-500 mt-1">قیمت فروش این کالاها از قیمت خرید کمتر است. اگر ادامه بدهی، با زیان فروخته یا ثبت می‌شود.</p>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 space-y-1.5">
        {rows.map((r) => (
          <div key={r.key} className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-[11px]">
            <div className="font-bold truncate">{r.name}</div>
            <div className="text-slate-600 dark:text-slate-300">
              قیمت فروش: {formatToman(r.sell)} · قیمت خرید: {formatToman(r.buy)} · زیان هر عدد: <strong className="text-rose-600">{formatToman(r.buy - r.sell)}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold">اصلاح قیمت</button>
        <button type="button" onClick={onProceed} className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold">ادامه با زیان</button>
      </div>
    </div>
  </div>
);

import React, { useState } from 'react';
import { AlertTriangle, X, Check, Edit3, ShieldAlert } from 'lucide-react';
import { Product } from '../types';
import { formatToman, toPersianDigits } from '../utils/jalali';

interface Props {
  isOpen: boolean;
  conflictingProduct: Product;
  proposedName: string;
  onClose: () => void;
  onAllowDuplicate: () => void;
  onEditExisting: () => void;
  onChangeName: () => void;
}

export const DuplicateWarningModal: React.FC<Props> = ({
  isOpen,
  conflictingProduct,
  proposedName,
  onClose,
  onAllowDuplicate,
  onEditExisting,
  onChangeName,
}) => {
  const [selectedOption, setSelectedOption] = useState<'rename' | 'allow' | 'edit'>('allow');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedOption === 'rename') {
      onChangeName();
    } else if (selectedOption === 'allow') {
      onAllowDuplicate();
    } else if (selectedOption === 'edit') {
      onEditExisting();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">⚠️ نام تکراری شناسایی شد</h3>
              <p className="text-[11px] text-slate-400">این نام طبق قواعد یکتایی قبلاً ثبت شده است</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          کالای زیر با نام شما یکسان است:
        </p>

        {/* Conflicting product card */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5">
          <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{conflictingProduct.name}</div>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span>کد: <strong className="font-mono text-slate-800 dark:text-slate-200">{conflictingProduct.code || '---'}</strong></span>
            <span>دسته: {conflictingProduct.category || 'متفرقه'}</span>
            <span>موجودی: <strong className="text-amber-600">{toPersianDigits(conflictingProduct.stock)}</strong> {conflictingProduct.unit}</span>
          </div>
        </div>

        {/* Comparison notes */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
          <div className="flex justify-between">
            <span>نام شما:</span>
            <strong className="font-bold">{proposedName}</strong>
          </div>
          <div className="flex justify-between">
            <span>نام موجود:</span>
            <strong className="font-bold">{conflictingProduct.name}</strong>
          </div>
          <p className="pt-1 text-[10px] text-amber-700 dark:text-amber-400 border-t border-amber-200/50">
            → بر اساس قواعد نرمال‌سازی و فاصله، یکسان در نظر گرفته شدند.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2 pt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
            <input
              type="radio"
              name="dup_option"
              checked={selectedOption === 'rename'}
              onChange={() => setSelectedOption('rename')}
              className="accent-amber-600"
            />
            <span>تغییر نام (بازگشت به فرم و ویرایش)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
            <input
              type="radio"
              name="dup_option"
              checked={selectedOption === 'allow'}
              onChange={() => setSelectedOption('allow')}
              className="accent-amber-600"
            />
            <span>تغییر قواعد این کالا (اجازه ثبت تکراری)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
            <input
              type="radio"
              name="dup_option"
              checked={selectedOption === 'edit'}
              onChange={() => setSelectedOption('edit')}
              className="accent-amber-600"
            />
            <span>ویرایش کالای موجود</span>
          </label>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>تایید و ادامه</span>
          </button>
        </div>
      </div>
    </div>
  );
};

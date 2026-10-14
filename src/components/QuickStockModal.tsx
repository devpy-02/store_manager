import React, { useState } from 'react';
import { Product, User } from '../types';
import { toPersianDigits, toEnglishDigits } from '../utils/jalali';
import { X, Check, Plus, Minus } from 'lucide-react';

interface Props {
  product: Product;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: string, newStock: number) => void;
}

export const QuickStockModal: React.FC<Props> = ({
  product,
  currentUser,
  isOpen,
  onClose,
  onSave,
}) => {
  const [stockInput, setStockInput] = useState(product.stock.toString());
  const currentNum = parseInt(toEnglishDigits(stockInput), 10) || 0;
  const diff = currentNum - product.stock;

  if (!isOpen) return null;

  const handleApplyDelta = (delta: number) => {
    const updated = Math.max(0, currentNum + delta);
    setStockInput(updated.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = toEnglishDigits(e.target.value).replace(/[^0-9]/g, '');
    setStockInput(clean);
  };

  const handleConfirm = () => {
    if (currentNum >= 0 && currentNum !== product.stock) {
      onSave(product.id, currentNum);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Android grab handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              ویرایش موجودی انبار
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Comparison */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">موجودی قبلی:</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                {toPersianDigits(product.stock)} {product.unit}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">موجودی جدید:</span>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
                {toPersianDigits(currentNum)} {product.unit}
              </p>
            </div>
          </div>

          {/* Stepper with +/- */}
          <div className="flex items-center justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => handleApplyDelta(-1)}
              disabled={currentNum <= 0}
              className="w-12 h-12 bg-white dark:bg-slate-700 hover:bg-slate-50 active:bg-slate-200 disabled:opacity-40 rounded-xl shadow-xs flex items-center justify-center text-slate-800 dark:text-slate-100 font-bold"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="flex-1 text-center">
              <input
                type="text"
                inputMode="numeric"
                value={currentNum.toString()}
                onChange={handleInputChange}
                className="w-full text-center text-3xl font-extrabold bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">{product.unit}</span>
            </div>

            <button
              type="button"
              onClick={() => handleApplyDelta(1)}
              className="w-12 h-12 bg-white dark:bg-slate-700 hover:bg-slate-50 active:bg-slate-200 rounded-xl shadow-xs flex items-center justify-center text-slate-800 dark:text-slate-100 font-bold"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Increment buttons */}
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-2">
              میانبرهای تغییر تعداد:
            </span>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleApplyDelta(5)}
                className="min-h-[40px] px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                +۵
              </button>
              <button
                type="button"
                onClick={() => handleApplyDelta(10)}
                className="min-h-[40px] px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                +۱۰
              </button>
              <button
                type="button"
                onClick={() => handleApplyDelta(-5)}
                disabled={currentNum < 5}
                className="min-h-[40px] px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                -۵
              </button>
              <button
                type="button"
                onClick={() => handleApplyDelta(-10)}
                disabled={currentNum < 10}
                className="min-h-[40px] px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                -۱۰
              </button>
            </div>
          </div>

          {/* User Sign-off */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <span>ثبت‌کننده در انبار:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {currentUser.name}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={diff === 0 || currentNum < 0}
            className="min-h-[46px] flex-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            <Check className="w-4 h-4" />
            <span>ثبت موجودی جدید</span>
          </button>
        </div>
      </div>
    </div>
  );
};

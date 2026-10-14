import React, { useState } from 'react';
import { Product, User } from '../types';
import { formatToman, toPersianDigits, toEnglishDigits } from '../utils/jalali';
import { X, TrendingUp, TrendingDown, Check } from 'lucide-react';

interface Props {
  product: Product;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: string, newPrice: number) => void;
}

export const QuickPriceModal: React.FC<Props> = ({
  product,
  currentUser,
  isOpen,
  onClose,
  onSave,
}) => {
  const [priceInput, setPriceInput] = useState(product.price.toString());
  const currentNum = parseInt(toEnglishDigits(priceInput), 10) || 0;
  const diff = currentNum - product.price;

  if (!isOpen) return null;

  const handleApplyDelta = (delta: number) => {
    const updated = Math.max(0, currentNum + delta);
    setPriceInput(updated.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = toEnglishDigits(e.target.value).replace(/[^0-9]/g, '');
    setPriceInput(clean);
  };

  const handleConfirm = () => {
    if (currentNum > 0 && currentNum !== product.price) {
      onSave(product.id, currentNum);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Android bottom sheet grab handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              تغییر سریع قیمت
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
          {/* Current vs New comparison */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">قیمت قبلی:</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                {formatToman(product.price)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">قیمت جدید:</span>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                {formatToman(currentNum)}
              </p>
            </div>
          </div>

          {/* Difference banner */}
          {diff !== 0 && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                diff > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {diff > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                )}
                <span>{diff > 0 ? 'افزایش قیمت:' : 'کاهش قیمت:'}</span>
              </div>
              <span className="tabular-nums font-bold">
                {diff > 0 ? `+${formatToman(diff)}` : `-${formatToman(Math.abs(diff))}`}
              </span>
            </div>
          )}

          {/* Direct Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              مبلغ جدید (تومان):
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={currentNum > 0 ? currentNum.toLocaleString('en-US') : ''}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-amber-500/50 focus:border-amber-500 rounded-xl text-lg font-bold text-slate-900 dark:text-slate-100 text-left ltr tracking-wider focus:outline-none"
                placeholder="0"
                autoFocus
              />
              <span className="absolute left-3 top-3.5 text-xs text-slate-400">تومان</span>
            </div>
          </div>

          {/* Quick Increment Shortcuts */}
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-2">
              میانبرهای افزایش / کاهش سریع:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyDelta(50000)}
                className="min-h-[42px] px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                +۵۰ هزار
              </button>
              <button
                type="button"
                onClick={() => handleApplyDelta(100000)}
                className="min-h-[42px] px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                +۱۰۰ هزار
              </button>
              <button
                type="button"
                onClick={() => handleApplyDelta(500000)}
                className="min-h-[42px] px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                +۵۰۰ هزار
              </button>

              <button
                type="button"
                onClick={() => handleApplyDelta(-50000)}
                className="min-h-[42px] px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                -۵۰ هزار
              </button>
              <button
                type="button"
                onClick={() => handleApplyDelta(-100000)}
                className="min-h-[42px] px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                -۱۰۰ هزار
              </button>
              <button
                type="button"
                onClick={() => handleApplyDelta(-500000)}
                className="min-h-[42px] px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                -۵۰۰ هزار
              </button>
            </div>
          </div>

          {/* User Sign-off note */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <span>ثبت‌کننده تغییرات:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {currentUser.name} ({currentUser.role === 'admin' ? 'مدیر' : 'فروشنده'})
            </span>
          </div>
        </div>

        {/* Footer actions */}
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
            disabled={diff === 0 || currentNum <= 0}
            className="min-h-[46px] flex-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
          >
            <Check className="w-4 h-4" />
            <span>ثبت و ذخیره قیمت جدید</span>
          </button>
        </div>
      </div>
    </div>
  );
};

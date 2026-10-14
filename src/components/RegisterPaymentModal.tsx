import React, { useState } from 'react';
import { Customer, User, PaymentMethod } from '../types';
import { StorageService } from '../services/storageService';
import { toEnglishDigits, formatToman, gregorianToJalali } from '../utils/jalali';
import { soundManager } from '../utils/audio';
import { X, CreditCard, DollarSign, ArrowRightLeft, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Props {
  customer: Customer;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRegistered: () => void;
}

export const RegisterPaymentModal: React.FC<Props> = ({
  customer,
  currentUser,
  isOpen,
  onClose,
  onPaymentRegistered,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const rawAmount = parseInt(toEnglishDigits(amountStr).replace(/[^0-9]/g, ''), 10) || 0;

  const handleQuickAmount = (ratio: number) => {
    if (customer.totalDebt > 0) {
      const target = Math.round((customer.totalDebt * ratio) / 1000) * 1000;
      setAmountStr(target.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawAmount <= 0) {
      setError('لطفاً مبلغ معتبر به تومان وارد نمایید');
      return;
    }

    const res = StorageService.addCustomerPayment(
      customer.id,
      rawAmount,
      paymentMethod,
      referenceNumber.trim() || undefined,
      notes.trim() || undefined,
      currentUser
    );

    if (res.success) {
      soundManager.playSuccessSound();
      onPaymentRegistered();
      onClose();
    } else {
      setError('خطا در ثبت دریافتی مشتری');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              💰
            </div>
            <div>
              <h3 className="text-sm font-bold">ثبت دریافت وجه از مشتری</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{customer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Balance Summary */}
        <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-600 dark:text-slate-400 block">مانده بدهی فعلی:</span>
            <span className="text-base font-black text-amber-700 dark:text-amber-400 font-mono">
              {formatToman(customer.totalDebt)}
            </span>
          </div>
          <div className="text-left">
            <span className="text-[11px] text-slate-500 block">مانده پس از دریافتی:</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
              {formatToman(Math.max(0, customer.totalDebt - rawAmount))}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              مبلغ دریافتی (تومان) *
            </label>
            <div className="relative">
              <input
                type="text"
                value={amountStr ? formatToman(rawAmount).replace(' تومان', '') : ''}
                onChange={(e) => {
                  setError('');
                  setAmountStr(toEnglishDigits(e.target.value));
                }}
                placeholder="مثال: ۲,۰۰۰,۰۰۰"
                className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-base focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <span className="absolute left-3 top-3 text-xs text-slate-400 font-medium">تومان</span>
            </div>

            {/* Quick percent buttons if debtor */}
            {customer.totalDebt > 0 && (
              <div className="flex gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => handleQuickAmount(1.0)}
                  className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-bold hover:bg-amber-200"
                >
                  تسویه کامل ({formatToman(customer.totalDebt)})
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(0.5)}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200"
                >
                  ۵۰٪ بدهی
                </button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              روش دریافت
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'cash', label: '💵 نقدی (مغازه)', icon: DollarSign },
                { id: 'pos', label: '💳 کارت‌خوان (پوز)', icon: CreditCard },
                { id: 'card_transfer', label: '📲 کارت به کارت / واریز', icon: ArrowRightLeft },
                { id: 'cheque', label: '📄 چک صیادی', icon: FileText },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`p-2.5 rounded-xl border text-right font-medium flex items-center gap-2 transition-all ${
                    paymentMethod === m.id
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              شماره پیگیری / ارجاع / شماره چک (اختیاری)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(toEnglishDigits(e.target.value))}
              placeholder="مثال: کد پیگیری ۱۲۳۴۵۶"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              توضیحات و یادداشت (اختیاری)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: واریز بابت فاکتور هفته گذشته"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100"
            >
              لغو
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ثبت و بروزرسانی حساب</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

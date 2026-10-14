import React, { useState } from 'react';
import { InvoiceType } from '../types';
import { Plus, X, ShoppingCart, ArrowDownLeft, Store, RotateCcw, ArrowUpRight, Zap } from 'lucide-react';

interface Props {
  onSelectType: (type: InvoiceType) => void;
  onSelectQuickInvoice?: () => void;
}

export const InvoiceFABMenu: React.FC<Props> = ({ onSelectType, onSelectQuickInvoice }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuOptions: {
    type: InvoiceType;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    dotColor: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }[] = [
    {
      type: 'sales',
      label: 'فاکتور فروش',
      sublabel: 'فروش به مشتریان دفتری و پیمانکاران با محاسبه سود و ثبت بدهی',
      icon: ShoppingCart,
      dotColor: 'bg-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    },
    {
      type: 'retail',
      label: 'فاکتور خرده‌فروشی',
      sublabel: 'فروش نقدی سریع پشت پیشخوان مغازه بدون نیاز به ثبت مشتری',
      icon: Store,
      dotColor: 'bg-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      textColor: 'text-amber-700 dark:text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-800/60',
    },
    {
      type: 'purchase',
      label: 'فاکتور خرید',
      sublabel: 'ورود بار جدید از شرکت‌ها و تأمین‌کنندگان و افزایش موجودی انبار',
      icon: ArrowDownLeft,
      dotColor: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      textColor: 'text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-800/60',
    },
    {
      type: 'sales_return',
      label: 'برگشت از فروش',
      sublabel: 'مرجوعی کالای معیوب یا مازاد مشتری و استرداد وجه یا طلبکاری',
      icon: RotateCcw,
      dotColor: 'bg-rose-500',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      textColor: 'text-rose-700 dark:text-rose-300',
      borderColor: 'border-rose-200 dark:border-rose-800/60',
    },
    {
      type: 'purchase_return',
      label: 'برگشت از خرید',
      sublabel: 'مرجوعی کالا به تأمین‌کننده یا کارخانه و کسر از موجودی انبار',
      icon: ArrowUpRight,
      dotColor: 'bg-red-800',
      bgColor: 'bg-red-50 dark:bg-red-950/50',
      textColor: 'text-red-900 dark:text-red-300',
      borderColor: 'border-red-300 dark:border-red-800/70',
    },
  ];

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-20 left-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white shadow-xl shadow-amber-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200"
          title="ثبت فاکتور جدید"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Bottom Sheet Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Grab handle */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  ثبت فاکتور جدید
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  نوع فاکتور مورد نظر را انتخاب نمایید
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu options list */}
            <div className="p-4 space-y-2.5 overflow-y-auto">
              {onSelectQuickInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSelectQuickInvoice();
                  }}
                  className="w-full p-3.5 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-right flex items-center gap-3.5 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-amber-800 dark:text-amber-200">فاکتور سریع</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">ثبت سریع اقلام، حتی بدون انتخاب کالای انبار</p>
                  </div>
                </button>
              )}
              {menuOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    onClick={() => {
                      setIsOpen(false);
                      onSelectType(opt.type);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-right flex items-center gap-3.5 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] ${opt.bgColor} ${opt.borderColor}`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${opt.textColor}`} />
                      </div>
                      <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${opt.dotColor} ring-2 ring-white dark:ring-slate-900`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-bold text-sm ${opt.textColor}`}>
                          {opt.label}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {opt.sublabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

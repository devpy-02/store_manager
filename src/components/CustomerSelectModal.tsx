import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import { formatToman, toPersianDigits, toEnglishDigits } from '../utils/jalali';
import { Search, UserPlus, X, Check, Phone, MapPin, User, ArrowLeft } from 'lucide-react';

interface Props {
  customers: Customer[];
  selectedCustomerId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: (customerData: Partial<Customer> & { name: string; mobile: string }) => Customer;
}

export const CustomerSelectModal: React.FC<Props> = ({
  customers,
  selectedCustomerId,
  isOpen,
  onClose,
  onSelectCustomer,
  onAddCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New customer form state
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newInitialDebt, setNewInitialDebt] = useState('0');
  const [formError, setFormError] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.mobile || '').includes(q) ||
        (c.phone || '').includes(q) ||
        (c.customerCode || '').toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  if (!isOpen) return null;

  const handleSaveNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError('لطفاً نام مشتری را وارد نمایید');
      return;
    }
    const cleanMobile = toEnglishDigits(newMobile).trim() || toEnglishDigits(newPhone).trim() || '۰۹۱۲۰۰۰۰۰۰۰';
    const cleanDebt = parseInt(toEnglishDigits(newInitialDebt).replace(/[^0-9-]/g, ''), 10) || 0;
    const created = onAddCustomer({
      name: newName.trim(),
      mobile: cleanMobile,
      phone: toEnglishDigits(newPhone).trim() || null,
      address: newAddress.trim() || null,
      totalDebt: cleanDebt,
      debt: cleanDebt,
      defaultDiscountPercent: 0,
      isActive: true,
    });
    onSelectCustomer(created);
    setIsAddingNew(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Android grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAddingNew && (
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            )}
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {isAddingNew ? 'ثبت مشتری جدید' : 'انتخاب مشتری طرف حساب'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAddingNew ? (
          /* Add New Customer Form */
          <form onSubmit={handleSaveNewCustomer} className="p-5 space-y-3.5 overflow-y-auto">
            {formError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نام و نام خانوادگی مشتری / پیمانکار <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setFormError('');
                }}
                placeholder="مثال: مهندس حسینی (پروژه ونک)"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                شماره تماس:
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ltr text-left"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                آدرس کارگاه یا محل تحویل (اختیاری):
              </label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="تهران، خیابان ولیعصر..."
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                مانده بدهی قبلی (تومان):
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={newInitialDebt}
                onChange={(e) => setNewInitialDebt(toEnglishDigits(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 tabular-nums"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
              >
                <Check className="w-4 h-4" />
                <span>ثبت و انتخاب مشتری</span>
              </button>
            </div>
          </form>
        ) : (
          /* Live Search & Customer List */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام یا شماره تلفن مشتری..."
                className="w-full pr-9 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                autoFocus
              />
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => setIsAddingNew(true)}
              className="w-full py-2 px-3 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100/70 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ افزودن مشتری جدید</span>
            </button>

            {/* Live Suggestions List */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400">
                ▼ پیشنهادات زنده:
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  مشتری با این نام یافت نشد. می‌توانید با دکمه بالا مشتری جدید ثبت کنید.
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = cust.id === selectedCustomerId;
                  const isDebtor = cust.debt > 0;
                  const isCreditor = cust.debt < 0;
                  return (
                    <button
                      key={cust.id}
                      onClick={() => {
                        onSelectCustomer(cust);
                        onClose();
                      }}
                      className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-xs'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {cust.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-mono text-[10px] ltr">{cust.phone}</span>
                            {cust.address && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate max-w-[130px]">{cust.address}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="text-[10px] text-slate-400 block">وضعیت حساب:</span>
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            isDebtor
                              ? 'text-rose-600 dark:text-rose-400'
                              : isCreditor
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {isDebtor
                            ? `بدهی: ${formatToman(cust.debt)}`
                            : isCreditor
                            ? `طلبکار: ${formatToman(Math.abs(cust.debt))}`
                            : 'تصفیه (۰ تومان)'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

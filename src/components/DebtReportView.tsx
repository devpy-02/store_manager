import React, { useState, useMemo } from 'react';
import { Customer, CustomerGroup, User } from '../types';
import { StorageService } from '../services/storageService';
import { formatToman, toPersianDigits, formatPersianDateTime } from '../utils/jalali';
import { Users, AlertCircle, FileText, Download, Printer, Search, TrendingDown, DollarSign, Crown } from 'lucide-react';

interface Props {
  currentUser: User;
  customers: Customer[];
  onOpenCustomerProfile?: (customer: Customer) => void;
}

export const DebtReportView: React.FC<Props> = ({
  currentUser,
  customers,
  onOpenCustomerProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const debtorCustomers = useMemo(() => {
    return customers
      .filter((c) => !c.deleted && c.totalDebt > 0)
      .sort((a, b) => b.totalDebt - a.totalDebt);
  }, [customers]);

  const filteredDebtors = useMemo(() => {
    if (!searchQuery.trim()) return debtorCustomers;
    const q = searchQuery.toLowerCase().trim();
    return debtorCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.mobile || '').includes(q) ||
        (c.customerCode || '').toLowerCase().includes(q)
    );
  }, [debtorCustomers, searchQuery]);

  const totalDebtSum = useMemo(() => {
    return debtorCustomers.reduce((acc, c) => acc + c.totalDebt, 0);
  }, [debtorCustomers]);

  const debtorCount = debtorCustomers.length;
  const avgDebt = debtorCount > 0 ? Math.round(totalDebtSum / debtorCount) : 0;

  const handleExportExcel = () => {
    let csv = 'ردیف,کد مشتری,نام مشتری,شماره موبایل,مبلغ بدهی (تومان),آخرین خرید,آخرین پرداخت\n';
    debtorCustomers.forEach((c, idx) => {
      csv += `${idx + 1},"${c.customerCode}","${c.name}","${c.mobile}",${c.totalDebt},"${c.lastPurchaseDate || ''}","${c.lastPaymentDate || ''}"\n`;
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `گزارش_بدهی_مشتریان.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-lg">
            📊
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
              گزارش بدهی مشتریان
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تحلیل و پایش مانده بدهی مشتریان بدهکار
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>خروجی Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ / PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-right">
          <span className="text-xs text-amber-800 dark:text-amber-300 font-bold block">
            کل طلب از مشتریان (مجموع بدهی‌ها)
          </span>
          <span className="text-lg font-black text-amber-900 dark:text-amber-200 font-mono mt-1 block">
            {formatToman(totalDebtSum)}
          </span>
        </div>

        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-right">
          <span className="text-xs text-blue-800 dark:text-blue-300 font-bold block">
            تعداد مشتریان بدهکار
          </span>
          <span className="text-lg font-black text-blue-900 dark:text-blue-200 font-mono mt-1 block">
            {toPersianDigits(debtorCount)} نفر
          </span>
        </div>

        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-right">
          <span className="text-xs text-purple-800 dark:text-purple-300 font-bold block">
            میانگین بدهی هر مشتری
          </span>
          <span className="text-lg font-black text-purple-900 dark:text-purple-200 font-mono mt-1 block">
            {formatToman(avgDebt)}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجو در بین بدهکاران (نام، موبایل یا کد)..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
      </div>

      {/* Debtors List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>بیشترین بدهی‌ها (رتبه‌بندی)</span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {toPersianDigits(filteredDebtors.length)} مورد
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
          {filteredDebtors.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              هیچ مشتری بدهکاری یافت نشد
            </div>
          ) : (
            filteredDebtors.map((cust, idx) => (
              <div
                key={cust.id}
                onClick={() => onOpenCustomerProfile && onOpenCustomerProfile(cust)}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-mono font-bold text-slate-400 text-xs">
                    {toPersianDigits(idx + 1)}.
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{cust.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        ({cust.customerCode})
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      موبایل: {toPersianDigits(cust.mobile)} · آخرین خرید: {toPersianDigits(cust.lastPurchaseDate || '---')}
                    </p>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-sm font-black text-amber-700 dark:text-amber-400 font-mono block">
                    {formatToman(cust.totalDebt)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    پرداخت قبلی: {toPersianDigits(cust.lastPaymentDate || 'ثبت‌نشده')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

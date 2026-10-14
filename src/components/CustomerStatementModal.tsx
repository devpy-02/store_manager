import React, { useState, useMemo } from 'react';
import { Customer, CustomerLedgerEntry, User } from '../types';
import { StorageService } from '../services/storageService';
import { formatToman, toPersianDigits, formatPersianDateTime } from '../utils/jalali';
import { X, Printer, Download, Filter, Calendar, FileText, CheckCircle2, ArrowDownRight, ArrowUpLeft } from 'lucide-react';

interface Props {
  customer: Customer;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerStatementModal: React.FC<Props> = ({
  customer,
  currentUser,
  isOpen,
  onClose,
}) => {
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const ledgerEntries = useMemo(() => {
    return StorageService.getCustomerLedgerByCustomerId(customer.id);
  }, [customer.id]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    let csv = 'تاریخ,زمان,شرح,شماره سند,بدهکار (تومان),بستانکار (تومان),مانده (تومان)\n';
    ledgerEntries.forEach((entry) => {
      csv += `"${entry.date}","${entry.time}","${entry.description}","${entry.referenceNumber || ''}",${entry.debit},${entry.credit},${entry.balanceAfter}\n`;
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `صورتحساب_${customer.name}_${customer.customerCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const entryTypeLabels: Record<string, string> = {
    invoice_sale: 'فاکتور فروش',
    invoice_retail: 'فروش خرده‌فروشی',
    invoice_sale_return: 'مرجوعی فروش',
    payment_cash: 'پرداخت نقدی',
    payment_card: 'پرداخت کارت‌خوان',
    payment_transfer: 'کارت به کارت / واریزی',
    payment_cheque: 'پرداخت چک',
    payment_credit: 'تخفیف / اعتبار',
    adjustment: 'تعدیل حساب',
    initial_balance: 'مانده اولیه',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              📊
            </div>
            <div>
              <h3 className="text-sm font-bold">صورتحساب / دفتر حساب مشتری</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {customer.name} ({customer.customerCode})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statement Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 print:p-0">
          {/* Customer Header Info */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <h2 className="text-base font-black text-slate-900">{customer.name}</h2>
              <div className="text-slate-600 space-x-3 space-x-reverse mt-0.5">
                <span>کد: <strong className="font-mono">{customer.customerCode}</strong></span>
                <span>موبایل: <strong className="font-mono">{toPersianDigits(customer.mobile)}</strong></span>
                {customer.phone && <span>تلفن: <strong className="font-mono">{toPersianDigits(customer.phone)}</strong></span>}
              </div>
              {customer.address && (
                <p className="text-slate-500 text-[11px] mt-1">{customer.address}</p>
              )}
            </div>

            <div className="text-left bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">مانده بدهی فعلی:</span>
              <span className={`text-base font-black font-mono ${customer.totalDebt > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatToman(customer.totalDebt)}
              </span>
            </div>
          </div>

          {/* Statement Summary Cards */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200">
              <span className="text-slate-500 block text-[11px]">مجموع خریدها</span>
              <span className="text-sm font-bold text-blue-900 font-mono mt-0.5 block">
                {formatToman(customer.totalPurchases || 0)}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200">
              <span className="text-slate-500 block text-[11px]">مجموع دریافتی‌ها</span>
              <span className="text-sm font-bold text-emerald-900 font-mono mt-0.5 block">
                {formatToman(customer.totalPayments || 0)}
              </span>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200">
              <span className="text-slate-500 block text-[11px]">مانده حساب (بدهی)</span>
              <span className="text-sm font-black text-amber-900 font-mono mt-0.5 block">
                {formatToman(customer.totalDebt)}
              </span>
            </div>
          </div>

          {/* Immutable Ledger Table */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 text-center w-8">ردیف</th>
                  <th className="py-2.5 px-3">تاریخ & زمان</th>
                  <th className="py-2.5 px-3">شرح تراکنش / سند</th>
                  <th className="py-2.5 px-3 text-center">شماره سند</th>
                  <th className="py-2.5 px-3 text-center text-emerald-700">بدهکار (افزایش)</th>
                  <th className="py-2.5 px-3 text-center text-rose-700">بستانکار (پرداخت)</th>
                  <th className="py-2.5 px-3 text-center font-black">مانده حساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      هیچ تراکنشی برای این مشتری ثبت نشده است
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                        {toPersianDigits(idx + 1)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {toPersianDigits(entry.date)} · {toPersianDigits(entry.time)}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-bold">
                            {entryTypeLabels[entry.entryType] || entry.entryType}
                          </span>
                          <span>{entry.description}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500">
                        {entry.referenceNumber || '---'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-700 tabular-nums">
                        {entry.debit > 0 ? `+${formatToman(entry.debit).replace(' تومان', '')}` : '---'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-rose-700 tabular-nums">
                        {entry.credit > 0 ? `-${formatToman(entry.credit).replace(' تومان', '')}` : '---'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black font-mono text-slate-900 tabular-nums">
                        {formatToman(entry.balanceAfter).replace(' تومان', '')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-200">
            {customer.totalDebt > 0 ? (
              <span className="font-bold text-amber-800">
                باقی مانده حساب شما معادل {formatToman(customer.totalDebt)} می‌باشد.
              </span>
            ) : (
              <span className="font-bold text-emerald-700">
                حساب شما تسویه شده می‌باشد. با تشکر از همکاری شما.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

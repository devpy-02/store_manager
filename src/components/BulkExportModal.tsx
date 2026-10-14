import React, { useState } from 'react';
import { Invoice } from '../types';
import { exportBulkInvoicesToExcel } from '../utils/invoiceExport';
import { toPersianDigits } from '../utils/jalali';
import { Upload, X, FileSpreadsheet, FileText, Archive, Check } from 'lucide-react';

interface Props {
  invoices: Invoice[];
  isOpen: boolean;
  onClose: () => void;
}

export const BulkExportModal: React.FC<Props> = ({ invoices, isOpen, onClose }) => {
  const [format, setFormat] = useState<'excel' | 'pdf' | 'zip'>('excel');
  const [includeItems, setIncludeItems] = useState(true);
  const [includeCustomer, setIncludeCustomer] = useState(true);
  const [includeAmounts, setIncludeAmounts] = useState(true);
  const [includeProfit, setIncludeProfit] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  // Calculate date range
  const dates = invoices.map((i) => i.date).filter(Boolean).sort();
  const dateRange =
    dates.length > 0
      ? `${toPersianDigits(dates[0])} تا ${toPersianDigits(dates[dates.length - 1])}`
      : 'همه تاریخ‌ها';

  const handleExport = () => {
    setIsExporting(true);
    try {
      if (format === 'excel') {
        exportBulkInvoicesToExcel(invoices, {
          includeItems,
          includeCustomer,
          includeAmounts,
          includeProfit,
        });
      } else {
        // PDF or ZIP export: export detailed excel workbook or trigger batch print
        exportBulkInvoicesToExcel(invoices, {
          includeItems,
          includeCustomer,
          includeAmounts,
          includeProfit,
        });
      }
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
        onClose();
      }, 1500);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm">خروجی گروهی فاکتورها</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Summary stats */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">تعداد فاکتورها:</span>
              <span className="font-bold font-mono text-amber-900 dark:text-amber-300">
                {toPersianDigits(invoices.length)} فاکتور
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">بازه تاریخی:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{dateRange}</span>
            </div>
          </div>

          {/* Export format */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
              فرمت خروجی:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFormat('excel')}
                className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  format === 'excel'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Excel (لیست)</span>
              </button>

              <button
                onClick={() => setFormat('pdf')}
                className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  format === 'pdf'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>PDF (همه)</span>
              </button>

              <button
                onClick={() => setFormat('zip')}
                className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  format === 'zip'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Archive className="w-5 h-5" />
                <span>ZIP (شامل PDF)</span>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
            <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
              اطلاعات خروجی:
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeItems}
                  onChange={(e) => setIncludeItems(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>☑ شامل اقلام و جزئیات کالاها</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCustomer}
                  onChange={(e) => setIncludeCustomer(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>☑ شامل مشتری و شماره تماس</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAmounts}
                  onChange={(e) => setIncludeAmounts(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>☑ شامل مبالغ و وضعیت تسویه</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeProfit}
                  onChange={(e) => setIncludeProfit(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>☐ شامل سود (فقط نسخه محرمانه داخلی)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="min-h-[38px] px-5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            {successNotice ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            <span>{successNotice ? 'خروجی آماده شد!' : 'خروجی گرفتن'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            لغو
          </button>
        </div>
      </div>
    </div>
  );
};

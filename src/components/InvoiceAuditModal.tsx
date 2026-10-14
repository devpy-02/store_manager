import React from 'react';
import { Invoice, InvoiceAuditLog } from '../types';
import { StorageService } from '../services/storageService';
import { toPersianDigits, timeAgoPersian } from '../utils/jalali';
import {
  History,
  X,
  CheckCircle2,
  Edit,
  Printer,
  DollarSign,
  Share2,
  Trash2,
  RotateCcw,
  Download,
} from 'lucide-react';

interface Props {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceAuditModal: React.FC<Props> = ({ invoice, isOpen, onClose }) => {
  if (!isOpen || !invoice) return null;

  const logs = StorageService.getLogsForInvoice(invoice.id, invoice.invoiceNumber);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
          title: 'ایجاد فاکتور',
        };
      case 'edit':
        return {
          icon: Edit,
          color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
          title: 'ویرایش فاکتور',
        };
      case 'print':
        return {
          icon: Printer,
          color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
          title: 'چاپ فاکتور',
        };
      case 'payment':
        return {
          icon: DollarSign,
          color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
          title: 'ثبت پرداخت',
        };
      case 'export':
        return {
          icon: Download,
          color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
          title: 'دریافت خروجی',
        };
      case 'share':
        return {
          icon: Share2,
          color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
          title: 'اشتراک‌گذاری',
        };
      case 'delete':
        return {
          icon: Trash2,
          color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
          title: 'حذف فاکتور',
        };
      default:
        return {
          icon: History,
          color: 'text-slate-500 bg-slate-50 dark:bg-slate-850 border-slate-200',
          title: 'رویداد فاکتور',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm">تاریخچه فاکتور {invoice.invoiceNumber}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>هنوز رویدادی برای این فاکتور ثبت نشده است.</p>
            </div>
          ) : (
            <div className="relative border-r-2 border-slate-200 dark:border-slate-800 pr-5 mr-3 space-y-6">
              {logs.map((log) => {
                const badge = getActionBadge(log.action);
                const Icon = badge.icon;
                return (
                  <div key={log.id} className="relative group">
                    {/* Timeline dot */}
                    <div className="absolute -right-[27px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-amber-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`p-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${badge.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{badge.title}</span>
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {toPersianDigits(log.date)} - {toPersianDigits(log.time)}
                        </span>
                      </div>

                      <p className="text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                        {log.details}
                      </p>

                      {/* Diffs list if present */}
                      {log.diffs && log.diffs.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 block">
                            تغییرات اعمال‌شده:
                          </span>
                          <ul className="space-y-1 text-[11px]">
                            {log.diffs.map((diff, dIdx) => (
                              <li key={dIdx} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span className="font-medium">{diff.field}:</span>
                                <span className="text-rose-600 line-through tabular-nums">{diff.oldVal}</span>
                                <span className="text-slate-400">←</span>
                                <span className="text-emerald-600 font-bold tabular-nums">{diff.newVal}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                        <span>انجام دهنده: <strong>{log.performedByName}</strong></span>
                        <span>{timeAgoPersian(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-left">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};

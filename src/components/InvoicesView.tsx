import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceType, Customer, Product } from '../types';
import { formatToman, toPersianDigits, timeAgoPersian } from '../utils/jalali';
import { InvoiceFABMenu } from './InvoiceFABMenu';
import {
  FileText,
  Search,
  Filter,
  ShoppingCart,
  Store,
  ArrowDownLeft,
  RotateCcw,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Share2,
  History,
  Trash2,
  Upload,
  Printer,
  Pencil,
} from 'lucide-react';

interface Props {
  invoices: Invoice[];
  customers: Customer[];
  products?: Product[];
  onOpenCreateInvoice: (type: InvoiceType) => void;
  onOpenQuickInvoice?: () => void;
  onApplyPendingStock?: (invoiceId: string) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onAssignBatches?: (invoice: Invoice) => void;
  onShareInvoice: (invoice: Invoice) => void;
  onViewAudit: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onOpenBulkExport: (filteredInvoices: Invoice[]) => void;
}

export const InvoicesView: React.FC<Props> = ({
  invoices,
  customers,
  products = [],
  onOpenCreateInvoice,
  onOpenQuickInvoice,
  onApplyPendingStock,
  onViewInvoice,
  onEditInvoice,
  onAssignBatches,
  onShareInvoice,
  onViewAudit,
  onDeleteInvoice,
  onOpenBulkExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtered invoices (excluding soft deleted)
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => !inv.deleted)
      .filter((inv) => {
        if (selectedTypeFilter !== 'all' && inv.type !== selectedTypeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
          const matchCust = (inv.customerName || '').toLowerCase().includes(q);
          const matchSupp = (inv.supplierName || '').toLowerCase().includes(q);
          const matchItem = inv.items.some((it) => it.productName.toLowerCase().includes(q));
          if (!matchNum && !matchCust && !matchSupp && !matchItem) return false;
        }
        return true;
      });
  }, [invoices, selectedTypeFilter, searchQuery]);


  // فاکتورهای حذف‌شده (حذف نرم) نباید در آمار و تعداد شمرده شوند
  const activeInvoices = useMemo(() => invoices.filter((i) => !i.deleted), [invoices]);

  // Aggregate stats
  const totalSalesAmount = useMemo(() => {
    return activeInvoices
      .filter((i) => i.type === 'sales' || i.type === 'retail')
      .reduce((sum, i) => sum + i.finalTotal, 0);
  }, [activeInvoices]);

  const unpaidCount = useMemo(() => {
    return activeInvoices.filter((i) => i.remainingAmount > 0).length;
  }, [activeInvoices]);

  const typeConfig: Record<
    InvoiceType,
    { label: string; dotColor: string; bgBadge: string; textBadge: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    sales: {
      label: 'فروش',
      dotColor: 'bg-emerald-500',
      bgBadge: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      textBadge: 'text-emerald-700 dark:text-emerald-300',
      icon: ShoppingCart,
    },
    retail: {
      label: 'خرده‌فروشی',
      dotColor: 'bg-amber-500',
      bgBadge: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      textBadge: 'text-amber-700 dark:text-amber-300',
      icon: Store,
    },
    purchase: {
      label: 'خرید',
      dotColor: 'bg-blue-500',
      bgBadge: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
      textBadge: 'text-blue-700 dark:text-blue-300',
      icon: ArrowDownLeft,
    },
    sales_return: {
      label: 'برگشت فروش',
      dotColor: 'bg-rose-500',
      bgBadge: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
      textBadge: 'text-rose-700 dark:text-rose-300',
      icon: RotateCcw,
    },
    purchase_return: {
      label: 'برگشت خرید',
      dotColor: 'bg-red-800',
      bgBadge: 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800',
      textBadge: 'text-red-900 dark:text-red-300',
      icon: ArrowUpRight,
    },
  };

  return (
    <div className="space-y-4 pb-28 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="min-w-0 w-full sm:w-auto">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>مدیریت فاکتورها (خرید، فروش و مرجوعی)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ثبت سریع فاکتورهای ۵ گانه همراه با تغییر خودکار موجودی انبار و حساب مشتری
          </p>
        </div>

        <div className="flex w-full sm:w-auto sm:shrink-0">
          <button
            type="button"
            onClick={() => onOpenBulkExport(filteredInvoices)}
            className="min-h-[44px] w-full px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>خروجی گروهی ({toPersianDigits(filteredInvoices.length)})</span>
          </button>
        </div>
      </div>


      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-3 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">کل فاکتورها:</span>
          <span className="text-base font-black text-slate-900 dark:text-slate-100 tabular-nums">
            {toPersianDigits(activeInvoices.length)} فاکتور
          </span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">مجموع فروش:</span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums truncate block">
            {formatToman(totalSalesAmount).replace(' تومان', '')}
          </span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">فاکتورهای نسیه:</span>
          <span className="text-base font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {toPersianDigits(unpaidCount)} مورد
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-850 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در شماره فاکتور، نام مشتری یا قلم کالا..."
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {(
            [
              ['all', 'همه فاکتورها'],
              ['sales', 'فروش (سبز)'],
              ['retail', 'خرده‌فروشی (نارنجی)'],
              ['purchase', 'خرید (آبی)'],
              ['sales_return', 'برگشت فروش (قرمز)'],
              ['purchase_return', 'برگشت خرید'],
            ] as const
          ).map(([val, label]) => {
            const isActive = selectedTypeFilter === val;
            return (
              <button
                key={val}
                onClick={() => setSelectedTypeFilter(val)}
                className={`py-1.5 px-3 rounded-xl font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  isActive
                    ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              هیچ فاکتوری در این بخش یافت نشد
            </p>
            <p className="text-xs text-slate-400">
              برای ثبت فاکتور جدید، روی دکمه نارنجی (+) پایین صفحه کلیک کنید.
            </p>
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const cfg = typeConfig[inv.type];
            const Icon = cfg.icon;
            const partyName = inv.customerName || inv.supplierName || 'مشتری حضوری (نقدی)';
            return (
              <div
                key={inv.id}
                className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs space-y-2.5 hover:shadow-md transition-shadow"
              >
                {/* Header: Number, Type badge, Date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${cfg.bgBadge} ${cfg.textBadge}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cfg.label}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {inv.invoiceNumber}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {toPersianDigits(inv.date)} · {toPersianDigits(inv.time)}
                  </span>
                </div>

                {/* Party Name & Items summary */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {partyName}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {toPersianDigits(inv.items.length)} قلم: {inv.items.map((i) => i.productName).join('، ')}
                    </p>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-[10px] text-slate-400 block">مبلغ نهایی:</span>
                    <span className="font-black text-sm text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatToman(inv.finalTotal)}
                    </span>
                  </div>
                </div>

                {/* Payment status, profit if any, and Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {inv.remainingAmount > 0 ? (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-md tabular-nums">
                        مانده: {formatToman(inv.remainingAmount)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>تسویه کامل</span>
                      </span>
                    )}

                    {inv.totalProfit !== undefined && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                        سود: +{formatToman(inv.totalProfit)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {onAssignBatches && inv.items.some((i) => !i.batchId && !(i.locationSplits && i.locationSplits.length)) && (
                      <button
                        onClick={() => onAssignBatches(inv)}
                        className="py-1 px-2.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-900 rounded-lg text-xs font-bold"
                        title="تخصیص بچ به قلم‌های بدون بچ"
                      >
                        بچ
                      </button>
                    )}
                    {onApplyPendingStock && inv.items.some((item) => item.stockAdjustmentStatus === 'pending' && !item.productId.startsWith('quick_')) && (() => {
                      const outgoing = inv.type === 'sales' || inv.type === 'retail' || inv.type === 'purchase_return';
                      const eligible = inv.items.some((item) => {
                        if (item.stockAdjustmentStatus !== 'pending' || item.productId.startsWith('quick_')) return false;
                        const p = products.find(prod => prod.id === item.productId && !prod.deleted);
                        return !!p && (!outgoing || p.stock >= item.quantity);
                      });
                      return <button
                        disabled={!eligible}
                        onClick={() => onApplyPendingStock(inv.id)}
                        className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={eligible ? 'اعمال موجودی اقلام واجد شرایط' : 'برای کسر موجودی، موجودی کافی در انبار وجود ندارد'}
                      >اعمال موجودی</button>;
                    })()}

                    {onEditInvoice && <button
                      onClick={() => onEditInvoice(inv)}
                      className="py-1 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-900 rounded-lg text-xs font-bold flex items-center gap-1"
                      title="ویرایش فاکتور"
                    ><Pencil className="w-3.5 h-3.5"/><span>ویرایش</span></button>}

                    <button
                      onClick={() => onViewInvoice(inv)}
                      className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="چاپ و پیش‌نمایش ۵ قالب"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>چاپ و خروجی</span>
                    </button>

                    <button
                      onClick={() => onShareInvoice(inv)}
                      className="py-1 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="اشتراک‌گذاری در واتساپ و تلگرام"
                    >
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">اشتراک</span>
                    </button>

                    <button
                      onClick={() => onViewAudit(inv)}
                      className="py-1 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="تاریخچه تغییرات و چاپ فاکتور"
                    >
                      <History className="w-3.5 h-3.5 text-blue-500" />
                      <span className="hidden sm:inline">تاریخچه</span>
                    </button>

                    {deletingId === inv.id ? (
                      <div className="flex items-center gap-1 animate-in fade-in">
                        <button
                          onClick={() => {
                            onDeleteInvoice(inv.id);
                            setDeletingId(null);
                          }}
                          className="py-1 px-2 bg-rose-600 text-white rounded-lg text-[10px] font-bold"
                        >
                          تأیید حذف
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="py-1 px-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px]"
                        >
                          لغو
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(inv.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="حذف فاکتور"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (FAB) + 5 Options Bottom Sheet */}
      <InvoiceFABMenu onSelectType={onOpenCreateInvoice} onSelectQuickInvoice={onOpenQuickInvoice} />
    </div>
  );
};

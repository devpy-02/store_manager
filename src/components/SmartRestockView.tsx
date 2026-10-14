import React, { useState, useMemo } from 'react';
import { Product, Invoice, RestockSuggestion, RestockUrgency } from '../types';
import { calculateRestockSuggestions } from '../utils/analyticsUtils';
import { formatToman, toPersianDigits } from '../utils/jalali';
import {
  ShoppingCart,
  Search,
  Filter,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sliders,
  DollarSign,
  ChevronDown,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';

interface Props {
  products: Product[];
  invoices: Invoice[];
  onOpenPurchaseInvoice: (product: Product, quantity: number) => void;
  onSelectProduct: (product: Product) => void;
  onUpdateProductParams: (
    productId: string,
    params: { leadTimeDays?: number; safetyFactor?: number; analysisPeriodDays?: number }
  ) => void;
}

export const SmartRestockView: React.FC<Props> = ({
  products,
  invoices,
  onOpenPurchaseInvoice,
  onSelectProduct,
  onUpdateProductParams,
}) => {
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | RestockUrgency>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tuningProduct, setTuningProduct] = useState<Product | null>(null);

  // Form tuner state
  const [tLeadTime, setTLeadTime] = useState<number>(7);
  const [tSafetyFactor, setTSafetyFactor] = useState<number>(1.5);
  const [tPeriod, setTPeriod] = useState<number>(30);

  const suggestions = useMemo(() => {
    return calculateRestockSuggestions(products, invoices, 30);
  }, [products, invoices]);

  // Counts
  const counts = useMemo(() => {
    let critical = 0;
    let urgent = 0;
    let soon = 0;
    let sufficient = 0;
    suggestions.forEach((s) => {
      if (s.urgency === 'critical') critical++;
      else if (s.urgency === 'urgent') urgent++;
      else if (s.urgency === 'soon') soon++;
      else sufficient++;
    });
    return { critical, urgent, soon, sufficient, totalNeedingOrder: critical + urgent + soon };
  }, [suggestions]);

  // Filtered suggestions
  const visibleSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (urgencyFilter !== 'all' && s.urgency !== urgencyFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.productName.toLowerCase().includes(q) ||
          s.productCode.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [suggestions, urgencyFilter, searchQuery]);

  const handleOpenTuner = (s: RestockSuggestion) => {
    const p = products.find((prod) => prod.id === s.productId);
    if (p) {
      setTuningProduct(p);
      setTLeadTime(p.leadTimeDays || s.leadTimeDays);
      setTSafetyFactor(p.safetyFactor || s.safetyFactor);
      setTPeriod(p.analysisPeriodDays || 30);
    }
  };

  const handleSaveTuning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tuningProduct) return;
    onUpdateProductParams(tuningProduct.id, {
      leadTimeDays: tLeadTime,
      safetyFactor: tSafetyFactor,
      analysisPeriodDays: tPeriod,
    });
    setTuningProduct(null);
  };

  return (
    <div className="space-y-4">
      {/* Banner explaining algorithm */}
      <div className="p-3.5 bg-linear-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
              سیستم پیش‌بینی اتمام و پیشنهاد هوشمند تأمین
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              محاسبه نقطه سفارش، زمان تأمین و میانگین فروش روزانه برای جلوگیری از کسری انبار
            </p>
          </div>
        </div>

        <span className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums shrink-0 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
          {toPersianDigits(counts.totalNeedingOrder)} کالا نیازمند خرید
        </span>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setUrgencyFilter('all')}
          className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors shrink-0 ${
            urgencyFilter === 'all'
              ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          همه ({toPersianDigits(suggestions.length)})
        </button>

        <button
          onClick={() => setUrgencyFilter('critical')}
          className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${
            urgencyFilter === 'critical'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
          }`}
        >
          <span>🔴 فوری</span>
          <span className="tabular-nums">({toPersianDigits(counts.critical)})</span>
        </button>

        <button
          onClick={() => setUrgencyFilter('urgent')}
          className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${
            urgencyFilter === 'urgent'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
          }`}
        >
          <span>🟠 نیاز فوری</span>
          <span className="tabular-nums">({toPersianDigits(counts.urgent)})</span>
        </button>

        <button
          onClick={() => setUrgencyFilter('soon')}
          className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${
            urgencyFilter === 'soon'
              ? 'bg-yellow-600 text-white shadow-xs'
              : 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900'
          }`}
        >
          <span>🟡 به زودی</span>
          <span className="tabular-nums">({toPersianDigits(counts.soon)})</span>
        </button>

        <button
          onClick={() => setUrgencyFilter('sufficient')}
          className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${
            urgencyFilter === 'sufficient'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
          }`}
        >
          <span>✅ کافی</span>
          <span className="tabular-nums">({toPersianDigits(counts.sufficient)})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجو در لیست سفارش‌ها (نام کالا، کد یا دسته)..."
          className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Restock List Cards */}
      <div className="space-y-3">
        {visibleSuggestions.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-300">
              هیچ کالایی در این دسته یافت نشد.
            </p>
            <p>موجودی اقلام انبار در وضعیت مناسب قرار دارد.</p>
          </div>
        ) : (
          visibleSuggestions.map((s) => {
            const originalProd = products.find((p) => p.id === s.productId);
            const isCritical = s.urgency === 'critical';
            const isUrgent = s.urgency === 'urgent';
            const isSoon = s.urgency === 'soon';

            return (
              <div
                key={s.productId}
                className={`p-4 rounded-2xl border shadow-xs transition-all space-y-3 bg-white dark:bg-slate-850 ${
                  isCritical
                    ? 'border-rose-300 dark:border-rose-900/80 ring-1 ring-rose-500/10'
                    : isUrgent
                    ? 'border-amber-300 dark:border-amber-900/80 ring-1 ring-amber-500/10'
                    : isSoon
                    ? 'border-yellow-300 dark:border-yellow-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : isUrgent
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : isSoon
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {isCritical
                          ? '🔴 سفارش فوری'
                          : isUrgent
                          ? '🟠 نیاز فوری به خرید'
                          : isSoon
                          ? '🟡 سفارش به زودی'
                          : '✅ موجودی کافی'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {s.productCode}
                      </span>
                    </div>

                    <h4
                      onClick={() => originalProd && onSelectProduct(originalProd)}
                      className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1 cursor-pointer hover:text-amber-600 transition-colors truncate"
                    >
                      {s.productName}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      دسته: {s.category}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenTuner(s)}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs shrink-0"
                    title="تنظیم پارامترهای الگوریتم"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Metric Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">موجودی فعلی:</span>
                    <strong
                      className={`tabular-nums text-sm ${
                        s.currentStock <= 0
                          ? 'text-rose-600'
                          : s.currentStock <= s.reorderPoint
                          ? 'text-amber-600'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {toPersianDigits(s.currentStock)} {s.unit}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">مقدار پیشنهادی خرید:</span>
                    <strong className="text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums">
                      {s.suggestedQuantity > 0 ? `${toPersianDigits(s.suggestedQuantity)} ${s.unit}` : '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">نقطه سفارش (Reorder):</span>
                    <strong className="tabular-nums font-bold text-slate-700 dark:text-slate-300">
                      {toPersianDigits(s.reorderPoint)} {s.unit}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">تخمین اتمام:</span>
                    <strong
                      className={`tabular-nums font-extrabold ${
                        s.daysUntilStockout <= 2
                          ? 'text-rose-600'
                          : s.daysUntilStockout <= 7
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {s.daysUntilStockout === 0
                        ? 'اتمام موجودی'
                        : `${toPersianDigits(s.daysUntilStockout)} روز`}
                    </strong>
                  </div>
                </div>

                {/* Additional Insight & Order Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      میانگین مصرف: <strong>{toPersianDigits(s.avgDailySales)}</strong> {s.unit}/روز ·
                      زمان تأمین: <strong>{toPersianDigits(s.leadTimeDays)} روز</strong>
                    </span>
                    {s.suggestedQuantity > 0 && (
                      <span className="block text-slate-600 dark:text-slate-300 font-medium">
                        تخمین هزینه خرید: <strong className="text-amber-600">{formatToman(s.estimatedOrderCost)}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {originalProd && (
                      <button
                        onClick={() => onSelectProduct(originalProd)}
                        className="flex-1 sm:flex-none px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                      >
                        تحلیل کامل
                      </button>
                    )}

                    {s.suggestedQuantity > 0 && originalProd && (
                      <button
                        onClick={() => onOpenPurchaseInvoice(originalProd, s.suggestedQuantity)}
                        className="flex-2 sm:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>ثبت سفارش خرید</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Parameter Tuning Modal */}
      {tuningProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveTuning}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  تنظیم الگوریتم: {tuningProduct.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTuningProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  زمان تأمین کالا (Lead Time به روز):
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={tLeadTime}
                  onChange={(e) => setTLeadTime(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  💡 چند روز طول می‌کشد تا سفارش خرید به مغازه برسد؟ (پیش‌فرض: ۷ روز)
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  ضریب اطمینان (Safety Factor):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={3}
                  value={tSafetyFactor}
                  onChange={(e) => setTSafetyFactor(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  💡 ذخیره احتیاطی برای جلوگیری از بی‌جنسی (۱.۰ تا ۲.۵)
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  دوره تحلیل فروش (روز):
                </label>
                <select
                  value={tPeriod}
                  onChange={(e) => setTPeriod(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value={7}>۷ روز اخیر</option>
                  <option value={30}>۳۰ روز اخیر (توصیه شده)</option>
                  <option value={60}>۶۰ روز اخیر</option>
                  <option value={90}>۹۰ روز اخیر</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTuningProduct(null)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold"
              >
                اعمال تنظیمات
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

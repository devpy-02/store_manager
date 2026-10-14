import React, { useState, useMemo } from 'react';
import { Product, Invoice, ProductUnit } from '../types';
import { calculateProductMetrics, isSalesInvoice } from '../utils/analyticsUtils';
import { formatToman, toPersianDigits, timeAgoPersian, formatPersianDateShort } from '../utils/jalali';
import {
  X,
  TrendingUp,
  PackageCheck,
  ShoppingCart,
  Calendar,
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface Props {
  product: Product;
  invoices: Invoice[];
  isOpen: boolean;
  onClose: () => void;
  onOpenPurchaseInvoice: (product: Product, quantity: number) => void;
  onUpdateProductParams: (productId: string, params: { leadTimeDays?: number; safetyFactor?: number; analysisPeriodDays?: number }) => void;
}

export const ProductAnalyticsModal: React.FC<Props> = ({
  product,
  invoices,
  isOpen,
  onClose,
  onOpenPurchaseInvoice,
  onUpdateProductParams,
}) => {
  const [selectedPeriodDays, setSelectedPeriodDays] = useState<number>(30);
  const [isEditingParams, setIsEditingParams] = useState(false);

  // Form params state
  const [leadTime, setLeadTime] = useState<number>(product.leadTimeDays || 7);
  const [safetyFactor, setSafetyFactor] = useState<number>(product.safetyFactor || 1.5);
  const [analysisPeriod, setAnalysisPeriod] = useState<number>(product.analysisPeriodDays || 30);

  const metrics = useMemo(() => {
    return calculateProductMetrics(product, invoices, selectedPeriodDays);
  }, [product, invoices, selectedPeriodDays]);

  // Filter recent sales invoices containing this item
  const recentSales = useMemo(() => {
    const list: {
      invoiceId: string;
      invoiceNumber: string;
      date: string;
      customerName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    invoices.filter(isSalesInvoice).forEach((inv) => {
      inv.items.forEach((it) => {
        if (it.productId === product.id) {
          list.push({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            date: inv.date || formatPersianDateShort(inv.createdAt),
            customerName: inv.customerName || 'مشتری آزاد / متفرقه',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
          });
        }
      });
    });

    return list.slice(0, 10);
  }, [product.id, invoices]);

  if (!isOpen) return null;

  const handleSaveParams = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProductParams(product.id, {
      leadTimeDays: leadTime,
      safetyFactor,
      analysisPeriodDays: analysisPeriod,
    });
    setIsEditingParams(false);
  };

  const reorder = metrics.suggestedReorder;
  const isUrgent = reorder.urgency === 'critical' || reorder.urgency === 'urgent';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Grab bar for mobile */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              📊 جزئیات فروش: {product.name}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {product.code}
              </span>
              <span>·</span>
              <span>دسته: {product.category}</span>
              <span>·</span>
              <span>
                موجودی: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{toPersianDigits(product.stock)} {product.unit}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Period selector chips */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">دوره زمانی تحلیل:</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[
                [7, '۷ روز'],
                [30, '۳۰ روز'],
                [90, '۳ ماه'],
                [365, 'یک سال'],
              ].map(([days, label]) => (
                <button
                  key={days}
                  onClick={() => setSelectedPeriodDays(Number(days))}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    selectedPeriodDays === days
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 📈 6 Key Metric Cards (Part 6) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Total Units */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">کل فروش:</span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {toPersianDigits(metrics.totalUnitsSold)} {product.unit}
              </span>
            </div>

            {/* Total Revenue */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">کل درآمد:</span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {formatToman(metrics.totalRevenue)}
              </span>
            </div>

            {/* ADS (Average Daily Sales) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">میانگین روزانه (ADS):</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-200 tabular-nums">
                {toPersianDigits(metrics.avgDailySales)} {product.unit} در روز
              </span>
            </div>

            {/* Weekly Average */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">میانگین هفتگی:</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-200 tabular-nums">
                {toPersianDigits(metrics.avgWeeklySales)} {product.unit} در هفته
              </span>
            </div>

            {/* Last Sale */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">آخرین فروش:</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {metrics.lastSaleDate ? timeAgoPersian(metrics.lastSaleDate) : 'ثبت نشده'}
              </span>
            </div>

            {/* Total Profit & Margin */}
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-1">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block">
                سود کل ({toPersianDigits(metrics.profitMarginPercent)}٪ حاشیه):
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatToman(metrics.totalProfit)}
              </span>
            </div>
          </div>

          {/* 🔍 Sales Frequency & Behavioral Analysis */}
          <div className="p-3.5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>تحلیل آماری و رفتار فروش:</span>
            </h4>
            <div className="space-y-1.5 text-slate-700 dark:text-slate-300 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-blue-500">•</span>
                <span>
                  به طور میانگین هر{' '}
                  <strong className="text-blue-600 dark:text-blue-400 font-black">
                    {metrics.avgDailySales > 0 ? toPersianDigits(Math.max(1, Math.round(1 / metrics.avgDailySales))) : '—'}
                  </strong>{' '}
                  روز یک بار از این کالا فروخته می‌شود.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-500">•</span>
                <span>
                  در {toPersianDigits(selectedPeriodDays)} روز اخیر در مجموع{' '}
                  <strong>{toPersianDigits(metrics.salesCount)}</strong> فاکتور ثبت شده است.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-500">•</span>
                <span>
                  پرفروش‌ترین روز هفته برای این کالا:{' '}
                  <strong className="text-amber-600 font-bold">{metrics.peakDayOfWeek}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-500">•</span>
                <span>
                  پیک ساعات ثبت سفارش:{' '}
                  <strong className="text-emerald-600 font-bold">{metrics.peakHourRange}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-500">•</span>
                <span>
                  نرخ گردش موجودی (Turnover):{' '}
                  <strong className="tabular-nums">{toPersianDigits(metrics.turnoverRate)} بار</strong> · پوشش موجودی انبار:{' '}
                  <strong className="tabular-nums">
                    {metrics.daysOfInventory > 300 ? '+۳۰۰' : toPersianDigits(metrics.daysOfInventory)} روز
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* 🛒 Smart Restock Suggestion Card (Part 7 & 8) */}
          <div
            className={`p-4 rounded-2xl border shadow-xs space-y-3.5 transition-all ${
              isUrgent
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart
                  className={`w-4 h-4 ${isUrgent ? 'text-rose-600' : 'text-emerald-600'}`}
                />
                <h3
                  className={`text-xs font-black ${
                    isUrgent ? 'text-rose-950 dark:text-rose-200' : 'text-emerald-950 dark:text-emerald-200'
                  }`}
                >
                  🛒 الگوریتم هوشمند پیشنهاد سفارش مجدد
                </h3>
              </div>

              <button
                onClick={() => setIsEditingParams(!isEditingParams)}
                className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 font-semibold"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isEditingParams ? 'بستن تنظیمات' : 'تنظیم پارامترها'}</span>
              </button>
            </div>

            {/* Calculations breakdown */}
            <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                مبنای محاسبات فرمول سفارش مجدد (۳۰ روز اخیر):
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                <div>
                  • میانگین فروش روزانه:{' '}
                  <strong className="tabular-nums">{toPersianDigits(reorder.avgDailySales)} {product.unit}</strong>
                </div>
                <div>
                  • موجودی فعلی انبار:{' '}
                  <strong className="tabular-nums">{toPersianDigits(product.stock)} {product.unit}</strong>
                </div>
                <div>
                  • زمان تأمین (Lead Time):{' '}
                  <strong className="tabular-nums">{toPersianDigits(reorder.leadTimeDays)} روز</strong>
                </div>
                <div>
                  • موجودی اطمینان (Safety):{' '}
                  <strong className="tabular-nums">{toPersianDigits(reorder.safetyStock)} {product.unit}</strong>
                </div>
                <div>
                  • نقطه سفارش مجدد:{' '}
                  <strong className="text-amber-600 dark:text-amber-400 font-bold tabular-nums">
                    {toPersianDigits(reorder.reorderPoint)} {product.unit}
                  </strong>
                </div>
                <div>
                  • مقدار پیشنهادی سفارش:{' '}
                  <strong className="text-rose-600 dark:text-rose-400 font-black tabular-nums">
                    {toPersianDigits(reorder.suggestedQuantity)} {product.unit}
                  </strong>
                </div>
              </div>
            </div>

            {/* Action suggestion banner */}
            {isUrgent ? (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl text-xs space-y-2 border border-rose-200 dark:border-rose-900">
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    ⚠️ شما باید هم‌اکنون سفارش خرید ثبت کنید!
                  </span>
                </div>
                <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                  موجودی فعلی ({toPersianDigits(product.stock)}) از نقطه سفارش ({toPersianDigits(reorder.reorderPoint)}) کمتر است.
                  تخمین اتمام موجودی: <strong>{reorder.daysUntilStockout === 0 ? 'هم‌اکنون تمام شده' : `${toPersianDigits(reorder.daysUntilStockout)} روز دیگر`}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onOpenPurchaseInvoice(product, Math.max(1, reorder.suggestedQuantity));
                    onClose();
                  }}
                  className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>ثبت فوری فاکتور خرید ({toPersianDigits(Math.max(1, reorder.suggestedQuantity))} {product.unit})</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-xs space-y-1.5 border border-emerald-200 dark:border-emerald-900">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✅ موجودی فعلی کافی است</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  موجودی فعلی انبار بیشتر از نقطه سفارش مجدد است. تخمین: تا حداقل{' '}
                  <strong>{toPersianDigits(reorder.daysUntilStockout)} روز دیگر</strong> نیازی به سفارش خرید نیست.
                </p>
              </div>
            )}

            {/* Inline Parameter Editing Form (Part 8) */}
            {isEditingParams && (
              <form
                onSubmit={handleSaveParams}
                className="p-3.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
              >
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  <span>تنظیم پارامترهای اختصاصی این کالا:</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      زمان تأمین کالا (روز):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={leadTime}
                      onChange={(e) => setLeadTime(Number(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      ضریب اطمینان (Safety):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={1}
                      max={3}
                      value={safetyFactor}
                      onChange={(e) => setSafetyFactor(Number(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingParams(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-600 text-white font-bold"
                  >
                    ذخیره پارامترها
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 📋 Recent Sales List */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>📋 آخرین فاکتورهای فروش این کالا ({toPersianDigits(recentSales.length)} مورد):</span>
            </h4>

            {recentSales.length === 0 ? (
              <p className="p-4 text-center bg-slate-50 dark:bg-slate-850 rounded-xl text-xs text-slate-400">
                فاکتوری برای این کالا ثبت نشده است.
              </p>
            ) : (
              <div className="space-y-1.5">
                {recentSales.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {s.customerName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ({s.invoiceNumber})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{s.date}</span>
                    </div>

                    <div className="text-left">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block tabular-nums">
                        {toPersianDigits(s.quantity)} {product.unit}
                      </span>
                      <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatToman(s.totalPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Product, Invoice, Category, User } from '../types';
import {
  calculateAnalyticsSummary,
  calculateDailySalesChart,
  calculateCategorySales,
  calculateRestockSuggestions,
  calculateDeadStock,
  isSalesInvoice,
} from '../utils/analyticsUtils';
import {
  DailySalesLineChart,
  TopProductsBarChart,
  CategoryDonutChart,
  PeriodComparisonCard,
} from './AnalyticsCharts';
import { SmartRestockView } from './SmartRestockView';
import { AnalyticsReportsView } from './AnalyticsReportsView';
import { formatToman, toPersianDigits } from '../utils/jalali';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  FileText,
  Calendar,
  Download,
  Share2,
  Printer,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertCircle,
  Clock,
  Layers,
  Percent,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';

interface Props {
  products: Product[];
  invoices: Invoice[];
  categories: Category[];
  currentUser: User;
  onSelectProduct: (product: Product) => void;
  onOpenPurchaseInvoice: (product: Product, quantity: number) => void;
  onUpdateProductParams: (
    productId: string,
    params: { leadTimeDays?: number; safetyFactor?: number; analysisPeriodDays?: number }
  ) => void;
}

export type AnalyticsTab = 'overview' | 'restock' | 'reports';

export const AnalyticsView: React.FC<Props> = ({
  products,
  invoices,
  categories,
  currentUser,
  onSelectProduct,
  onOpenPurchaseInvoice,
  onUpdateProductParams,
}) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'profit'>('revenue');

  // Calculate master summary
  const summary = useMemo(() => {
    return calculateAnalyticsSummary(invoices, products);
  }, [invoices, products]);

  // Calculate 30-day daily points for line chart
  const dailyChartData = useMemo(() => {
    return calculateDailySalesChart(invoices, 30);
  }, [invoices]);

  // Calculate category distribution
  const categorySales = useMemo(() => {
    return calculateCategorySales(invoices, products, categories);
  }, [invoices, products, categories]);

  // Top products
  const topProducts = useMemo(() => {
    const pSalesMap: Record<string, { unitsSold: number; revenue: number }> = {};
    invoices.filter(isSalesInvoice).forEach((inv) => {
      inv.items.forEach((it) => {
        if (!pSalesMap[it.productId]) {
          pSalesMap[it.productId] = { unitsSold: 0, revenue: 0 };
        }
        pSalesMap[it.productId].unitsSold += it.quantity;
        pSalesMap[it.productId].revenue += it.totalPrice;
      });
    });

    return Object.entries(pSalesMap)
      .map(([productId, stats]) => {
        const prod = products.find((p) => p.id === productId);
        return {
          productId,
          productName: prod ? prod.name : 'کالای نامشخص',
          productCode: prod ? prod.code : '—',
          unitsSold: stats.unitsSold,
          revenue: stats.revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [invoices, products]);

  // Restock suggestions
  const restockSuggestions = useMemo(() => {
    return calculateRestockSuggestions(products, invoices, 30);
  }, [products, invoices]);

  const urgentRestocks = useMemo(() => {
    return restockSuggestions.filter((s) => s.urgency === 'critical' || s.urgency === 'urgent');
  }, [restockSuggestions]);

  // Dead stock
  const deadStock = useMemo(() => {
    return calculateDeadStock(products, invoices, 30);
  }, [products, invoices]);

  // Export full dashboard to Excel
  const handleExportFullExcel = () => {
    try {
      const summarySheet = [
        { شاخص: 'فروش امروز (تومان)', مقدار: summary.todayRevenue, رشد: `${summary.todayGrowthPercent}٪ نسبت به دیروز` },
        { شاخص: 'فروش این هفته (تومان)', مقدار: summary.thisWeekRevenue, رشد: `${summary.weekGrowthPercent}٪ نسبت به هفته قبل` },
        { شاخص: 'فروش این ماه (تومان)', مقدار: summary.thisMonthRevenue, رشد: `${summary.monthGrowthPercent}٪ نسبت به ماه قبل` },
        { شاخص: 'تعداد فاکتورهای ماه', مقدار: summary.thisMonthInvoiceCount, رشد: '—' },
        { شاخص: 'میانگین هر فاکتور (تومان)', مقدار: summary.avgInvoiceValue, رشد: '—' },
        { شاخص: 'سود ناخالص ماه (تومان)', مقدار: summary.totalProfitMonth, رشد: `حاشیه سود: ${summary.overallProfitMargin}٪` },
      ];

      const topProductsSheet = topProducts.map((p, idx) => ({
        رتبه: idx + 1,
        'نام کالا': p.productName,
        'کد کالا': p.productCode,
        'تعداد فروش': p.unitsSold,
        'درآمد کل (تومان)': p.revenue,
      }));

      const restockSheet = restockSuggestions.map((s, idx) => ({
        ردیف: idx + 1,
        'نام کالا': s.productName,
        'کد کالا': s.productCode,
        'موجودی فعلی': s.currentStock,
        'پیشنهاد خرید': s.suggestedQuantity,
        'نقطه سفارش': s.reorderPoint,
        'روز تا اتمام': s.daysUntilStockout,
        اولویت: s.urgency,
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'خلاصه آمار');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topProductsSheet), 'پرفروش‌ترین‌ها');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(restockSheet), 'پیشنهاد سفارش');
      XLSX.writeFile(wb, 'گزارش_جامع_تحلیل_فروش_ابزار_حامی.xlsx');
    } catch {
      // Ignore
    }
  };

  const handleShareReport = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'گزارش آمار و تحلیل فروش ابزار حامی',
          text: `فروش این ماه: ${formatToman(summary.thisMonthRevenue)} (${summary.monthGrowthPercent}٪ رشد) · تعداد فاکتور: ${summary.thisMonthInvoiceCount}`,
          url: window.location.href,
        });
      } catch {
        // Ignore cancel
      }
    } else {
      handleExportFullExcel();
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Sub-Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <span>آمار، تحلیل و سفارش هوشمند</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            گزارش‌های زنده مالی، رفتار خرید مشتریان و الگوریتم پیش‌بینی موجودی
          </p>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportFullExcel}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
            title="دانلود کل آمار به اکسل"
          >
            <Download className="w-4 h-4 text-emerald-600" />
          </button>
          <button
            onClick={handleShareReport}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
            title="اشتراک‌گذاری گزارش"
          >
            <Share2 className="w-4 h-4 text-blue-500" />
          </button>
        </div>
      </div>

      {/* Main Subtabs Header */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200 dark:bg-slate-800/90 rounded-2xl text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          <span>نمای کلی</span>
        </button>

        <button
          onClick={() => setActiveTab('restock')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'restock'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-rose-500" />
          <span>سفارش هوشمند</span>
          {urgentRestocks.length > 0 && (
            <span className="min-w-[16px] h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full px-1 flex items-center justify-center">
              {toPersianDigits(urgentRestocks.length)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'reports'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          <span>گزارش‌ها (۶)</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: OVERVIEW DASHBOARD */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* 4 Key Summary Cards (Part 4) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Today Sales */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                فروش امروز:
              </span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100 tabular-nums block">
                {formatToman(summary.todayRevenue)}
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                {summary.todayGrowthPercent >= 0 ? (
                  <span className="text-emerald-600 flex items-center font-bold">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>{toPersianDigits(summary.todayGrowthPercent)}٪ نسبت به دیروز</span>
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center font-bold">
                    <ArrowDownRight className="w-3 h-3" />
                    <span>{toPersianDigits(Math.abs(summary.todayGrowthPercent))}٪ نسبت به دیروز</span>
                  </span>
                )}
              </div>
            </div>

            {/* This Month Sales */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-600 dark:text-slate-300 block font-medium">
                فروش این ماه:
              </span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400 tabular-nums block">
                {formatToman(summary.thisMonthRevenue)}
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                {summary.monthGrowthPercent >= 0 ? (
                  <span className="text-emerald-600 flex items-center font-bold">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>{toPersianDigits(summary.monthGrowthPercent)}٪ نسبت به ماه قبل</span>
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center font-bold">
                    <ArrowDownRight className="w-3 h-3" />
                    <span>{toPersianDigits(Math.abs(summary.monthGrowthPercent))}٪ نسبت به ماه قبل</span>
                  </span>
                )}
              </div>
            </div>

            {/* Invoices Count */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                تعداد فاکتورهای این ماه:
              </span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100 tabular-nums block">
                {toPersianDigits(summary.thisMonthInvoiceCount)} فاکتور
              </span>
              <span className="text-[10px] text-slate-400 block">
                ثبت‌شده در انبار
              </span>
            </div>

            {/* Average Invoice Amount */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                میانگین مبلغ هر فاکتور:
              </span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100 tabular-nums block">
                {formatToman(summary.avgInvoiceValue)}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                سود: {toPersianDigits(summary.overallProfitMargin)}٪ ({formatToman(summary.totalProfitMonth)})
              </span>
            </div>
          </div>

          {/* 📊 Interactive 30-Day Daily Sales Line Chart (Part 5) */}
          <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  نمودار فروش روزانه ۳۰ روز اخیر
                </h3>
              </div>

              {/* Metric Toggle: Revenue vs Profit */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px]">
                <button
                  onClick={() => setChartMetric('revenue')}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                    chartMetric === 'revenue'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  درآمد فروش
                </button>
                <button
                  onClick={() => setChartMetric('profit')}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                    chartMetric === 'profit'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  سود ناخالص
                </button>
              </div>
            </div>

            {/* Render Line Chart */}
            <DailySalesLineChart data={dailyChartData} metric={chartMetric} />
          </div>

          {/* ⚠️ Restock Alert Quick Widget */}
          {urgentRestocks.length > 0 && (
            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/80 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-rose-950 dark:text-rose-200 font-black">
                  <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />
                  <span>کالاهای نیازمند سفارش فوری ({toPersianDigits(urgentRestocks.length)} کالا)</span>
                </div>
                <button
                  onClick={() => setActiveTab('restock')}
                  className="text-[11px] text-rose-700 dark:text-rose-300 font-bold hover:underline flex items-center gap-0.5"
                >
                  <span>مشاهده همه</span>
                  <ChevronLeft className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-1.5">
                {urgentRestocks.slice(0, 3).map((r) => {
                  const orig = products.find((p) => p.id === r.productId);
                  return (
                    <div
                      key={r.productId}
                      className="p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {r.productName}
                        </span>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400">
                          موجودی: {toPersianDigits(r.currentStock)} · پیشنهاد خرید:{' '}
                          <strong>{toPersianDigits(r.suggestedQuantity)} {r.unit}</strong>
                        </span>
                      </div>

                      {orig && (
                        <button
                          onClick={() => onOpenPurchaseInvoice(orig, Math.max(1, r.suggestedQuantity))}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold shadow-xs"
                        >
                          خرید سریع
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 🏆 Top 10 Best Sellers Bar Chart (Part 5) */}
          <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🏆</span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  ۱۰ محصول پرفروش‌ترین فروشگاه
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('reports')}
                className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
              >
                مشاهده گزارش کامل
              </button>
            </div>

            <TopProductsBarChart
              products={topProducts}
              onSelectProduct={(pId) => {
                const prod = products.find((p) => p.id === pId);
                if (prod) onSelectProduct(prod);
              }}
            />
          </div>

          {/* 📦 Sales by Category Donut / Segment (Part 5) */}
          <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <Layers className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                فروش به تفکیک دسته‌بندی ابزارآلات
              </h3>
            </div>

            <CategoryDonutChart categories={categorySales} />
          </div>

          {/* Period Comparison: This Month vs Last Month (Part 11) */}
          <PeriodComparisonCard
            currentPeriodName="این ماه (۳۰ روز)"
            currentRevenue={summary.thisMonthRevenue}
            previousPeriodName="ماه گذشته"
            previousRevenue={summary.lastMonthRevenue}
            growthPercent={summary.monthGrowthPercent}
          />

          {/* 🐌 Dead Stock Quick Preview (Part 3) */}
          {deadStock.length > 0 && (
            <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                  <span>🐌</span>
                  <span>کالاهای راکد (+۳۰ روز بدون فروش)</span>
                </div>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                >
                  مشاهده همه ({toPersianDigits(deadStock.length)})
                </button>
              </div>

              <div className="space-y-1.5">
                {deadStock.slice(0, 3).map((item) => (
                  <div
                    key={item.product.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {item.product.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        موجودی: {toPersianDigits(item.product.stock)} {item.product.unit} · سرمایه راکد:{' '}
                        {formatToman(item.stuckCapital)}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectProduct(item.product)}
                      className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-bold"
                    >
                      بررسی
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SMART RESTOCK LIST PAGE (Part 9) */}
      {/* ========================================================= */}
      {activeTab === 'restock' && (
        <SmartRestockView
          products={products}
          invoices={invoices}
          onOpenPurchaseInvoice={onOpenPurchaseInvoice}
          onSelectProduct={onSelectProduct}
          onUpdateProductParams={onUpdateProductParams}
        />
      )}

      {/* ========================================================= */}
      {/* TAB 3: REPORTS SECTION (Part 10) */}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <AnalyticsReportsView
          products={products}
          invoices={invoices}
          categories={categories}
          onSelectProduct={onSelectProduct}
          onOpenPurchaseInvoice={onOpenPurchaseInvoice}
        />
      )}
    </div>
  );
};

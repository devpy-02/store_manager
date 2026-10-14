import React, { useState, useMemo } from 'react';
import { Product, Invoice, Category } from '../types';
import {
  calculateProductMetrics,
  calculateCategorySales,
  calculateDeadStock,
  isSalesInvoice,
} from '../utils/analyticsUtils';
import { formatToman, toPersianDigits, timeAgoPersian } from '../utils/jalali';
import * as XLSX from 'xlsx';
import {
  FileText,
  Download,
  Share2,
  Printer,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  ArrowUpDown,
  Layers,
  AlertTriangle,
  Percent,
} from 'lucide-react';

interface Props {
  products: Product[];
  invoices: Invoice[];
  categories: Category[];
  onSelectProduct: (product: Product) => void;
  onOpenPurchaseInvoice: (product: Product, quantity: number) => void;
}

export type ReportType = 'products' | 'top_sellers' | 'dead_stock' | 'trends' | 'categories' | 'profit';

export const AnalyticsReportsView: React.FC<Props> = ({
  products,
  invoices,
  categories,
  onSelectProduct,
  onOpenPurchaseInvoice,
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [sortBy, setSortBy] = useState<'revenue' | 'units' | 'profit' | 'stock'>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  // Pre-calculate all metrics for active products
  const productMetricsList = useMemo(() => {
    return products
      .filter((p) => !p.deleted)
      .map((p) => calculateProductMetrics(p, invoices, 30));
  }, [products, invoices]);

  // Report 1: All Product Sales
  const filteredProductMetrics = useMemo(() => {
    return productMetricsList
      .filter((m) => {
        if (selectedCategory !== 'همه' && m.category !== selectedCategory) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            m.productName.toLowerCase().includes(q) ||
            m.productCode.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'revenue') diff = b.totalRevenue - a.totalRevenue;
        else if (sortBy === 'units') diff = b.totalUnitsSold - a.totalUnitsSold;
        else if (sortBy === 'profit') diff = b.totalProfit - a.totalProfit;
        else if (sortBy === 'stock') diff = b.currentStock - a.currentStock;
        return sortAsc ? -diff : diff;
      });
  }, [productMetricsList, selectedCategory, searchQuery, sortBy, sortAsc]);

  // Report 3: Dead stock
  const deadStockItems = useMemo(() => {
    return calculateDeadStock(products, invoices, 30);
  }, [products, invoices]);

  // Report 5: Categories
  const categorySales = useMemo(() => {
    return calculateCategorySales(invoices, products, categories);
  }, [invoices, products, categories]);

  // Export to Excel handler
  const handleExportExcel = () => {
    try {
      let sheetData: any[] = [];
      let filename = 'گزارش_فروش_ابزار_حامی.xlsx';

      if (activeReport === 'products' || activeReport === 'profit') {
        filename = 'گزارش_جامع_فروش_و_سود_کالاها.xlsx';
        sheetData = filteredProductMetrics.map((m, idx) => ({
          ردیف: idx + 1,
          'نام کالا': m.productName,
          'کد کالا': m.productCode,
          دسته‌بندی: m.category,
          'موجودی فعلی': m.currentStock,
          'تعداد فروش': m.totalUnitsSold,
          'درآمد کل (تومان)': m.totalRevenue,
          'سود کل (تومان)': m.totalProfit,
          'حاشیه سود (%)': m.profitMarginPercent,
          'میانگین روزانه': m.avgDailySales,
          'آخرین فروش': m.lastSaleDate ? timeAgoPersian(m.lastSaleDate) : '—',
        }));
      } else if (activeReport === 'dead_stock') {
        filename = 'گزارش_کالاهای_راکد_انبار.xlsx';
        sheetData = deadStockItems.map((d, idx) => ({
          ردیف: idx + 1,
          'نام کالا': d.product.name,
          'کد کالا': d.product.code,
          'موجودی راکد': d.product.stock,
          'ارزش راکد (تومان)': d.stuckCapital,
          'روزهای بدون فروش': d.daysWithoutSale,
          وضعیت: d.statusBadge,
        }));
      } else if (activeReport === 'categories') {
        filename = 'گزارش_فروش_به_تفکیک_دسته‌بندی.xlsx';
        sheetData = categorySales.map((c, idx) => ({
          ردیف: idx + 1,
          'نام دسته‌بندی': c.categoryName,
          'درآمد کل (تومان)': c.revenue,
          'تعداد فروش': c.unitsSold,
          'سود (تومان)': c.profit,
          'سهم از فروش (%)': c.percentage,
        }));
      }

      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'گزارش');
      XLSX.writeFile(wb, filename);
    } catch {
      // Ignore
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Report Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { id: 'products', label: '📊 فروش محصولات' },
          { id: 'top_sellers', label: '🏆 پرفروش‌ترین‌ها' },
          { id: 'dead_stock', label: '🐌 کالاهای راکد' },
          { id: 'categories', label: '📁 دسته‌بندی‌ها' },
          { id: 'profit', label: '💰 گزارش سود' },
        ].map((rep) => (
          <button
            key={rep.id}
            onClick={() => setActiveReport(rep.id as ReportType)}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors shrink-0 ${
              activeReport === rep.id
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {rep.label}
          </button>
        ))}
      </div>

      {/* Action Bar: Export Excel, Print, Summary */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-850 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="text-slate-600 dark:text-slate-400 font-medium">
          گزارش تحلیلی ۳۰ روز اخیر ابزارآلات
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1 shadow-xs transition-colors"
            title="دانلود فایل اکسل"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold flex items-center gap-1 transition-colors"
            title="چاپ گزارش"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* REPORT 1: Product Sales Table */}
      {activeReport === 'products' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی کالا در گزارش..."
                className="w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="همه">همه دسته‌ها</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                <tr>
                  <th className="p-3">کالا</th>
                  <th
                    className="p-3 cursor-pointer hover:text-amber-600"
                    onClick={() => {
                      setSortBy('units');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    تعداد فروش
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:text-amber-600"
                    onClick={() => {
                      setSortBy('revenue');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    درآمد (تومان)
                  </th>
                  <th className="p-3">موجودی</th>
                  <th className="p-3">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProductMetrics.map((m) => {
                  const originalProduct = products.find((p) => p.id === m.productId);
                  return (
                    <tr
                      key={m.productId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3">
                        <div
                          className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-amber-600 transition-colors"
                          onClick={() => originalProduct && onSelectProduct(originalProduct)}
                        >
                          {m.productName}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {m.productCode} · {m.category}
                        </span>
                      </td>
                      <td className="p-3 tabular-nums font-bold text-slate-800 dark:text-slate-200">
                        {toPersianDigits(m.totalUnitsSold)} {m.unit}
                      </td>
                      <td className="p-3 tabular-nums font-black text-amber-600 dark:text-amber-400">
                        {formatToman(m.totalRevenue)}
                      </td>
                      <td className="p-3 tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                        {toPersianDigits(m.currentStock)}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => originalProduct && onSelectProduct(originalProduct)}
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          تحلیل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: Top Sellers */}
      {activeReport === 'top_sellers' && (
        <div className="space-y-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-bold">
            🏆 ۱۰ محصول پرفروش فروشگاه به ترتیب حجم فروش و درآمد ثبت‌شده در فاکتورها:
          </div>
          <div className="space-y-2">
            {productMetricsList
              .sort((a, b) => b.totalRevenue - a.totalRevenue)
              .slice(0, 10)
              .map((m, idx) => {
                const originalProduct = products.find((p) => p.id === m.productId);
                return (
                  <div
                    key={m.productId}
                    className="p-3 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                        {toPersianDigits(idx + 1)}
                      </span>
                      <div>
                        <h4
                          onClick={() => originalProduct && onSelectProduct(originalProduct)}
                          className="font-bold text-xs text-slate-900 dark:text-slate-100 cursor-pointer hover:text-amber-600"
                        >
                          {m.productName}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          {toPersianDigits(m.totalUnitsSold)} {m.unit} فروخته شده · سهم سود:{' '}
                          {formatToman(m.totalProfit)}
                        </span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums block">
                        {formatToman(m.totalRevenue)}
                      </span>
                      <button
                        onClick={() => originalProduct && onSelectProduct(originalProduct)}
                        className="text-[10px] text-blue-600 hover:underline font-bold"
                      >
                        مشاهده جزئیات
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* REPORT 3: Dead Stock */}
      {activeReport === 'dead_stock' && (
        <div className="space-y-3">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-300 space-y-1">
            <span className="font-bold block">
              🐌 هشدار کالاهای راکد و سرمایه بلوکه شده انبار:
            </span>
            <span className="text-[11px] opacity-90 block">
              کالاهایی که بیش از ۳۰ روز هیچ فروشی نداشته‌اند و نیازمند تخفیف، حراج یا تغییر چیدمان هستند.
            </span>
          </div>

          <div className="space-y-2">
            {deadStockItems.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 text-xs text-slate-400">
                هیچ کالای راکدی یافت نشد! تمام ابزارآلات چرخش فروش مناسبی دارند.
              </div>
            ) : (
              deadStockItems.map((item) => (
                <div
                  key={item.product.id}
                  className="p-3.5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {item.product.name}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                        {item.statusBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      موجودی انبار: <strong>{toPersianDigits(item.product.stock)} {item.product.unit}</strong> ·
                      سرمایه راکد: <strong className="text-rose-600">{formatToman(item.stuckCapital)}</strong>
                    </p>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-[10px] text-slate-400 block">
                      {item.daysWithoutSale === 999 ? 'تاکنون فروخته نشده' : `${toPersianDigits(item.daysWithoutSale)} روز بدون فروش`}
                    </span>
                    <button
                      onClick={() => onSelectProduct(item.product)}
                      className="mt-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-bold"
                    >
                      بررسی کالا
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* REPORT 4: Categories Breakdown */}
      {activeReport === 'categories' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {categorySales.map((c) => (
              <div
                key={c.categoryName}
                className="p-3.5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: c.color || '#F59E0B' }}
                    />
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {c.categoryName}
                    </h4>
                  </div>
                  <span className="font-black text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                    {toPersianDigits(c.percentage)}٪ کل فروش
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    درآمد: <strong className="text-slate-900 dark:text-slate-100">{formatToman(c.revenue)}</strong>
                  </div>
                  <div>
                    سود: <strong className="text-emerald-600">{formatToman(c.profit)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORT 5: Profit & Margin */}
      {activeReport === 'profit' && (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold">
            💰 سود ناخالص و حاشیه سود به تفکیک ابزارآلات بر اساس قیمت خرید و فروش مصوب:
          </div>

          <div className="space-y-2">
            {productMetricsList
              .sort((a, b) => b.totalProfit - a.totalProfit)
              .map((m) => {
                const originalProduct = products.find((p) => p.id === m.productId);
                return (
                  <div
                    key={m.productId}
                    className="p-3 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <h4
                        onClick={() => originalProduct && onSelectProduct(originalProduct)}
                        className="font-bold text-xs text-slate-900 dark:text-slate-100 cursor-pointer hover:text-amber-600"
                      >
                        {m.productName}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        قیمت فروش: {formatToman(m.price)} · خرید: {formatToman(m.buyPrice)}
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 tabular-nums block">
                        +{formatToman(m.totalProfit)}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                        حاشیه: {toPersianDigits(m.profitMarginPercent)}٪
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

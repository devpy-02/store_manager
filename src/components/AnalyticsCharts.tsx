import React, { useState } from 'react';
import { DailySalesPoint, CategorySalesSummary } from '../types';
import { formatToman, toPersianDigits } from '../utils/jalali';
import { TrendingUp, BarChart3, PieChart, Calendar, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface DailySalesChartProps {
  data: DailySalesPoint[];
  metric?: 'revenue' | 'profit' | 'units';
}

export const DailySalesLineChart: React.FC<DailySalesChartProps> = ({ data, metric = 'revenue' }) => {
  const [selectedPoint, setSelectedPoint] = useState<DailySalesPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400">
        داده‌ای برای نمایش نمودار وجود ندارد.
      </div>
    );
  }

  const values = data.map((d) => (metric === 'profit' ? d.profit : metric === 'units' ? d.unitsSold : d.revenue));
  const maxVal = Math.max(...values, 1000);
  const minVal = 0;

  const width = 360;
  const height = 150;
  const paddingX = 24;
  const paddingY = 20;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Build SVG points
  const points = data.map((d, index) => {
    const val = metric === 'profit' ? d.profit : metric === 'units' ? d.unitsSold : d.revenue;
    const x = paddingX + (index / (data.length - 1)) * chartW;
    const y = paddingY + chartH - (val / maxVal) * chartH;
    return { x, y, point: d, val };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  // Fill area under path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${
    height - paddingY
  } Z`;

  return (
    <div className="space-y-2 select-none">
      {/* Selected Point Tooltip / Value banner */}
      <div className="min-h-[38px] p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
        {selectedPoint ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {selectedPoint.jalaliDate} ({selectedPoint.dayName})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">فروش:</span>
              <span className="font-black tabular-nums text-slate-900 dark:text-slate-100">
                {formatToman(selectedPoint.revenue)}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 dark:text-slate-400">سود:</span>
              <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatToman(selectedPoint.profit)}
              </span>
            </div>
          </>
        ) : (
          <div className="text-[11px] text-slate-400 flex items-center justify-between w-full">
            <span>برای مشاهده جزئیات هر روز، روی نقاط نمودار ضربه بزنید.</span>
            <span className="font-mono text-slate-500">۳۰ روز اخیر</span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-40 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#e2e8f0"
            strokeDasharray="3 3"
            strokeWidth="0.8"
            className="dark:stroke-slate-800"
          />
          <line
            x1={paddingX}
            y1={paddingY + chartH / 2}
            x2={width - paddingX}
            y2={paddingY + chartH / 2}
            stroke="#e2e8f0"
            strokeDasharray="3 3"
            strokeWidth="0.8"
            className="dark:stroke-slate-800"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#cbd5e1"
            strokeWidth="1"
            className="dark:stroke-slate-700"
          />

          {/* Shaded Area */}
          <path d={areaD} fill="url(#salesGrad)" />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke="#d97706"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Dots */}
          {points.map((pt, idx) => {
            const isSelected = selectedPoint?.date === pt.point.date;
            // Draw dot on non-zero points or selected or every 5th point
            const shouldShowDot = isSelected || pt.val > 0 || idx % 5 === 0;

            return (
              <g
                key={idx}
                className="cursor-pointer group"
                onClick={() => setSelectedPoint(pt.point)}
              >
                {/* Invisible larger hit target for touch */}
                <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />
                {shouldShowDot && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5 : pt.val > 0 ? 3.5 : 2}
                    className={`transition-all ${
                      isSelected
                        ? 'fill-amber-500 stroke-white dark:stroke-slate-900 stroke-2'
                        : 'fill-amber-600 dark:fill-amber-400 group-hover:scale-125'
                    }`}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Bottom dates banner */}
        <div className="flex justify-between items-center px-4 text-[10px] text-slate-400 pt-1">
          <span>{data[0]?.jalaliDate}</span>
          <span>{data[Math.floor(data.length / 2)]?.jalaliDate}</span>
          <span>{data[data.length - 1]?.jalaliDate}</span>
        </div>
      </div>
    </div>
  );
};

interface TopProductsChartProps {
  products: {
    productId: string;
    productName: string;
    productCode: string;
    unitsSold: number;
    revenue: number;
  }[];
  onSelectProduct?: (productId: string) => void;
}

export const TopProductsBarChart: React.FC<TopProductsChartProps> = ({ products, onSelectProduct }) => {
  if (!products || products.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400">
        داده‌ای برای نمایش پرفروش‌ترین‌ها ثبت نشده است.
      </div>
    );
  }

  const maxRevenue = Math.max(...products.map((p) => p.revenue), 1000);

  return (
    <div className="space-y-2.5">
      {products.slice(0, 10).map((prod, index) => {
        const pct = Math.max(8, Math.round((prod.revenue / maxRevenue) * 100));
        return (
          <div
            key={prod.productId}
            onClick={() => onSelectProduct && onSelectProduct(prod.productId)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 hover:border-amber-400/80 transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                    index === 0
                      ? 'bg-amber-500 text-white'
                      : index === 1
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      : index === 2
                      ? 'bg-amber-700/70 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {toPersianDigits(index + 1)}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[190px]">
                  {prod.productName}
                </span>
                <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
                  {prod.productCode}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {toPersianDigits(prod.unitsSold)} عدد
                </span>
                <span className="font-black text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatToman(prod.revenue)}
                </span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-linear-to-r from-amber-500 to-amber-600"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface CategoryDonutChartProps {
  categories: CategorySalesSummary[];
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ categories }) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400">
        داده‌ای برای دسته‌بندی‌ها موجود نیست.
      </div>
    );
  }

  const total = categories.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="space-y-4">
      {/* Visual Multi-segment Progress Bar */}
      <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
        {categories.map((cat, idx) => (
          <div
            key={idx}
            className="h-full transition-all hover:opacity-80"
            style={{
              width: `${cat.percentage}%`,
              backgroundColor: cat.color || '#3B82F6',
            }}
            title={`${cat.categoryName}: ${cat.percentage}٪`}
          />
        ))}
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {categories.map((cat) => (
          <div
            key={cat.categoryName}
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: cat.color || '#3B82F6' }}
              />
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                {cat.categoryName}
              </span>
            </div>
            <div className="text-left shrink-0">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {toPersianDigits(cat.percentage)}٪
              </span>
              <span className="block text-[10px] text-slate-400 tabular-nums">
                {formatToman(cat.revenue)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PeriodComparisonProps {
  currentPeriodName: string;
  currentRevenue: number;
  previousPeriodName: string;
  previousRevenue: number;
  growthPercent: number;
}

export const PeriodComparisonCard: React.FC<PeriodComparisonProps> = ({
  currentPeriodName,
  currentRevenue,
  previousPeriodName,
  previousRevenue,
  growthPercent,
}) => {
  const isPositive = growthPercent > 0;
  const isNeutral = growthPercent === 0;

  return (
    <div className="p-3.5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800 dark:text-slate-200">
          مقایسه عملکرد ({currentPeriodName} با {previousPeriodName})
        </span>
        <div
          className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] ${
            isNeutral
              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              : isPositive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
          }`}
        >
          {isNeutral ? (
            <Minus className="w-3.5 h-3.5" />
          ) : isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          <span>
            {isPositive ? 'رشد' : isNeutral ? 'بدون تغییر' : 'کاهش'}{' '}
            {toPersianDigits(Math.abs(growthPercent))}٪
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            {currentPeriodName}:
          </span>
          <span className="text-base font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {formatToman(currentRevenue)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            {previousPeriodName}:
          </span>
          <span className="text-base font-black text-slate-700 dark:text-slate-300 tabular-nums">
            {formatToman(previousRevenue)}
          </span>
        </div>
      </div>
    </div>
  );
};

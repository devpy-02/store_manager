import React, { useMemo, useState, useRef } from 'react';
import * as d3 from 'd3';
import { formatToman, formatPersianDateShort, toPersianDigits } from '../utils/jalali';
import { TrendingUp, TrendingDown, Calendar, CircleDot } from 'lucide-react';

export interface PricePoint {
  date: Date;
  price: number;
  userName: string;
  note?: string;
}

interface Props {
  data: PricePoint[];
  currentPrice: number;
  height?: number;
}

export const PriceTrendChart: React.FC<Props> = ({
  data,
  currentPrice,
  height = 220,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Ensure points are sorted by date ascending
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  // Dimensions
  const margin = { top: 20, right: 16, bottom: 32, left: 16 };
  const width = 360; // Base viewBox width for SVG responsiveness

  // Metrics
  const { minPrice, maxPrice, priceDiff, pctChange, isUptrend } = useMemo(() => {
    if (sortedData.length === 0) {
      return { minPrice: currentPrice, maxPrice: currentPrice, priceDiff: 0, pctChange: 0, isUptrend: true };
    }
    const prices = sortedData.map((d) => d.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const firstP = sortedData[0].price;
    const lastP = sortedData[sortedData.length - 1].price;
    const diff = lastP - firstP;
    const pct = firstP > 0 ? (diff / firstP) * 100 : 0;
    return {
      minPrice: minP,
      maxPrice: maxP,
      priceDiff: diff,
      pctChange: pct,
      isUptrend: diff >= 0,
    };
  }, [sortedData, currentPrice]);

  // D3 Scales & Paths
  const { linePath, areaPath, points, xScale, yScale } = useMemo(() => {
    if (sortedData.length < 2) {
      return { linePath: '', areaPath: '', points: [], xScale: null, yScale: null };
    }

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const timeExtent = d3.extent(sortedData, (d) => d.date) as [Date, Date];
    const priceExtent = [
      Math.min(...sortedData.map((d) => d.price)) * 0.96,
      Math.max(...sortedData.map((d) => d.price)) * 1.04,
    ];

    const x = d3
      .scaleTime()
      .domain(timeExtent[0].getTime() === timeExtent[1].getTime()
        ? [new Date(timeExtent[0].getTime() - 86400000), timeExtent[1]]
        : timeExtent
      )
      .range([margin.left, margin.left + innerWidth]);

    const y = d3
      .scaleLinear()
      .domain(priceExtent)
      .range([margin.top + innerHeight, margin.top]);

    const lineGen = d3
      .line<PricePoint>()
      .x((d) => x(d.date))
      .y((d) => y(d.price))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<PricePoint>()
      .x((d) => x(d.date))
      .y0(margin.top + innerHeight)
      .y1((d) => y(d.price))
      .curve(d3.curveMonotoneX);

    const pts = sortedData.map((d, index) => ({
      index,
      x: x(d.date),
      y: y(d.price),
      data: d,
    }));

    return {
      linePath: lineGen(sortedData) || '',
      areaPath: areaGen(sortedData) || '',
      points: pts,
      xScale: x,
      yScale: y,
    };
  }, [sortedData, width, height, margin.left, margin.right, margin.top, margin.bottom]);

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : points[points.length - 1];

  if (sortedData.length < 2) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
        <CircleDot className="w-6 h-6 text-amber-500 mx-auto" />
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
          اولین قیمت ثبت‌شده: {formatToman(currentPrice)}
        </p>
        <p className="text-[11px] text-slate-400">
          با ویرایش قیمت جدید، نمودار روند تغییرات زمانی به‌صورت خودکار در اینجا رسم می‌شود.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 select-none" ref={containerRef}>
      {/* Chart Header Stats */}
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            {activePoint ? `قیمت در ${formatPersianDateShort(activePoint.data.date)}:` : 'قیمت فعلی:'}
          </span>
          <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
            {activePoint ? formatToman(activePoint.data.price) : formatToman(currentPrice)}
          </span>
          {activePoint && (
            <span className="text-[10px] text-slate-400 mr-2">
              (توسط {activePoint.data.userName})
            </span>
          )}
        </div>

        <div className="text-left">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            روند کلی:
          </span>
          <span
            className={`inline-flex items-center gap-1 font-bold text-xs tabular-nums ${
              isUptrend
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isUptrend ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{isUptrend ? '+' : ''}{toPersianDigits(Math.abs(pctChange).toFixed(1))}%</span>
          </span>
        </div>
      </div>

      {/* D3 SVG Container */}
      <div className="relative bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-2 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id="priceTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={width - margin.right}
            y2={margin.top}
            stroke="#94a3b8"
            strokeOpacity="0.15"
            strokeDasharray="3 3"
          />
          <line
            x1={margin.left}
            y1={(margin.top + height - margin.bottom) / 2}
            x2={width - margin.right}
            y2={(margin.top + height - margin.bottom) / 2}
            stroke="#94a3b8"
            strokeOpacity="0.15"
            strokeDasharray="3 3"
          />
          <line
            x1={margin.left}
            y1={height - margin.bottom}
            x2={width - margin.right}
            y2={height - margin.bottom}
            stroke="#94a3b8"
            strokeOpacity="0.2"
          />

          {/* Area under curve */}
          <path d={areaPath} fill="url(#priceTrendGradient)" />

          {/* Main D3 trend line */}
          <path
            d={linePath}
            fill="none"
            stroke="#d97706"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Data points */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIndex === idx || (hoveredIndex === null && idx === points.length - 1);
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onTouchStart={() => setHoveredIndex(idx)}
              >
                {/* Hit area */}
                <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />

                {/* Point */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill={isHovered ? '#f59e0b' : '#ffffff'}
                  stroke="#d97706"
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-150"
                />

                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={9}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeOpacity="0.5"
                    className="animate-ping"
                  />
                )}
              </g>
            );
          })}

          {/* X Axis Labels */}
          {points.length > 0 && (
            <>
              <text
                x={margin.left}
                y={height - margin.bottom + 18}
                fill="#94a3b8"
                fontSize="9"
                textAnchor="start"
                className="font-mono"
              >
                {formatPersianDateShort(points[0].data.date)}
              </text>
              <text
                x={width - margin.right}
                y={height - margin.bottom + 18}
                fill="#94a3b8"
                fontSize="9"
                textAnchor="end"
                className="font-mono"
              >
                {formatPersianDateShort(points[points.length - 1].data.date)}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Min / Max summary row */}
      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">کمترین قیمت:</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
            {formatToman(minPrice)}
          </span>
        </div>
        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">بیشترین قیمت:</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
            {formatToman(maxPrice)}
          </span>
        </div>
      </div>
    </div>
  );
};

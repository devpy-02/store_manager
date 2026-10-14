import { ArrowLeftRight } from 'lucide-react';
import { StorageService as CardStorage } from '../services/storageService';
import { toPersianDigits as cardToPersian } from '../utils/jalali';
import React, { useRef } from 'react';
import { Product, User } from '../types';
import { formatToman, toPersianDigits, timeAgoPersian } from '../utils/jalali';
import { getProductStockStatus, STOCK_STATUS_CONFIG } from '../utils/stockAlertUtils';
import {
  Edit3,
  PackagePlus,
  Wrench,
  AlertTriangle,
  MoreVertical,
  Trash2,
  LineChart,
  PackageCheck,
  EyeOff,
  BellOff,
  AlertCircle,
  XCircle,
  CheckCircle2,
  BarChart3,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface Props {
  product: Product;
  currentUser: User;
  onQuickPrice: (product: Product) => void;
  onQuickStock: (product: Product) => void;
  onEditFull: (product: Product) => void;
  onDelete: (product: Product) => void;
  onTransfer?: (product: Product) => void;
  onViewDetail: (product: Product) => void;
  onViewAnalytics?: (product: Product) => void;
  onCheckAbzarrezaPrice?: (product: Product) => void;
}

export const ProductCard: React.FC<Props> = ({
  product,
  currentUser,
  onQuickPrice,
  onQuickStock,
  onEditFull,
  onDelete,
  onTransfer,
  onViewDetail,
  onViewAnalytics,
  onCheckAbzarrezaPrice,
}) => {
  const [showOptions, setShowOptions] = React.useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const status = getProductStockStatus(product);
  const statusCfg = STOCK_STATUS_CONFIG[status];
  const isOutOfStock = status === 'out_of_stock';
  const minStock = product.minStock !== undefined ? product.minStock : 5;
  const criticalStock = product.criticalStock !== undefined ? product.criticalStock : 0;

  // Handle long-press (Part 7: Quick Test)
  const handleTouchStart = () => {
    if (product.priceSourceType === 'abzarreza' && onCheckAbzarrezaPrice) {
      longPressTimerRef.current = setTimeout(() => {
        onCheckAbzarrezaPrice(product);
      }, 700);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-150 hover:shadow-md"
    >
      {/* Top section: image/icon, name, code, category */}
      <div className="p-3.5 flex gap-3">
        {/* Product image or fallback icon */}
        <div
          onClick={() => onViewDetail(product)}
          className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0 overflow-hidden relative flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
          title="مشاهده جزئیات و نمودار روند قیمت"
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Wrench className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center">
              <span className="text-[10px] text-white font-bold px-1.5 py-0.5 rounded bg-rose-600/90">
                ناموجود
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3
              onClick={() => onViewDetail(product)}
              className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 cursor-pointer hover:text-amber-600 transition-colors"
            >
              {product.name}
            </h3>

            {/* Actions toggle */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="عملیات بیشتر"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showOptions && (
                <div
                  className="absolute left-0 top-8 z-20 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 text-xs"
                  onClick={() => setShowOptions(false)}
                >
                  <button
                    onClick={() => onViewDetail(product)}
                    className="w-full px-3 py-2 text-right text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <LineChart className="w-3.5 h-3.5 text-amber-500" />
                    <span>نمودار قیمت</span>
                  </button>
                  {onViewAnalytics && (
                    <button
                      onClick={() => onViewAnalytics(product)}
                      className="w-full px-3 py-2 text-right text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>آمار و تحلیل فروش</span>
                    </button>
                  )}
                  {product.priceSourceType === 'abzarreza' && onCheckAbzarrezaPrice && (
                    <button
                      onClick={() => onCheckAbzarrezaPrice(product)}
                      className="w-full px-3 py-2 text-right text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 font-semibold"
                    >
                      <Radio className="w-3.5 h-3.5 text-amber-500" />
                      <span>بررسی قیمت از ابزار رضا</span>
                    </button>
                  )}
                  {onTransfer && (
                    <button
                      onClick={() => onTransfer(product)}
                      className="w-full px-3 py-2 text-right text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                      <span>انتقال مکان</span>
                    </button>
                  )}
                  <button
                    onClick={() => onEditFull(product)}
                    className="w-full px-3 py-2 text-right text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                    <span>ویرایش کامل</span>
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => onDelete(product)}
                      className="w-full px-3 py-2 text-right text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>حذف موقت</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Code and Category unboxed metadata */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {product.code}
            </span>
            <span aria-hidden="true">·</span>
            <span>{product.category}</span>
            {product.priceSourceType === 'abzarreza' && (
              <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-semibold" title="قیمت‌گذاری خودکار از ابزار رضا (abzarreza.com)">
                <Radio className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                <span>از ابزار رضا</span>
              </span>
            )}
            {product.deductFromStock === false && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium" title="عدم کسر از موجودی در فاکتور فروش">
                <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                <span>بدون کسر انبار</span>
              </span>
            )}
            {product.alertEnabled === false && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5" title="هشدار موجودی غیرفعال است">
                <BellOff className="w-2.5 h-2.5 text-slate-400" />
                <span>هشدار خاموش</span>
              </span>
            )}
          </div>

          {/* Stock info and color-coded status badge (Part 5) */}
          <div className="flex items-center justify-between gap-1.5 mt-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">موجودی:</span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {toPersianDigits(product.stock)} {product.unit}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${statusCfg.badgeClass}`}>
                {statusCfg.badgeText}
              </span>
            </div>

            {product.locationStock && Object.keys(product.locationStock).some((k) => (product.locationStock as Record<string, number>)[k] > 0) && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {Object.entries<number>(product.locationStock)
                .filter(([, q]) => q > 0)
                .map(([id, q]) => `${CardStorage.getLocationPath(id)}: ${cardToPersian(q)}`)
                .join(' · ')}
            </p>
          )}

          {/* Threshold info */}
            {status === 'low' && (
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                حداقل: {toPersianDigits(minStock)}
              </span>
            )}
            {status === 'critical' && (
              <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                حداقل: {toPersianDigits(minStock)} | بحرانی: {toPersianDigits(criticalStock)}
              </span>
            )}
            {status === 'out_of_stock' && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                حداقل: {toPersianDigits(minStock)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price Banner with D3 Trend trigger */}
      <div
        onClick={() => onViewDetail(product)}
        className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-b border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors"
        title="کلیک برای مشاهده جزئیات و نمودار روند قیمت"
      >
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <LineChart className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          {product.priceSourceType === 'abzarreza' && product.buyPrice ? (
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                خرید: {formatToman(product.buyPrice)}
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                فروش:
              </span>
            </div>
          ) : (
            <span>قیمت فروش (نمودار):</span>
          )}
        </div>
        <div className="text-left">
          <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
            {formatToman(product.price)}
          </div>
          {product.priceSourceType === 'abzarreza' && product.supplierPricesUpdatedAt && (
            <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
              بروزرسانی رضا: {timeAgoPersian(product.supplierPricesUpdatedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Last Updated metadata */}
      <div className="px-3.5 pt-2 pb-1 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>توسط {product.updatedByName || 'نامشخص'}</span>
        <span>{timeAgoPersian(product.updatedAt)}</span>
      </div>

      {/* Quick Action Buttons */}
      <div className="p-2.5 pt-1.5 grid grid-cols-2 gap-2">
        <button
          onClick={() => onQuickPrice(product)}
          className="min-h-[44px] px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-amber-500/30 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>تغییر سریع قیمت</span>
        </button>

        <button
          onClick={() => onQuickStock(product)}
          className="min-h-[44px] px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 active:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <PackagePlus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          <span>ویرایش موجودی</span>
        </button>
      </div>
    </div>
  );
};


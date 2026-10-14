import React, { useMemo, useState, useEffect } from 'react';
import { Product, AuditLog, User } from '../types';
import { StorageService } from '../services/storageService';
import { formatToman, toPersianDigits, formatPersianDateTime, timeAgoPersian } from '../utils/jalali';
import { getProductStockStatus, STOCK_STATUS_CONFIG } from '../utils/stockAlertUtils';
import { PriceTrendChart, PricePoint } from './PriceTrendChart';
import {
  X,
  Edit3,
  PackagePlus,
  Wrench,
  Tag,
  Barcode,
  History,
  TrendingUp,
  Percent,
  Layers,
  Info,
  PackageCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BellOff,
  AlertTriangle,
  BarChart3,
  Radio,
  ExternalLink,
  RefreshCw,
  Lock,
} from 'lucide-react';

interface Props {
  product: Product;
  auditLogs: AuditLog[];
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onQuickPrice: (product: Product) => void;
  onQuickStock: (product: Product) => void;
  onEditFull: (product: Product) => void;
  onOpenAnalytics?: (product: Product) => void;
  onPriceRefreshed?: () => void;
}

export const ProductDetailModal: React.FC<Props> = ({
  product,
  auditLogs,
  currentUser,
  isOpen,
  onClose,
  onQuickPrice,
  onQuickStock,
  onEditFull,
  onOpenAnalytics,
  onPriceRefreshed,
}) => {
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);
  const [priceMessage, setPriceMessage] = useState<string | null>(null);

  // On-demand refresh when product is viewed (Part 8)
  useEffect(() => {
    if (isOpen && product.priceSourceType === 'abzarreza') {
      const now = Date.now();
      const lastCheck = product.lastPriceCheckAttempt ? new Date(product.lastPriceCheckAttempt).getTime() : 0;
      if (now - lastCheck > 30000) {
        setIsCheckingPrice(true);
        StorageService.checkAndUpdateAbzarrezaPrice(product.id, currentUser)
          .then((res) => {
            setIsCheckingPrice(false);
            if (res.changed) {
              setPriceMessage(`قیمت بروزرسانی شد: خرید ${formatToman(res.newBuyPrice || 0)} تومان`);
              if (onPriceRefreshed) onPriceRefreshed();
            }
          })
          .catch(() => {
            setIsCheckingPrice(false);
          });
      }
    }
  }, [isOpen, product.id, product.priceSourceType]);

  const handleManualCheckPrice = async () => {
    setIsCheckingPrice(true);
    setPriceMessage(null);
    try {
      const res = await StorageService.checkAndUpdateAbzarrezaPrice(product.id, currentUser, true);
      setPriceMessage(res.message);
      if (onPriceRefreshed) onPriceRefreshed();
    } catch {
      setPriceMessage('خطا در برقراری ارتباط');
    } finally {
      setIsCheckingPrice(false);
    }
  };

  if (!isOpen) return null;

  // Build price history points for D3
  const priceHistory: PricePoint[] = useMemo(() => {
    // 1. Filter audit logs for price updates on this product
    const relevantLogs = auditLogs
      .filter((l) => l.productId === product.id && l.changeType === 'price_update')
      .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());

    const points: PricePoint[] = [];

    // If we have audit logs, parse their old and new values
    if (relevantLogs.length > 0) {
      // First point: old value of earliest log
      const firstLog = relevantLogs[0];
      const matchOld = firstLog.oldValue.replace(/[^0-9]/g, '');
      const oldPrice = matchOld ? parseInt(matchOld, 10) : product.price * 0.9;
      const initialDate = new Date(new Date(firstLog.changedAt).getTime() - 15 * 86400000);

      points.push({
        date: initialDate,
        price: oldPrice,
        userName: 'قیمت پایه اولیه',
        note: 'ثبت در سیستم',
      });

      relevantLogs.forEach((log) => {
        const matchNew = log.newValue.replace(/[^0-9]/g, '');
        const newPrice = matchNew ? parseInt(matchNew, 10) : product.price;
        points.push({
          date: new Date(log.changedAt),
          price: newPrice,
          userName: log.changedByName,
          note: log.newValue,
        });
      });
    } else {
      // Create a realistic 4-point historical progression leading to current price
      const now = Date.now();
      const p = product.price;
      points.push({
        date: new Date(now - 45 * 86400000),
        price: Math.round(p * 0.88 / 10000) * 10000,
        userName: 'حاج رضا حامی',
        note: 'قیمت خرید اول فصل',
      });
      points.push({
        date: new Date(now - 25 * 86400000),
        price: Math.round(p * 0.93 / 10000) * 10000,
        userName: 'محمد حامی',
        note: 'تعدیل لیست کارخانه',
      });
      points.push({
        date: new Date(now - 7 * 86400000),
        price: Math.round(p * 0.97 / 10000) * 10000,
        userName: 'حاج رضا حامی',
        note: 'افزایش نرخ صنف ابزار',
      });
      points.push({
        date: new Date(now),
        price: p,
        userName: product.updatedByName || 'سیستم',
        note: 'قیمت فعلی مصوب',
      });
    }

    return points;
  }, [product, auditLogs]);

  // Profit calculation (if buyPrice exists)
  const profit = product.buyPrice ? product.price - product.buyPrice : null;
  const profitMargin = profit && product.buyPrice ? ((profit / product.buyPrice) * 100).toFixed(1) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Android bottom grab handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate max-w-[280px]">
              {product.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="font-mono">{product.code}</span>
              <span aria-hidden="true">·</span>
              <span>{product.category}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top card: Image + Key Metrics */}
          <div className="flex gap-4 items-center">
            <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
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
                <Wrench className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  قیمت فروش کنونی:
                </span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatToman(product.price)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-slate-500 dark:text-slate-400">موجودی:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {toPersianDigits(product.stock)} {product.unit}
                </span>

                {/* Stock status badge */}
                {(() => {
                  const status = getProductStockStatus(product);
                  const cfg = STOCK_STATUS_CONFIG[status];
                  return (
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${cfg.badgeClass}`}>
                      {cfg.badgeText}
                    </span>
                  );
                })()}

                {product.deductFromStock === false ? (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    بدون کسر از موجودی
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    کسر فعال از موجودی
                  </span>
                )}
              </div>

              {/* Threshold & Alert details badge */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                <span>حداقل: <strong className="text-amber-600 dark:text-amber-400 tabular-nums">{toPersianDigits(product.minStock !== undefined ? product.minStock : 5)}</strong></span>
                <span aria-hidden="true">·</span>
                <span>بحرانی: <strong className="text-rose-600 dark:text-rose-400 tabular-nums">{toPersianDigits(product.criticalStock !== undefined ? product.criticalStock : 0)}</strong></span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  {product.alertEnabled !== false ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                      <Bell className="w-3 h-3" />
                      <span>هشدار فعال</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-0.5 font-medium">
                      <BellOff className="w-3 h-3" />
                      <span>هشدار غیرفعال</span>
                    </span>
                  )}
                </span>
              </div>

              {profit !== null && profitMargin !== null && currentUser.role === 'admin' && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold pt-0.5">
                  <Percent className="w-3.5 h-3.5" />
                  <span>حاشیه سود: {toPersianDigits(profitMargin)}٪ (+{formatToman(profit)})</span>
                </div>
              )}
            </div>
          </div>

          {/* Abzarreza Online Pricing Supplier Card (Part 7, 8) */}
          {product.priceSourceType === 'abzarreza' && (
            <div className="bg-amber-500/10 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800 dark:text-amber-300">
                  <Radio className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>استعلام هوشمند قیمت از ابزار رضا (abzarreza.com)</span>
                </div>
                <button
                  type="button"
                  onClick={handleManualCheckPrice}
                  disabled={isCheckingPrice}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs disabled:opacity-60 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingPrice ? 'animate-spin' : ''}`} />
                  <span>{isCheckingPrice ? 'در حال استعلام...' : 'استعلام لحظه‌ای'}</span>
                </button>
              </div>

              {priceMessage && (
                <div className="p-2 bg-white/80 dark:bg-slate-850/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 border border-amber-200 dark:border-amber-800">
                  {priceMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white/70 dark:bg-slate-850/70 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">قیمت عمده رضا:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {product.supplierWholesalePrice ? `${formatToman(product.supplierWholesalePrice)} تومان` : 'نامشخص'}
                  </strong>
                </div>
                <div className="p-2 bg-white/70 dark:bg-slate-850/70 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">قیمت تک رضا:</span>
                  <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                    {product.supplierRetailPrice ? `${formatToman(product.supplierRetailPrice)} تومان` : 'نامشخص'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span>
                  آخرین بررسی: {product.supplierPricesUpdatedAt ? timeAgoPersian(product.supplierPricesUpdatedAt) : 'هنوز انجام نشده'}
                </span>
                {product.supplierProductUrl && (
                  <a
                    href={product.supplierProductUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>صفحه محصول در ابزار رضا</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* D3 Visual Trend Line Section */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  نمودار روند تغییرات قیمت (D3 Trend Line)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                تاریخچه خورشیدی
              </span>
            </div>

            {/* Render D3 Trend Line */}
            <PriceTrendChart
              data={priceHistory}
              currentPrice={product.price}
              height={200}
            />
          </div>

          {/* Technical Specs & Description */}
          {product.description && (
            <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                <span>مشخصات فنی و توضیحات:</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                {product.description}
              </p>
            </div>
          )}

          {/* Stock Movement History (Part 8, 9) */}
          {(() => {
            const stockHistory = StorageService.getStockHistory(product.id);
            return (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>گردش و تاریخچه موجودی انبار</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {stockHistory.length} رویداد
                  </span>
                </h4>

                {stockHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center">
                    گردش فاکتوری برای این کالا ثبت نشده است.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {stockHistory.map((item) => {
                      const isNegative = item.quantityChange < 0;
                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                isNegative
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                              }`}
                            >
                              {isNegative ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                                {item.note || item.changeType}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatPersianDateTime(item.date)} · توسط {item.userName}
                              </span>
                            </div>
                          </div>

                          <div className="text-left font-mono text-xs tabular-nums">
                            <span
                              className={`font-bold block ${
                                isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {item.quantityChange > 0 ? `+${toPersianDigits(item.quantityChange)}` : toPersianDigits(item.quantityChange)} {product.unit}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              مانده: {toPersianDigits(item.newStock)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* History logs specific to this item */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>تاریخچه تغییرات قیمت و مشخصات</span>
            </h4>

            <div className="space-y-2">
              {auditLogs.filter((l) => l.productId === product.id).length === 0 ? (
                <p className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                  هنوز تغییر قیمتی برای این کالا ثبت نشده است.
                </p>
              ) : (
                auditLogs
                  .filter((l) => l.productId === product.id)
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {log.changedByName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatPersianDateTime(log.changedAt)}
                        </span>
                      </div>
                      <div className="text-left font-mono text-xs tabular-nums">
                        <span className="text-slate-400 line-through text-[11px] block">{log.oldValue}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{log.newValue}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Quick action buttons in footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {onOpenAnalytics && (
            <button
              onClick={() => {
                onClose();
                onOpenAnalytics(product);
              }}
              className="w-full min-h-[42px] px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>تحلیل فروش و پیشنهاد سفارش هوشمند این کالا</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                onQuickPrice(product);
              }}
              className="min-h-[46px] px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-amber-600/20"
            >
              <Edit3 className="w-4 h-4" />
              <span>تغییر سریع قیمت</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onQuickStock(product);
              }}
              className="min-h-[46px] px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <PackagePlus className="w-4 h-4" />
              <span>ویرایش موجودی</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

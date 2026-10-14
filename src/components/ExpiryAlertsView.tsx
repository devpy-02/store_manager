import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Tag,
  Trash2,
  Percent,
  Calendar,
  Search,
  Package,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Product, StockBatch, User } from '../types';
import { StorageService } from '../services/storageService';
import { formatToman, toPersianDigits, formatPersianDateTime } from '../utils/jalali';
import { soundManager } from '../utils/audio';

interface Props {
  currentUser: User;
  products: Product[];
  onViewProduct?: (product: Product) => void;
}

export const ExpiryAlertsView: React.FC<Props> = ({ currentUser, products, onViewProduct }) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'expired' | 'critical' | 'warning' | 'healthy'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const storedBatches = StorageService.getStockBatches();
  // کالاهایی که تاریخ انقضا را مستقیم روی خودشان دارند (بدون بچ جدا) هم باید در هشدارها باشند
  const batchedProductIds = new Set(storedBatches.map((b) => b.productId));
  const productLevelBatches: StockBatch[] = products
    .filter(
      (p) =>
        !p.deleted &&
        p.hasExpiry !== false &&
        !!p.expiryDate &&
        p.stock > 0 &&
        !batchedProductIds.has(p.id)
    )
    .map((p) => ({
      id: `prod_${p.id}`,
      productId: p.id,
      productName: p.name,
      batchNumber: null,
      quantity: p.stock,
      remainingQuantity: p.stock,
      productionDate: p.productionDate ?? null,
      expiryDate: p.expiryDate as string,
      supplierName: null,
      receivedAt: p.updatedAt,
      receivedBy: p.updatedBy,
      receivedByName: p.updatedByName,
      buyPrice: p.buyPrice ?? 0,
      notes: null,
    }));
  const batches: StockBatch[] = [...storedBatches, ...productLevelBatches];
  const expirySettings = StorageService.getDefaultExpirySettings();
  const now = Date.now();

  // Evaluate batch statuses
  const evaluatedBatches = batches.map((batch) => {
    const product = products.find((p) => p.id === batch.productId);
    const warningDays = product?.expiryWarningDays ?? expirySettings.defaultExpiryWarningDays;
    const criticalDays = product?.expiryCriticalDays ?? expirySettings.defaultExpiryCriticalDays;

    const expiryTime = new Date(batch.expiryDate).getTime();
    const diffDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

    let status: 'expired' | 'critical' | 'warning' | 'healthy' = 'healthy';
    if (diffDays < 0) {
      status = 'expired';
    } else if (diffDays <= criticalDays) {
      status = 'critical';
    } else if (diffDays <= warningDays) {
      status = 'warning';
    }

    return {
      ...batch,
      diffDays,
      status,
      product,
    };
  });

  const filteredBatches = evaluatedBatches.filter((b) => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (searchQuery && !b.productName.includes(searchQuery) && !b.batchNumber?.includes(searchQuery)) return false;
    return true;
  });

  const counts = {
    expired: evaluatedBatches.filter((b) => b.status === 'expired').length,
    critical: evaluatedBatches.filter((b) => b.status === 'critical').length,
    warning: evaluatedBatches.filter((b) => b.status === 'warning').length,
    healthy: evaluatedBatches.filter((b) => b.status === 'healthy').length,
  };

  const handleRemoveBatch = (batchId: string) => {
    if (!window.confirm('آیا از حذف این مورد از لیست هشدار مطمئن هستید؟')) return;

    if (batchId.startsWith('prod_')) {
      // این یک کالای بدون بچ است: فقط تاریخ انقضای خود کالا پاک می‌شود، خود کالا حذف نمی‌شود
      const productId = batchId.slice('prod_'.length);
      const target = products.find((p) => p.id === productId);
      if (!target) return;
      const nowIso = new Date().toISOString();
      const updatedProducts = StorageService.getProducts().map((p) =>
        p.id === productId
          ? {
              ...p,
              expiryDate: undefined,
              hasExpiry: false,
              updatedAt: nowIso,
              updatedBy: currentUser.id,
              updatedByName: currentUser.name,
              version: (p.version || 1) + 1,
            }
          : p
      );
      StorageService.saveProducts(updatedProducts);
      StorageService.addToPendingSync({ type: 'product_save', id: productId, timestamp: nowIso });
      StorageService.addAuditLog({
        id: `log_${Date.now()}`,
        productId,
        productName: target.name,
        changeType: 'expiry_settings_update',
        oldValue: 'تاریخ انقضا ثبت شده',
        newValue: 'تاریخ انقضا حذف شد',
        changedBy: currentUser.id,
        changedByName: currentUser.name,
        changedAt: nowIso,
        synced: false,
      });
      soundManager.playSuccessSound();
      window.location.reload();
      return;
    }

    const remaining = StorageService.getStockBatches().filter((b) => b.id !== batchId);
    StorageService.saveStockBatches(remaining);
    StorageService.addToPendingSync({ type: 'batch_remove', id: batchId, timestamp: new Date().toISOString() });
    soundManager.playSuccessSound();
    window.location.reload();
  };

  const handleApplyDiscount = (batch: (typeof evaluatedBatches)[0]) => {
    if (!batch.product) return;
    const newPrice = Math.round(batch.product.price * 0.75 / 1000) * 1000;
    const updatedProducts = products.map((p) => (p.id === batch.product!.id ? { ...p, price: newPrice } : p));
    StorageService.saveProducts(updatedProducts);
    StorageService.addToPendingSync({ type: 'price_update', id: batch.product!.id, timestamp: new Date().toISOString() });
    StorageService.addAuditLog({
      id: `log_${Date.now()}`,
      productId: batch.product.id,
      productName: batch.product.name,
      changeType: 'price_update',
      oldValue: formatToman(batch.product.price),
      newValue: `${formatToman(newPrice)} (تخفیف فوری انقضا)`,
      changedBy: currentUser.id,
      changedByName: currentUser.name,
      changedAt: new Date().toISOString(),
      synced: true,
    });
    soundManager.playSuccessSound();
    alert(`تخفیف فوری ۲۵٪ روی «${batch.product.name}» اعمال شد.`);
    window.location.reload();
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-orange-600 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Clock className="w-6 h-6" />
            </span>
            <h2 className="text-lg font-extrabold">هشدارهای انقضا و مدیریت بچ‌ها</h2>
          </div>
          <p className="text-xs text-rose-100">
            بررسی و نظارت هوشمند تاریخ انقضای کالاهای انبار و جلوگیری از فساد کالاها
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="bg-white/10 px-3 py-2 rounded-xl text-center border border-white/20">
            <div className="text-lg font-bold">{toPersianDigits(counts.expired)}</div>
            <div className="text-[10px] text-rose-200">منقضی شده</div>
          </div>
          <div className="bg-white/10 px-3 py-2 rounded-xl text-center border border-white/20">
            <div className="text-lg font-bold">{toPersianDigits(counts.critical)}</div>
            <div className="text-[10px] text-amber-200">بحرانی</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              همه ({toPersianDigits(evaluatedBatches.length)})
            </button>
            <button
              onClick={() => setFilterStatus('expired')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                filterStatus === 'expired'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <span>🔴 منقضی</span>
              <span>({toPersianDigits(counts.expired)})</span>
            </button>
            <button
              onClick={() => setFilterStatus('critical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                filterStatus === 'critical'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <span>🔴 بحرانی</span>
              <span>({toPersianDigits(counts.critical)})</span>
            </button>
            <button
              onClick={() => setFilterStatus('warning')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                filterStatus === 'warning'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 hover:bg-orange-100'
              }`}
            >
              <span>🟠 نزدیک به انقضا</span>
              <span>({toPersianDigits(counts.warning)})</span>
            </button>
            <button
              onClick={() => setFilterStatus('healthy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                filterStatus === 'healthy'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <span>✅ سالم</span>
              <span>({toPersianDigits(counts.healthy)})</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی نام کالا یا شماره بچ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Batches List */}
      <div className="space-y-3">
        {filteredBatches.length === 0 ? (
          <div className="p-10 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">هیچ کالا یا بچی با این فیلتر یافت نشد</p>
            <p className="text-xs text-slate-400">تمام کالاهای انبار در وضعیت مطلوبی قرار دارند.</p>
          </div>
        ) : (
          filteredBatches.map((batch) => {
            const isExpired = batch.status === 'expired';
            const isCritical = batch.status === 'critical';
            const isWarning = batch.status === 'warning';

            return (
              <div
                key={batch.id}
                className={`p-4 rounded-2xl border transition-all bg-white dark:bg-slate-850 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isExpired
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/10'
                    : isCritical
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                    : isWarning
                    ? 'border-orange-200 dark:border-orange-900/40'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-bold text-lg ${
                      isExpired
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                        : isCritical
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                        : isWarning
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                    }`}
                  >
                    {isExpired ? '🔴' : isCritical ? '⚠️' : isWarning ? '🟠' : '✅'}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {batch.productName}
                      </h3>
                      {batch.batchNumber && (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono rounded-lg font-bold">
                          بچ: {batch.batchNumber}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          isExpired
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : isCritical
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : isWarning
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {isExpired
                          ? `منقضی شده (${toPersianDigits(Math.abs(batch.diffDays))} روز پیش)`
                          : isCritical
                          ? `هشدار بحرانی: فقط ${toPersianDigits(batch.diffDays)} روز تا انقضا`
                          : isWarning
                          ? `نزدیک به انقضا: ${toPersianDigits(batch.diffDays)} روز تا انقضا`
                          : `سالم (${toPersianDigits(batch.diffDays)} روز تا انقضا)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>موجودی بچ: <strong className="text-slate-800 dark:text-slate-200">{toPersianDigits(batch.remainingQuantity)}</strong> عدد</span>
                      <span>تأمین‌کننده: {batch.supplierName || '---'}</span>
                      <span>مکان: {batch.locationId ? StorageService.getLocationPath(batch.locationId) : 'مکان اصلی'}</span>
                      <span>تاریخ انقضا: <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatPersianDateTime(batch.expiryDate).split(' - ')[0]}</strong></span>
                    </div>

                    {batch.notes && (
                      <p className="text-[11px] text-slate-400 italic">توضیحات: {batch.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {isExpired && (
                    <button
                      onClick={() => handleRemoveBatch(batch.id)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف از انبار</span>
                    </button>
                  )}
                  {(isCritical || isWarning) && (
                    <button
                      onClick={() => handleApplyDiscount(batch)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>تخفیف فوری</span>
                    </button>
                  )}
                  {batch.product && onViewProduct && (
                    <button
                      onClick={() => onViewProduct(batch.product!)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>مشاهده کالا</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

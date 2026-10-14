import React, { useState } from 'react';
import {
  PackageCheck,
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  FileText,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Plus,
  BarChart3,
  CheckCircle,
  Clock,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  TrendingUp,
  DollarSign,
  Percent,
} from 'lucide-react';
import { StockMovement, StockMovementType, User, Product } from '../types';
import { StorageService } from '../services/storageService';
import { formatPersianDateTime, formatToman, toPersianDigits } from '../utils/jalali';

interface Props {
  currentUser: User;
  products: Product[];
  onViewInvoice?: (invoiceId: string) => void;
}

export const WarehouseManagementView: React.FC<Props> = ({ currentUser, products, onViewInvoice }) => {
  const [activeSubTab, setActiveSubTab] = useState<'movements' | 'stocktakes' | 'damages_returns' | 'valuation' | 'dead_stock'>('movements');

  // Movements state
  const [movementsFilterType, setMovementsFilterType] = useState<string>('all');
  const [movementsProductId, setMovementsProductId] = useState<string>('all');
  const [movementsUserId, setMovementsUserId] = useState<string>('all');
  const [movementsSearch, setMovementsSearch] = useState('');

  // Stocktakes state
  const [stocktakes, setStocktakes] = useState(() => StorageService.getStocktakes());
  const [activeStocktakeId, setActiveStocktakeId] = useState<string | null>(null);
  const [isCreatingStocktake, setIsCreatingStocktake] = useState(false);
  const [newStocktakeTitle, setNewStocktakeTitle] = useState('شمارش ماهانه آبان');
  const [newStocktakeCategory, setNewStocktakeCategory] = useState<string>('all');
  const [newStocktakeLocation, setNewStocktakeLocation] = useState<string>('');
  const [newStocktakeNotes, setNewStocktakeNotes] = useState('');

  // Damages & Returns state
  const [dmgTab, setDmgTab] = useState<'damages' | 'returns_customer' | 'returns_supplier'>('damages');
  const [damages, setDamages] = useState(() => StorageService.getDamages());
  const [customerReturns, setCustomerReturns] = useState(() => StorageService.getCustomerReturns());
  const [supplierReturns, setSupplierReturns] = useState(() => StorageService.getSupplierReturns());
  const [isDamageFormOpen, setIsDamageFormOpen] = useState(false);
  const [damageProductId, setDamageProductId] = useState(products[0]?.id || '');
  const [damageQty, setDamageQty] = useState(1);
  const [damageReason, setDamageReason] = useState<'breakage' | 'expired' | 'defective' | 'lost' | 'theft' | 'other'>('breakage');
  const [damageLocation, setDamageLocation] = useState<string>('');
  const [damageNote, setDamageNote] = useState('');

  // Valuation state
  const [valuationPriceBasis, setValuationPriceBasis] = useState<'buy' | 'sell'>('buy');

  // Dead stock filter
  const [deadStockDays, setDeadStockDays] = useState(30);

  const movements = StorageService.getStockMovements();

  const getMovementIcon = (type: StockMovementType) => {
    switch (type) {
      case 'purchase': return '📥';
      case 'sale': return '📤';
      case 'retail_sale': return '🛒';
      case 'return_from_customer': return '↩️';
      case 'return_to_supplier': return '↪️';
      case 'damage': return '⚠️';
      case 'adjustment': return '✏️';
      case 'stocktake': return '📊';
      case 'initial': return '🌱';
      default: return '📦';
    }
  };

  const getMovementLabel = (type: StockMovementType) => {
    switch (type) {
      case 'purchase': return 'ورود - خرید';
      case 'sale': return 'خروج - فروش';
      case 'retail_sale': return 'خروج - خرده‌فروشی';
      case 'return_from_customer': return 'مرجوعی از مشتری';
      case 'return_to_supplier': return 'مرجوعی به تأمین‌کننده';
      case 'damage': return 'ضایعات انبار';
      case 'adjustment': return 'تعدیل موجودی';
      case 'stocktake': return 'شمارش انبارگردانی';
      case 'initial': return 'موجودی اولیه';
      default: return type;
    }
  };

  const filteredMovements = movements.filter((m: StockMovement) => {
    if (movementsFilterType !== 'all' && m.movementType !== movementsFilterType) return false;
    if (movementsProductId !== 'all' && m.productId !== movementsProductId) return false;
    if (movementsUserId !== 'all' && m.performedBy !== movementsUserId) return false;
    if (movementsSearch && !m.productName.includes(movementsSearch) && !m.referenceNumber?.includes(movementsSearch) && !m.reason?.includes(movementsSearch)) return false;
    return true;
  });

  const handleStartStocktake = (e: React.FormEvent) => {
    e.preventDefault();
    const res = StorageService.createStocktake(
      {
        title: newStocktakeTitle,
        filterCategory: newStocktakeCategory !== 'all' ? newStocktakeCategory : null,
        locationId: newStocktakeLocation || null,
        notes: newStocktakeNotes,
      },
      currentUser
    );
    setStocktakes(StorageService.getStocktakes());
    setActiveStocktakeId(res.stocktake.id);
    setIsCreatingStocktake(false);
  };

  const handleRecordDamage = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      StorageService.recordDamage(
        {
          productId: damageProductId,
          quantity: Number(damageQty),
          reason: damageReason,
          reasonNote: damageNote,
          locationId: damageLocation || null,
        },
        currentUser
      );
      setDamages(StorageService.getDamages());
      setIsDamageFormOpen(false);
      setDamageNote('');
      setDamageQty(1);
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت ضایعات');
    }
  };

  // Valuation calculations
  const totalInventoryValue = products.reduce((sum, p) => {
    const price = valuationPriceBasis === 'buy' ? (p.buyPrice || p.price * 0.8) : p.price;
    return sum + p.stock * price;
  }, 0);

  const categoryValues = products.reduce((acc: Record<string, { value: number; count: number }>, p) => {
    const cat = p.category || 'متفرقه';
    const price = valuationPriceBasis === 'buy' ? (p.buyPrice || p.price * 0.8) : p.price;
    if (!acc[cat]) acc[cat] = { value: 0, count: 0 };
    acc[cat].value += p.stock * price;
    acc[cat].count += p.stock;
    return acc;
  }, {});

  // Dead stock calculation (simulated based on stock & movements)
  const deadStockProducts = products.filter((p) => {
    const prodMovements = movements.filter((m: StockMovement) => m.productId === p.id);
    if (prodMovements.length === 0) return p.stock > 0;
    const lastMov = prodMovements[0];
    const diffDays = Math.floor((Date.now() - new Date(lastMov.performedAt).getTime()) / 86400000);
    return diffDays >= deadStockDays && p.stock > 0;
  });

  const deadStockTotalValue = deadStockProducts.reduce((sum, p) => sum + p.stock * (p.buyPrice || p.price * 0.8), 0);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header & Submenu Navigation */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                مدیریت جامع انبارداری و لجستیک
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                تاریخچه حرکات، انبارگردانی، ضایعات، مرجوعی و گزارش ارزش انبار
              </p>
            </div>
          </div>
        </div>

        {/* Submenu Tabs */}
        <div className="flex overflow-x-auto gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveSubTab('movements')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'movements'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>📋 حرکات انبار</span>
          </button>

          <button
            onClick={() => setActiveSubTab('stocktakes')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'stocktakes'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>📊 شمارش انبار</span>
          </button>

          <button
            onClick={() => setActiveSubTab('damages_returns')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'damages_returns'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>⚠️ ضایعات و مرجوعی</span>
          </button>

          <button
            onClick={() => setActiveSubTab('valuation')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'valuation'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>💰 ارزش انبار</span>
          </button>

          <button
            onClick={() => setActiveSubTab('dead_stock')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'dead_stock'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>🐌 کالاهای راکد</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. STOCK MOVEMENT HISTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'movements' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>فیلترهای پیشرفته حرکات انبار:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">نوع حرکت:</label>
                <select
                  value={movementsFilterType}
                  onChange={(e) => setMovementsFilterType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="all">همه انواع (All)</option>
                  <option value="purchase">📥 ورود - خرید</option>
                  <option value="sale">📤 خروج - فروش</option>
                  <option value="retail_sale">🛒 خرده‌فروشی</option>
                  <option value="return_from_customer">↩️ مرجوعی از مشتری</option>
                  <option value="return_to_supplier">↪️ مرجوعی به تأمین‌کننده</option>
                  <option value="damage">⚠️ ضایعات</option>
                  <option value="adjustment">✏️ تعدیل</option>
                  <option value="stocktake">📊 شمارش انبار</option>
                  <option value="initial">🌱 موجودی اولیه</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">کالا:</label>
                <select
                  value={movementsProductId}
                  onChange={(e) => setMovementsProductId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="all">همه کالاها</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">جستجو در سند یا دلیل:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={movementsSearch}
                    onChange={(e) => setMovementsSearch(e.target.value)}
                    placeholder="شماره فاکتور، توضیحات..."
                    className="w-full pl-3 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2" />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setMovementsFilterType('all');
                    setMovementsProductId('all');
                    setMovementsSearch('');
                  }}
                  className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  پاک کردن فیلترها
                </button>
              </div>
            </div>
          </div>

          {/* Movements List */}
          <div className="space-y-2">
            {filteredMovements.length === 0 ? (
              <div className="p-8 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                هیچ رویداد یا حرکتی با این فیلترها یافت نشد.
              </div>
            ) : (
              filteredMovements.map((mov: StockMovement) => {
                const isPositive = mov.quantityChange > 0;
                return (
                  <div
                    key={mov.id}
                    className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${
                        isPositive ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                      }`}>
                        {getMovementIcon(mov.movementType)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">
                            {getMovementLabel(mov.movementType)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatPersianDateTime(mov.performedAt)}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          {mov.productName}
                        </div>

                        {mov.reason && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            {mov.reason}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>توسط: <strong className="text-slate-700 dark:text-slate-300">{mov.performedByName}</strong></span>
                          {mov.referenceNumber && (
                            <>
                              <span>·</span>
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                سند: {mov.referenceNumber}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-left flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <div className="font-mono text-xs font-bold tabular-nums">
                        <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {mov.quantityChange > 0 ? `+${toPersianDigits(mov.quantityChange)}` : toPersianDigits(mov.quantityChange)}
                        </span>
                        <span className="text-slate-400 font-normal mr-1">
                          ({toPersianDigits(mov.quantityBefore)} → {toPersianDigits(mov.quantityAfter)})
                        </span>
                      </div>
                      {mov.totalValue ? (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          ارزش: {formatToman(mov.totalValue)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STOCKTAKING (شمارش انبار) */}
      {/* ========================================================================= */}
      {activeSubTab === 'stocktakes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              لیست جلسات انبارگردانی و شمارش انبار
            </h3>
            <button
              onClick={() => setIsCreatingStocktake(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>شمارش جدید</span>
            </button>
          </div>

          {/* New Stocktake Modal / Form Dialog */}
          {isCreatingStocktake && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl w-full max-w-md space-y-4 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">شمارش جدید انبار</h4>
                  <button onClick={() => setIsCreatingStocktake(false)} className="text-slate-400 hover:text-slate-700">✕</button>
                </div>

                <form onSubmit={handleStartStocktake} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان شمارش:</label>
                    <input
                      type="text"
                      value={newStocktakeTitle}
                      onChange={(e) => setNewStocktakeTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">مکان شمارش:</label>
                    <select
                      value={newStocktakeLocation}
                      onChange={(e) => setNewStocktakeLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                    >
                      <option value="">کل انبار (همه‌ی مکان‌ها)</option>
                      {StorageService.getLocationOptions().map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">محدوده شمارش (دسته‌بندی):</label>
                    <select
                      value={newStocktakeCategory}
                      onChange={(e) => setNewStocktakeCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                    >
                      <option value="all">همه کالاها</option>
                      {Array.from(new Set(products.map((p) => p.category))).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">یادداشت / توضیحات:</label>
                    <textarea
                      rows={2}
                      value={newStocktakeNotes}
                      onChange={(e) => setNewStocktakeNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                      placeholder="توضیحات انبارگردانی..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingStocktake(false)}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                    >
                      لغو
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-amber-500"
                    >
                      شروع شمارش
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Active / Past Stocktakes list */}
          <div className="space-y-2.5">
            {stocktakes.map((st) => {
              const isInProgress = st.status === 'in_progress';
              return (
                <div
                  key={st.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isInProgress
                      ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isInProgress ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {isInProgress ? '🟡 در حال انجام' : '✅ تکمیل شده'}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {st.stocktakeNumber}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                          {st.title}
                        </h4>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        شروع: {formatPersianDateTime(st.startDate)} · ایجاد توسط {st.createdByName}
                      </p>

                      {!isInProgress && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium pt-0.5">
                          مغایرت: <strong className="text-rose-600">{toPersianDigits(st.totalDifferences)} کالا</strong> | ارزش مغایرت: <strong className="text-rose-600">{formatToman(st.totalDifferenceValue)}</strong>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isInProgress ? (
                        <>
                          <button
                            onClick={() => setActiveStocktakeId(st.id)}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs"
                          >
                            ادامه شمارش
                          </button>
                          <button
                            onClick={() => {
                              StorageService.cancelStocktake(st.id, currentUser);
                              setStocktakes(StorageService.getStocktakes());
                            }}
                            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-100"
                          >
                            لغو
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setActiveStocktakeId(st.id)}
                          className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                        >
                          مشاهده گزارش
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Counting Session Drawer / Modal */}
          {activeStocktakeId && (() => {
            const currentSt = stocktakes.find((s) => s.id === activeStocktakeId);
            if (!currentSt) return null;
            const stItems = StorageService.getStocktakeItems(currentSt.id);

            return (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6">
                <div className="bg-white dark:bg-slate-850 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200 overflow-hidden">
                  {/* Modal Header */}
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                    <div>
                      <h3 className="text-sm font-extrabold flex items-center gap-2">
                        <span>جلسه شمارش: {currentSt.title}</span>
                        <span className="text-xs font-mono bg-amber-500 text-slate-900 px-2 py-0.5 rounded-md font-bold">{currentSt.stocktakeNumber}</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        پیشرفت: {toPersianDigits(stItems.length)} کالا · وضعیت: {currentSt.status === 'in_progress' ? 'در حال شمارش' : 'تکمیل شده'}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveStocktakeId(null)}
                      className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-700"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Counting items list */}
                  <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                    {stItems.map((item) => {
                      const hasDiff = item.difference !== 0;
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            hasDiff
                              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                {item.productCode}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {item.productName}
                              </h5>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              موجودی سیستم: <strong className="text-slate-700 dark:text-slate-300">{toPersianDigits(item.systemQuantity)}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-500">شمارش واقعی:</span>
                              <input
                                type="number"
                                disabled={currentSt.status !== 'in_progress'}
                                value={item.countedQuantity}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  StorageService.updateStocktakeItem(currentSt.id, item.id, val, undefined, undefined, currentUser);
                                  setStocktakes(StorageService.getStocktakes());
                                }}
                                className="w-20 px-2 py-1 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-center tabular-nums"
                              />
                            </div>

                            {hasDiff && (
                              <div className="text-xs font-bold text-rose-600 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>({toPersianDigits(item.difference)})</span>
                              </div>
                            )}

                            {hasDiff && currentSt.status === 'in_progress' && (
                              <select
                                value={item.reason || 'شکستگی'}
                                onChange={(e) => {
                                  StorageService.updateStocktakeItem(currentSt.id, item.id, item.countedQuantity, e.target.value, undefined, currentUser);
                                  setStocktakes(StorageService.getStocktakes());
                                }}
                                className="px-2 py-1 bg-white dark:bg-slate-850 border border-rose-300 rounded-lg text-[11px]"
                              >
                                <option value="شکستگی">شکستگی</option>
                                <option value="خطای انسانی">خطای انسانی</option>
                                <option value="سرقت/فقدان">سرقت یا فقدان</option>
                                <option value="سایر">سایر</option>
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Modal Footer (Complete / Close) */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      مجموع مغایرت‌ها: <strong className="text-rose-600">{toPersianDigits(currentSt.totalDifferences)} کالا</strong>
                    </div>

                    {currentSt.status === 'in_progress' ? (
                      <button
                        onClick={() => {
                          try {
                            StorageService.completeStocktake(currentSt.id, currentUser);
                            setStocktakes(StorageService.getStocktakes());
                            setActiveStocktakeId(null);
                            alert('شمارش انبار با موفقیت تکمیل و موجودی کالاها تطبیق داده شد.');
                          } catch (err: any) {
                            alert(err.message || 'خطا در تکمیل شمارش');
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>تأیید و ثبت نهایی مغایرت‌ها</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveStocktakeId(null)}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
                      >
                        بستن گزارش
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DAMAGES & RETURNS (ضایعات و مرجوعی) */}
      {/* ========================================================================= */}
      {activeSubTab === 'damages_returns' && (
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setDmgTab('damages')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                dmgTab === 'damages' ? 'bg-white dark:bg-slate-850 text-amber-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              ⚠️ ضایعات ({toPersianDigits(damages.length)})
            </button>
            <button
              onClick={() => setDmgTab('returns_customer')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                dmgTab === 'returns_customer' ? 'bg-white dark:bg-slate-850 text-amber-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              ↩️ مرجوعی از مشتری ({toPersianDigits(customerReturns.length)})
            </button>
            <button
              onClick={() => setDmgTab('returns_supplier')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                dmgTab === 'returns_supplier' ? 'bg-white dark:bg-slate-850 text-amber-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              ↪️ مرجوعی به تأمین‌کننده ({toPersianDigits(supplierReturns.length)})
            </button>
          </div>

          {/* TAB 1: DAMAGES */}
          {dmgTab === 'damages' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">ثبت کالاهای آسیب‌دیده، منقضی یا مفقود شده انبار</span>
                <button
                  onClick={() => setIsDamageFormOpen(true)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت ضایعات جدید</span>
                </button>
              </div>

              {/* Damage Form Modal */}
              {isDamageFormOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl w-full max-w-md space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">ثبت ضایعات انبار</h4>
                      <button onClick={() => setIsDamageFormOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
                    </div>

                    <form onSubmit={handleRecordDamage} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">انتخاب کالا:</label>
                        <select
                          value={damageProductId}
                          onChange={(e) => setDamageProductId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (موجودی: {p.stock})</option>
                          ))}
                        </select>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 mt-2">کسر از مکان:</label>
                        <select
                          value={damageLocation}
                          onChange={(e) => setDamageLocation(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                        >
                          <option value="">مکان اصلی</option>
                          {StorageService.getLocationOptions().map((o) => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تعداد:</label>
                        <input
                          type="number"
                          min="1"
                          value={damageQty}
                          onChange={(e) => setDamageQty(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">دلیل ضایعات:</label>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {[
                            { id: 'breakage', label: 'شکستگی' },
                            { id: 'expired', label: 'منقضی' },
                            { id: 'defective', label: 'معیوب' },
                            { id: 'lost', label: 'گم شده' },
                            { id: 'theft', label: 'سرقت' },
                            { id: 'other', label: 'سایر' },
                          ].map((r) => (
                            <label key={r.id} className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border cursor-pointer">
                              <input
                                type="radio"
                                name="dmgReason"
                                checked={damageReason === r.id}
                                onChange={() => setDamageReason(r.id as any)}
                              />
                              <span>{r.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">توضیحات تکمیلی:</label>
                        <textarea
                          rows={2}
                          value={damageNote}
                          onChange={(e) => setDamageNote(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                          placeholder="شرح علت ضایعات..."
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsDamageFormOpen(false)}
                          className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold"
                        >
                          لغو
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs"
                        >
                          ثبت و کسر از انبار
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Damages List */}
              <div className="space-y-2">
                {damages.map((dmg) => (
                  <div key={dmg.id} className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-600">{dmg.damageNumber}</span>
                        <h5 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{dmg.productName}</h5>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        دلیل: <strong className="text-slate-700 dark:text-slate-300">{dmg.reason}</strong> · {dmg.reasonNote || ''}
                      </p>
                      <span className="text-[10px] text-slate-400">ثبت توسط {dmg.reportedByName} در {formatPersianDateTime(dmg.reportedAt)}</span>
                    </div>

                    <div className="text-left font-mono text-xs">
                      <div className="font-bold text-rose-600">-{toPersianDigits(dmg.quantity)} عدد</div>
                      <div className="text-slate-500 text-[11px]">{formatToman(dmg.totalValue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: RETURNS FROM CUSTOMER */}
          {dmgTab === 'returns_customer' && (
            <div className="space-y-2">
              {customerReturns.map((ret) => (
                <div key={ret.id} className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-600">{ret.returnNumber}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">مشتری: {ret.customerName}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{formatToman(ret.totalRefund)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {ret.reasonNote || ret.reason} · تاریخ: {formatPersianDateTime(ret.reportedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: RETURNS TO SUPPLIER */}
          {dmgTab === 'returns_supplier' && (
            <div className="space-y-2">
              {supplierReturns.map((sret) => (
                <div key={sret.id} className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-600">{sret.returnNumber}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">تأمین‌کننده: {sret.supplierName}</span>
                    </div>
                    <span className="text-xs font-bold text-blue-600">{formatToman(sret.expectedRefund)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {sret.reasonNote || sret.reason} · تاریخ: {formatPersianDateTime(sret.reportedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. INVENTORY VALUE REPORT (ارزش انبار) */}
      {/* ========================================================================= */}
      {activeSubTab === 'valuation' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-5 rounded-2xl shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-100">کل ارزش انبار فروشگاه</span>
              <div className="flex bg-black/20 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setValuationPriceBasis('buy')}
                  className={`px-3 py-1 rounded-lg transition-all ${valuationPriceBasis === 'buy' ? 'bg-white text-amber-900 shadow-xs' : 'text-white'}`}
                >
                  بر اساس قیمت خرید
                </button>
                <button
                  onClick={() => setValuationPriceBasis('sell')}
                  className={`px-3 py-1 rounded-lg transition-all ${valuationPriceBasis === 'sell' ? 'bg-white text-amber-900 shadow-xs' : 'text-white'}`}
                >
                  بر اساس قیمت فروش
                </button>
              </div>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
              {formatToman(totalInventoryValue)}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>ارزش انبار به تفکیک دسته‌بندی:</span>
            </h3>

            <div className="space-y-2.5">
              {Object.entries(categoryValues).map(([catName, data]) => {
                const percent = totalInventoryValue > 0 ? Math.round((data.value / totalInventoryValue) * 100) : 0;
                return (
                  <div key={catName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>• {catName} ({toPersianDigits(data.count)} واحد)</span>
                      <span>{formatToman(data.value)} ({toPersianDigits(percent)}٪)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DEAD STOCK REPORT (کالاهای راکد) */}
      {/* ========================================================================= */}
      {activeSubTab === 'dead_stock' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">کالاهایی که در</span>
                <select
                  value={deadStockDays}
                  onChange={(e) => setDeadStockDays(Number(e.target.value))}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-amber-600"
                >
                  <option value={15}>۱۵ روز</option>
                  <option value={30}>۳۰ روز</option>
                  <option value={45}>۴۵ روز</option>
                  <option value={60}>۶۰ روز</option>
                </select>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">اخیر فروش نرفته‌اند:</span>
              </div>

              <div className="text-xs font-bold text-rose-600">
                {toPersianDigits(deadStockProducts.length)} کالای راکد · ارزش کل: {formatToman(deadStockTotalValue)}
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {deadStockProducts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  هیچ کالای راکدی در این بازه زمانی یافت نشد.
                </div>
              ) : (
                deadStockProducts.map((p) => {
                  const val = p.stock * (p.buyPrice || p.price * 0.8);
                  return (
                    <div key={p.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                            {p.code}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{p.name}</h5>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          موجودی: <strong className="text-slate-700 dark:text-slate-300">{toPersianDigits(p.stock)} {p.unit}</strong> · ارزش: {formatToman(val)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-bold">
                          پیشنهاد: تخفیف ۱۵٪ جهت فروش فوری
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

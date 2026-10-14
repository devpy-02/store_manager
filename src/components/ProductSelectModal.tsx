import React, { useState, useMemo } from 'react';
import { Product, InvoiceType } from '../types';
import { formatToman, toPersianDigits } from '../utils/jalali';
import { getProductStockStatus, STOCK_STATUS_CONFIG } from '../utils/stockAlertUtils';
import { Search, X, Package, Check, AlertTriangle, EyeOff } from 'lucide-react';

interface Props {
  products: Product[];
  invoiceType: InvoiceType;
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductSelectModal: React.FC<Props> = ({
  products,
  invoiceType,
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const isBuying = invoiceType === 'purchase' || invoiceType === 'purchase_return';

  const filteredProducts = useMemo(() => {
    const activeProducts = products.filter((p) => !p.deleted);
    if (!searchQuery.trim()) return activeProducts;
    const q = searchQuery.toLowerCase().trim();
    return activeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Grab handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              انتخاب محصول و افزودن به فاکتور
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              جستجو در میان کالاهای موجود در انبار ابزار حامی
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام ابزار، کد یا دسته‌بندی..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400">
            ▼ پیشنهادات زنده:
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              کالایی با این نام یا کد یافت نشد.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const displayPrice = isBuying ? p.buyPrice || p.price : p.price;
              const isOutOfStock = p.stock <= 0 && !isBuying;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-right flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 transition-colors">
                        {p.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                          {p.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          موجودی: {toPersianDigits(p.stock)} {p.unit}
                        </span>
                        {(() => {
                          const status = getProductStockStatus(p);
                          const cfg = STOCK_STATUS_CONFIG[status];
                          return (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${cfg.badgeClass}`}>
                              {cfg.badgeText}
                            </span>
                          );
                        })()}
                        {p.deductFromStock === false && (
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                            <span>بدون کسر</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-[10px] text-slate-400 block">
                      {isBuying ? 'قیمت خرید:' : 'قیمت فروش:'}
                    </span>
                    <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatToman(displayPrice)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

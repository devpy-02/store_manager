import React, { useMemo, useState } from 'react';
import { FolderTree, ArrowLeftRight, ShoppingCart } from 'lucide-react';
import { Product } from '../types';
import { StorageService, DEFAULT_LOCATION_ID } from '../services/storageService';
import { toPersianDigits, formatToman } from '../utils/jalali';

interface Props {
  products: Product[];
}

const costOf = (p: Product) => p.buyPrice || Math.round(p.price * 0.8);

// گزارش مکان‌ها: موجودی و ارزش هر مکان، تاریخچه‌ی هر مکان، انتقال‌ها، و پیشنهاد خرید
export const LocationReportView: React.FC<Props> = ({ products }) => {
  const active = useMemo(() => products.filter((p) => !p.deleted), [products]);
  const options = StorageService.getLocationOptions();
  const [selected, setSelected] = useState<string>(DEFAULT_LOCATION_ID);
  const selectedPath = StorageService.getLocationPath(selected);

  // خلاصه‌ی هر مکان
  const summary = options.map((o) => {
    const items = active.filter((p) => (p.locationStock?.[o.id] ?? 0) > 0);
    const qty = items.reduce((s, p) => s + (p.locationStock?.[o.id] ?? 0), 0);
    const value = items.reduce((s, p) => s + (p.locationStock?.[o.id] ?? 0) * costOf(p), 0);
    return { id: o.id, label: o.label, count: items.length, qty, value };
  });

  // کالاهای مکان انتخاب‌شده
  const selectedItems = active
    .filter((p) => (p.locationStock?.[selected] ?? 0) > 0)
    .map((p) => ({ product: p, qty: p.locationStock?.[selected] ?? 0 }))
    .sort((a, b) => a.product.name.localeCompare(b.product.name, 'fa'));

  // پیشنهاد خرید: کالاهایی که به حداقل رسیده‌اند
  const suggestions = active
    .filter((p) => (p.minStock ?? 0) > 0 && p.stock <= (p.minStock ?? 0))
    .map((p) => ({ product: p, suggested: Math.max(0, (p.maxStock || (p.minStock ?? 0) * 2) - p.stock) }))
    .filter((x) => x.suggested > 0);

  // تاریخچه‌ی حرکات و انتقال‌های مکان انتخاب‌شده
  const movements = useMemo(() => {
    const all = StorageService.getStockMovements();
    return all
      .filter((m) => m.locationId === selected || (m.movementType === 'transfer' && m.reason?.includes(selectedPath)))
      .slice(0, 40);
  }, [selected, selectedPath]);

  const box = 'bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3';
  const title = 'font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2';

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 p-2 rounded-xl">
            <FolderTree className="w-6 h-6" />
          </span>
          <h2 className="text-lg font-extrabold">گزارش مکان‌های انبار</h2>
        </div>
      </div>

      {/* خلاصه‌ی مکان‌ها */}
      <div className={box}>
        <h3 className={title}>موجودی و ارزش هر مکان</h3>
        <div className="space-y-1.5">
          {summary.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s.id)}
              className={`w-full text-right p-2.5 rounded-xl border text-xs ${
                selected === s.id
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="font-bold text-slate-800 dark:text-slate-100">{s.label}</div>
              <div className="text-slate-500 mt-0.5">
                {toPersianDigits(s.count)} قلم · {toPersianDigits(s.qty)} عدد · ارزش خرید {formatToman(s.value)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* کالاهای مکان انتخاب‌شده */}
      <div className={box}>
        <h3 className={title}>کالاهای «{selectedPath}»</h3>
        {selectedItems.length === 0 ? (
          <p className="text-xs text-slate-500">کالایی در این مکان نیست.</p>
        ) : (
          <div className="space-y-1">
            {selectedItems.map(({ product, qty }) => (
              <div key={product.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="truncate">
                  {product.name} <span className="text-slate-400 font-mono">({product.code})</span>
                </span>
                <span className="font-bold shrink-0 mr-2">
                  {toPersianDigits(qty)} {product.unit} · {formatToman(qty * costOf(product))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* پیشنهاد خرید */}
      <div className={box}>
        <h3 className={title}>
          <ShoppingCart className="w-4 h-4 text-amber-600" />
          پیشنهاد خرید
        </h3>
        {suggestions.length === 0 ? (
          <p className="text-xs text-slate-500">همه‌ی کالاها بالاتر از حداقل موجودی هستند.</p>
        ) : (
          <div className="space-y-1">
            {suggestions.map(({ product, suggested }) => (
              <div key={product.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <span className="truncate">{product.name}</span>
                <span className="shrink-0 mr-2">
                  موجودی {toPersianDigits(product.stock)} · خرید پیشنهادی{' '}
                  <strong>{toPersianDigits(suggested)} {product.unit}</strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* تاریخچه و انتقال‌های مکان */}
      <div className={box}>
        <h3 className={title}>
          <ArrowLeftRight className="w-4 h-4 text-amber-600" />
          تاریخچه‌ی «{selectedPath}»
        </h3>
        {movements.length === 0 ? (
          <p className="text-xs text-slate-500">حرکتی برای این مکان ثبت نشده است.</p>
        ) : (
          <div className="space-y-1">
            {movements.map((m) => (
              <div key={m.id} className="text-[11px] p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex justify-between gap-2">
                  <span className="font-bold truncate">{m.productName}</span>
                  <span className="text-slate-400 shrink-0">{new Date(m.performedAt).toLocaleDateString('fa-IR')}</span>
                </div>
                <div className="text-slate-500">
                  {m.movementType === 'transfer' ? 'انتقال' : m.movementType} · {m.reason || '—'}
                  {m.quantityChange !== 0 && (
                    <span className="mr-1 font-bold">({m.quantityChange > 0 ? '+' : ''}{toPersianDigits(m.quantityChange)})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useMemo, useRef, useState } from 'react';
import { Truck, Save, CheckCircle2, AlertTriangle, ArrowLeftRight, FolderTree } from 'lucide-react';
import { Product, User } from '../types';
import { StorageService, DEFAULT_LOCATION_ID } from '../services/storageService';
import { soundManager } from '../utils/audio';
import { LocationsManager } from './LocationsManager';
import { ProductPicker } from './ProductPicker';
import { BuyPriceConflictModal, ConflictRow } from './BuyPriceConflictModal';
import { toEnglishDigits, toPersianDigits, formatToman } from '../utils/jalali';

interface Props {
  currentUser: User;
  products: Product[];
  onSaved: () => void;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';
const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';
const normalize = (v: string) => toEnglishDigits(v).replace(/,/g, '').trim();

export const GoodsReceiptView: React.FC<Props> = ({ currentUser, products, onSaved }) => {
  const activeProducts = useMemo(
    () => products.filter((p) => !p.deleted).sort((a, b) => a.name.localeCompare(b.name, 'fa')),
    [products]
  );
  const locationOptions = StorageService.getLocationOptions();

  // ----- ورود کالا -----
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryInput, setExpiryInput] = useState('');
  const [notes, setNotes] = useState('');
  const [targetLocation, setTargetLocation] = useState(DEFAULT_LOCATION_ID);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLocations, setShowLocations] = useState(false);
  const [conflictRows, setConflictRows] = useState<ConflictRow[] | null>(null);
  const receiptDecided = useRef(false);
  const receiptApply = useRef(false);
  const [useCarton, setUseCarton] = useState(false);

  // ----- انتقال -----
  const [tProductId, setTProductId] = useState('');
  const [tFrom, setTFrom] = useState('');
  const [tTo, setTTo] = useState('');
  const [tQty, setTQty] = useState('');
  const [tMsg, setTMsg] = useState('');
  const [tError, setTError] = useState('');

  const selected = activeProducts.find((p) => p.id === productId);
  const tProduct = activeProducts.find((p) => p.id === tProductId);
  const tFromOptions = tProduct
    ? Object.entries<number>(tProduct.locationStock || {}).filter(([, q]) => q > 0)
    : [];

  const handleSelectProduct = (id: string) => {
    setProductId(id);
    const prod = activeProducts.find((p) => p.id === id);
    setBuyPrice(prod?.buyPrice ? String(prod.buyPrice) : '');
    setError('');
    setSuccess('');
  };

  const resetReceipt = () => {
    setProductId('');
    setQuantity('');
    setBuyPrice('');
    setSupplierName('');
    setBatchNumber('');
    setExpiryInput('');
    setNotes('');
    setTargetLocation(DEFAULT_LOCATION_ID);
    setUseCarton(false);
  };

  const handleReceipt = () => {
    setError('');
    setSuccess('');
    if (!selected) return setError('لطفاً کالا را انتخاب کنید.');
    const rawQty = Number(normalize(quantity));
    const qty = useCarton && selected.packSize ? rawQty * selected.packSize : rawQty;
    if (!Number.isInteger(qty) || qty <= 0) return setError('تعداد باید عدد صحیح و بزرگ‌تر از صفر باشد.');
    const price = Number(normalize(buyPrice || '0'));
    if (!Number.isFinite(price) || price < 0) return setError('قیمت خرید معتبر نیست.');

    // قیمت خرید جدید سود را کمتر از حد تعریف‌شده می‌کند؟ اول بپرس
    if (price > 0 && !receiptDecided.current) {
      const c = StorageService.buyPriceConflict(selected, price);
      if (c) {
        setConflictRows([{ key: 'self', name: selected.name, newBuy: price, current: c.current, target: c.target }]);
        return;
      }
    }
    const applyDecision = receiptApply.current;
    receiptDecided.current = false;

    const expiryIso = expiryInput ? new Date(expiryInput).toISOString() : selected.expiryDate || null;
    const nowIso = new Date().toISOString();

    if (expiryIso) {
      StorageService.addStockBatch(
        {
          productId: selected.id,
          productName: selected.name,
          batchNumber: batchNumber.trim() || null,
          locationId: targetLocation,
          quantity: qty,
          remainingQuantity: qty,
          productionDate: selected.productionDate ?? null,
          expiryDate: expiryIso,
          supplierName: supplierName.trim() || null,
          receivedBy: currentUser.id,
          receivedByName: currentUser.name,
          buyPrice: price,
          notes: notes.trim() || null,
        },
        currentUser
      );
    }

    // ورود کالا اول به مکان اصلی اضافه می‌شود؛ اگر مکان دیگری انتخاب شده، از اصلی به آن منتقل می‌شود
    const fresh = StorageService.getProducts().find((p) => p.id === selected.id);
    StorageService.quickUpdateStock(selected.id, (fresh?.stock ?? selected.stock) + qty, currentUser);
    if (price > 0) StorageService.applyBuyPriceChange(selected.id, price, currentUser, applyDecision);
    if (targetLocation !== DEFAULT_LOCATION_ID) {
      StorageService.transferStock(selected.id, DEFAULT_LOCATION_ID, targetLocation, qty, currentUser);
    }

    soundManager.playSuccessSound();
    setSuccess(
      `ثبت شد: ${toPersianDigits(qty)} عدد «${selected.name}» در ${StorageService.getLocationPath(targetLocation)}` +
        (expiryIso ? ' (با بچ و تاریخ انقضا)' : ' (بدون تاریخ انقضا)') +
        ` - ${toPersianDigits(nowIso.split('T')[0])}`
    );
    resetReceipt();
    onSaved();
  };

  const handleTransfer = () => {
    setTError('');
    setTMsg('');
    if (!tProduct) return setTError('کالا را انتخاب کنید.');
    if (!tFrom || !tTo) return setTError('مکان مبدأ و مقصد را انتخاب کنید.');
    if (tFrom === tTo) return setTError('مبدأ و مقصد نباید یکی باشند.');
    const qty = Number(normalize(tQty));
    if (!Number.isInteger(qty) || qty <= 0) return setTError('تعداد باید عدد صحیح و بزرگ‌تر از صفر باشد.');
    const available = tProduct.locationStock?.[tFrom] ?? 0;
    if (qty > available) return setTError(`در مبدأ فقط ${toPersianDigits(available)} عدد موجود است.`);

    const ok = StorageService.transferStock(tProduct.id, tFrom, tTo, qty, currentUser);
    if (!ok) return setTError('انتقال انجام نشد.');
    soundManager.playSuccessSound();
    setTMsg(`${toPersianDigits(qty)} عدد «${tProduct.name}» منتقل شد.`);
    setTQty('');
    setTFrom('');
    setTTo('');
    onSaved();
  };

  return (
    <div className="space-y-4 pb-24">
      {conflictRows && (
        <BuyPriceConflictModal
          rows={conflictRows}
          onCancel={() => setConflictRows(null)}
          onConfirm={(d) => {
            receiptApply.current = !!d['self'];
            receiptDecided.current = true;
            setConflictRows(null);
            handleReceipt();
          }}
        />
      )}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 p-2 rounded-xl">
            <Truck className="w-6 h-6" />
          </span>
          <h2 className="text-lg font-extrabold">ورود و انتقال کالا</h2>
        </div>
        <p className="text-xs text-amber-100 mt-1">هر ورود جداگانه ثبت می‌شود و کالا را بین مکان‌ها جابه‌جا می‌کنی.</p>
      </div>

      {/* ورود کالا */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">ورود کالا</h3>

        <div>
          <label className={labelClass}>کالا *</label>
          <ProductPicker
            products={activeProducts}
            value={productId}
            onChange={handleSelectProduct}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>تعداد ورودی *</label>
            <input className={inputClass} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="مثلاً ۵۰" />
          </div>
          <div>
            <label className={labelClass}>قیمت خرید هر عدد (تومان)</label>
            <input className={inputClass} inputMode="numeric" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />
          </div>
        </div>

        {selected?.packSize && selected.packSize > 1 && (
          <div>
            <label className={labelClass}>واحد ورود</label>
            <select
              className={inputClass}
              value={useCarton ? 'pack' : 'unit'}
              onChange={(e) => setUseCarton(e.target.value === 'pack')}
            >
              <option value="unit">{selected.unit}</option>
              <option value="pack">
                {selected.packUnit || 'بسته'} ({toPersianDigits(selected.packSize)} {selected.unit})
              </option>
            </select>
          </div>
        )}

        <div>
          <label className={labelClass}>ورود به مکان</label>
          <div className="flex gap-2">
            <select className={inputClass} value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)}>
              {locationOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowLocations(true)}
              className="shrink-0 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center gap-1"
            >
              <FolderTree className="w-3.5 h-3.5" />
              مکان‌ها
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>تاریخ انقضا (اختیاری)</label>
            <input type="date" className={inputClass} value={expiryInput} onChange={(e) => setExpiryInput(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>شماره بچ (اختیاری)</label>
            <input className={inputClass} value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>تأمین‌کننده (اختیاری)</label>
          <input className={inputClass} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>توضیحات (اختیاری)</label>
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {selected && (
          <p className="text-[11px] text-slate-500">
            موجودی فعلی: {toPersianDigits(selected.stock)} {selected.unit} · قیمت فروش: {formatToman(selected.price)}
          </p>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <button type="button" onClick={handleReceipt} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm">
          <Save className="w-4 h-4" />
          ثبت ورود
        </button>
      </div>

      {/* انتقال بین مکان‌ها */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-amber-600" />
          انتقال کالا بین مکان‌ها
        </h3>

        <div>
          <label className={labelClass}>کالا</label>
          <ProductPicker
            products={activeProducts}
            value={tProductId}
            onChange={(id) => {
              setTProductId(id);
              setTFrom('');
              setTTo('');
              setTError('');
              setTMsg('');
            }}
          />
        </div>

        {tProduct && (
          <div className="text-[11px] text-slate-500 space-y-0.5">
            <p className="font-semibold">موجودی به تفکیک مکان:</p>
            {Object.keys(tProduct.locationStock || {}).length === 0 ? (
              <p>هنوز مکانی ثبت نشده است.</p>
            ) : (
              Object.entries<number>(tProduct.locationStock || {})
                .filter(([, q]) => q > 0)
                .map(([id, q]) => (
                  <p key={id}>
                    {StorageService.getLocationPath(id)}: {toPersianDigits(q)}
                  </p>
                ))
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>از مکان</label>
            <select className={inputClass} value={tFrom} onChange={(e) => setTFrom(e.target.value)}>
              <option value="">انتخاب کنید...</option>
              {tFromOptions.map(([id, q]) => (
                <option key={id} value={id}>
                  {StorageService.getLocationPath(id)} ({toPersianDigits(q)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>به مکان</label>
            <select className={inputClass} value={tTo} onChange={(e) => setTTo(e.target.value)}>
              <option value="">انتخاب کنید...</option>
              {locationOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>تعداد</label>
          <input className={inputClass} inputMode="numeric" value={tQty} onChange={(e) => setTQty(e.target.value)} />
        </div>

        {tError && (
          <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{tError}</span>
          </div>
        )}
        {tMsg && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{tMsg}</span>
          </div>
        )}

        <button type="button" onClick={handleTransfer} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white font-bold text-sm">
          انجام انتقال
        </button>
      </div>

      {showLocations && (
        <LocationsManager
          onClose={() => setShowLocations(false)}
          onChanged={() => onSaved()}
        />
      )}
    </div>
  );
};

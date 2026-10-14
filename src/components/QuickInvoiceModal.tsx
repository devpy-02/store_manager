import React, { useMemo, useState } from 'react';
import { Invoice, InvoiceItem, InvoiceType, Product, ProductUnit, User } from '../types';
import { X, Plus, Trash2, CheckCircle2, AlertTriangle, Search, PackageCheck } from 'lucide-react';
import { formatPersianDateShort, toEnglishDigits, toPersianDigits, formatToman } from '../utils/jalali';

interface QuickLine {
  id: string;
  productId?: string;
  name: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  saveProduct: boolean;
  applyStock: boolean;
  stockStatus?: 'pending' | 'applied';
}
interface Props {
  isOpen: boolean;
  products: Product[];
  currentUser: User;
  onClose: () => void;
  onSave: (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'createdBy' | 'createdByName'>) => void;
  onSaveProduct: (name: string, unit: ProductUnit, price: number, type: InvoiceType) => Product | null;
}
const types: { value: InvoiceType; label: string }[] = [
  { value: 'retail', label: 'فروش خرده' },
  { value: 'sales', label: 'فروش عمده' },
  { value: 'purchase', label: 'خرید' },
  { value: 'purchase_return', label: 'برگشت از خرید' },
  { value: 'sales_return', label: 'برگشت از فروش' },
];
const units = ['عدد', 'متر', 'کیلو', 'دست', 'بسته'];
const outgoing = (type: InvoiceType) => type === 'sales' || type === 'retail' || type === 'purchase_return';
const affectsStock = (_type: InvoiceType) => true;
const newLine = (): QuickLine => ({ id: `ql_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: '', unit: '', quantity: '1', unitPrice: '', saveProduct: false, applyStock: false, stockStatus: 'pending' });
const num = (v: string) => Number(toEnglishDigits(v).replace(/[^0-9.]/g, '')) || 0;

export const QuickInvoiceModal: React.FC<Props> = ({ isOpen, products, currentUser, onClose, onSave, onSaveProduct }) => {
  const [type, setType] = useState<InvoiceType>('retail');
  const [lines, setLines] = useState<QuickLine[]>([newLine()]);
  const [date, setDate] = useState(formatPersianDateShort(new Date()));
  const [notes, setNotes] = useState('');
  const [warning, setWarning] = useState(false);
  const [error, setError] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + num(l.quantity) * num(l.unitPrice), 0), [lines]);
  if (!isOpen) return null;

  const updateLine = (id: string, patch: Partial<QuickLine>) => setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  const matchedProduct = (line: QuickLine) => products.find(p => !p.deleted && (p.id === line.productId || (!!line.name.trim() && p.name.trim().toLocaleLowerCase() === line.name.trim().toLocaleLowerCase())));
  const stockFor = (p: Product) => p.stock ?? 0;
  const canApply = (line: QuickLine) => {
    const p = matchedProduct(line);
    if (!p || line.stockStatus === 'applied') return false;
    return !outgoing(type) || stockFor(p) >= num(line.quantity);
  };
  const prepareSave = (applyAvailable: boolean, skipWarning = false) => {
    setError('');
    const preparedLines = lines.map(l => {
      const exact = products.find(p => !p.deleted && p.name.trim().toLocaleLowerCase() === l.name.trim().toLocaleLowerCase());
      if (!exact) return l;
      const defaultPrice = type === 'purchase' || type === 'purchase_return' ? (exact.buyPrice || exact.price) : exact.price;
      return { ...l, productId: exact.id, unit: l.unit || exact.unit, unitPrice: l.unitPrice.trim() ? l.unitPrice : String(defaultPrice) };
    });
    const valid = preparedLines.filter(l => num(l.quantity) > 0 && num(l.unitPrice) >= 0 && (l.quantity.trim() !== '') && (l.unitPrice.trim() !== ''));
    if (!valid.length) { setError('حداقل یک قلم با تعداد و قیمت واحد معتبر وارد کنید.'); return; }
    for (const l of valid) {
      if (l.saveProduct && !l.unit) { setError(`برای ثبت «${l.name.trim() || 'کالا'}» در فهرست انبار، ابتدا واحد کالا را انتخاب کنید.`); return; }
      const p = matchedProduct(l);
      if (l.applyStock && p && outgoing(type) && stockFor(p) < num(l.quantity)) {
        setError(`موجودی «${p.name}» کافی نیست؛ موجودی فعلی ${toPersianDigits(stockFor(p))} است. فاکتور ذخیره می‌شود اما از این قلم کسر نمی‌شود.`);
      }
    }
    const pendingPrompt = affectsStock(type) && valid.some(l => {
      const p = matchedProduct(l);
      return !!p && l.stockStatus !== 'applied' && !l.applyStock && (!outgoing(type) || stockFor(p) >= num(l.quantity));
    });
    if (pendingPrompt && !applyAvailable && !skipWarning) { setWarning(true); return; }
    const now = new Date();
    const invoiceItems: InvoiceItem[] = valid.map(l => {
      let product = matchedProduct(l);
      if (!product && l.saveProduct && l.name.trim() && l.unit) {
        product = onSaveProduct(l.name.trim(), l.unit as ProductUnit, num(l.unitPrice), type) || undefined;
      }
      const eligible = !!product && canApply({ ...l, productId: product.id });
      const apply = !!product && (l.applyStock || (applyAvailable && (!outgoing(type) || stockFor(product) >= num(l.quantity)))) && eligible;
      const quantity = num(l.quantity), unitPrice = num(l.unitPrice);
      return {
        id: l.id,
        productId: product?.id || `quick_${l.id}`,
        productName: l.name.trim() || 'کالای بدون نام',
        productCode: product?.code || '',
        unit: (l.unit || product?.unit || 'عدد') as ProductUnit,
        quantity,
        unitPrice,
        discountType: 'none',
        discountValue: 0,
        totalPrice: quantity * unitPrice,
        deductFromStock: apply,
        stockAdjustmentStatus: apply ? 'pending' : 'pending',
      } as InvoiceItem;
    });
    setSaving(true);
    try {
      onSave({
        type, date, time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
        items: invoiceItems, subtotal, discountType: 'none', discountValue: 0, totalDiscount: 0, tax: 0,
        finalTotal: invoiceItems.reduce((s, i) => s + i.totalPrice, 0), paymentStatus: 'full',
        paidAmount: invoiceItems.reduce((s, i) => s + i.totalPrice, 0), remainingAmount: 0, paymentMethod: 'cash',
        notes: notes.trim() || undefined, locationId: undefined,
      });
      setLines([newLine()]); setNotes(''); setWarning(false); onClose();
    } finally { setSaving(false); }
  };

  const applyDeferred = () => prepareSave(true);
  const saveLater = () => { setWarning(false); prepareSave(false, true); };
  const typeLabel = types.find(t => t.value === type)?.label || 'فاکتور سریع';

  return <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
    <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4">
        <div><h2 className="font-black text-lg">فاکتور سریع</h2><p className="text-xs text-slate-500 mt-1">ثبت اقلام با نام اختیاری و کنترل جداگانه موجودی</p></div>
        <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="بستن"><X /></button>
      </div>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {types.map(t => <label key={t.value} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${type === t.value ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
            <input type="radio" name="quick-invoice-type" checked={type === t.value} onChange={() => setType(t.value)} />
            <span className="font-bold text-sm">{t.label}</span>
          </label>)}
        </div>
        <div className="flex flex-wrap items-center gap-3"><label className="text-sm font-bold">تاریخ <input value={date} onChange={e => setDate(e.target.value)} className="mr-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 font-normal" /></label><span className="text-xs text-slate-500">کاربر: {currentUser.name}</span></div>
        {lines.map((line, index) => {
          const suggestions = line.name.trim() ? products.filter(p => !p.deleted && p.name.toLowerCase().includes(line.name.toLowerCase())).slice(0, 6) : [];
          const p = matchedProduct(line);
          const available = p ? stockFor(p) : 0;
          return <div key={line.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between"><b className="text-sm">قلم {toPersianDigits(index + 1)}</b><button onClick={() => setLines(prev => prev.length > 1 ? prev.filter(x => x.id !== line.id) : [newLine()])} className="text-rose-600 p-1" title="حذف قلم"><Trash2 size={17}/></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative"><label className="block text-xs font-bold mb-1">نام کالا (اختیاری)</label><div className="relative"><Search className="absolute right-3 top-3 text-slate-400" size={16}/><input value={line.name} onFocus={() => setActiveSuggestion(line.id)} onChange={e => { updateLine(line.id, { name: e.target.value, productId: undefined, applyStock: false, saveProduct: false }); setActiveSuggestion(line.id); }} placeholder="نام کالا را بنویسید..." className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent py-2.5 pr-9 pl-3 text-sm" /></div>
                {activeSuggestion === line.id && suggestions.length > 0 && <div className="absolute z-30 top-full mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">{suggestions.map(s => <button type="button" key={s.id} onClick={() => { updateLine(line.id, { name: s.name, productId: s.id, unit: line.unit || s.unit, unitPrice: line.unitPrice || String(type === 'purchase' || type === 'purchase_return' ? (s.buyPrice || s.price) : s.price), applyStock: false, saveProduct: false }); setActiveSuggestion(null); }} className="block w-full text-right px-3 py-2 hover:bg-amber-50 dark:hover:bg-slate-700 text-sm"><span className="font-bold">{s.name}</span><span className="block text-xs text-slate-500">موجودی: {toPersianDigits(s.stock)} · قیمت: {formatToman(type === 'purchase' ? (s.buyPrice || s.price) : s.price)}</span></button>)}</div>}
              </div>
              <label className="text-xs font-bold">واحد (اختیاری)<select value={line.unit} onChange={e => updateLine(line.id, { unit: e.target.value })} className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-2.5 text-sm"><option value="">انتخاب واحد</option>{units.map(u => <option key={u} value={u}>{u}</option>)}</select></label>
              <label className="text-xs font-bold">تعداد *<input inputMode="decimal" value={line.quantity} onChange={e => updateLine(line.id, { quantity: e.target.value, applyStock: false })} className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-2.5 text-sm" /></label>
              <label className="text-xs font-bold">قیمت واحد (تومان) *<input inputMode="numeric" value={line.unitPrice} onChange={e => updateLine(line.id, { unitPrice: e.target.value })} placeholder="قیمت واحد" className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-2.5 text-sm" /></label>
            </div>
            {p && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 text-xs"><span>کالای انباری: <b>{p.name}</b> · موجودی کل: <b>{toPersianDigits(available)}</b></span>
              <label className={`flex items-center gap-2 font-bold ${!canApply(line) ? 'opacity-50' : ''}`}><input type="checkbox" disabled={!canApply(line)} checked={line.applyStock} onChange={e => updateLine(line.id, { applyStock: e.target.checked })} />{type === 'purchase' || type === 'sales_return' ? 'افزایش موجودی' : 'کسر از موجودی'}</label></div>}
            {!p && line.name.trim() && (() => {
              const previouslyDeleted = products.some(item => item.deleted && item.name.trim().toLocaleLowerCase() === line.name.trim().toLocaleLowerCase());
              return <label className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <input type="checkbox" className="mt-0.5" checked={line.saveProduct} onChange={e => updateLine(line.id, { saveProduct: e.target.checked })} />
                <PackageCheck size={16} className="shrink-0"/>
                <span>{previouslyDeleted ? 'ثبت مجدد این کالا در فهرست انبار' : 'ذخیره این نام به‌عنوان کالا در فهرست انبار'}{!line.unit && <span className="block mt-1 font-normal text-emerald-700 dark:text-emerald-300">برای ثبت کالا، واحد را نیز انتخاب کن.</span>}</span>
              </label>;
            })()}
            <div className="text-left text-xs text-slate-500">جمع قلم: <b className="text-slate-900 dark:text-slate-100">{formatToman(num(line.quantity) * num(line.unitPrice))}</b></div>
          </div>;
        })}
        <button onClick={() => setLines(prev => [...prev, newLine()])} className="flex items-center gap-2 rounded-xl border border-dashed border-amber-500 px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-300"><Plus size={17}/> افزودن قلم جدید</button>
        <label className="block text-xs font-bold">توضیحات (اختیاری)<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3 text-sm" /></label>
        {error && <div className="rounded-xl bg-rose-50 text-rose-800 border border-rose-200 p-3 text-sm">{error}</div>}
        <div className="flex items-center justify-between rounded-2xl bg-slate-900 text-white p-4"><span className="font-bold">جمع کل فاکتور</span><b className="text-lg">{formatToman(subtotal)}</b></div>
        <div className="flex flex-wrap gap-2 justify-end"><button onClick={onClose} className="rounded-xl px-4 py-3 text-sm font-bold bg-slate-100 dark:bg-slate-800">انصراف</button><button disabled={saving} onClick={() => prepareSave(false)} className="rounded-xl px-5 py-3 text-sm font-black bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"><CheckCircle2 size={17} className="inline ml-1"/> ذخیره فاکتور</button></div>
      </div>
      {warning && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl"><div className="flex gap-3"><AlertTriangle className="text-amber-500 shrink-0"/><div><h3 className="font-black">کسر موجودی انجام نشده است</h3><p className="text-sm mt-2 leading-6">برای یک یا چند کالا هنوز تغییر موجودی اعمال نشده است. آیا می‌خواهید همین حالا تغییر موجودی برای اقلام واجد شرایط اعمال شود؟</p></div></div><div className="flex gap-2 mt-5"><button onClick={applyDeferred} className="flex-1 rounded-xl bg-amber-600 text-white p-3 text-sm font-bold">بله، می‌خواهم</button><button onClick={saveLater} className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-sm font-bold">بعداً کسر می‌کنم</button></div></div></div>}
    </div>
  </div>;
};

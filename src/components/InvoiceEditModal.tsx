import React, { useEffect, useMemo, useState } from 'react';
import { Invoice, InvoiceItem, Product } from '../types';
import { X, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import { formatToman, toEnglishDigits, toPersianDigits } from '../utils/jalali';

interface Props {
  invoice: Invoice | null;
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Invoice>) => boolean;
}
const n = (v: string | number) => Number(toEnglishDigits(String(v)).replace(/[^0-9.\-]/g, '')) || 0;
const recalcItem = (item: InvoiceItem): InvoiceItem => {
  const base = Math.max(0, item.quantity * item.unitPrice);
  const discount = item.discountType === 'percent' ? base * item.discountValue / 100 : item.discountType === 'amount' ? item.discountValue : 0;
  return { ...item, totalPrice: Math.max(0, Math.round(base - discount)) };
};
export const InvoiceEditModal: React.FC<Props> = ({ invoice, products, isOpen, onClose, onSave }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [paid, setPaid] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newProductId, setNewProductId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!invoice || !isOpen) return;
    setDate(invoice.date); setTime(invoice.time); setNotes(invoice.notes || ''); setPaid(String(invoice.paidAmount));
    setItems(invoice.items.map(i => ({ ...i })));
    setNewProductId(''); setError('');
  }, [invoice, isOpen]);
  const subtotal = useMemo(() => items.reduce((s, i) => s + recalcItem(i).totalPrice, 0), [items]);
  if (!isOpen || !invoice) return null;
  const updateItem = (id: string, patch: Partial<InvoiceItem>) => setItems(prev => prev.map(i => i.id === id ? recalcItem({ ...i, ...patch }) : i));
  const addProduct = () => {
    const p = products.find(x => x.id === newProductId && !x.deleted);
    if (!p) return;
    if (items.some(i => i.productId === p.id)) { setError('این کالا از قبل در فاکتور وجود دارد.'); return; }
    setItems(prev => [...prev, { id: `edit_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, productId: p.id, productName: p.name, productCode: p.code || '', unit: p.unit, quantity: 1, unitPrice: invoice.type === 'purchase' || invoice.type === 'purchase_return' ? (p.buyPrice || p.price) : p.price, discountType: 'none', discountValue: 0, totalPrice: invoice.type === 'purchase' || invoice.type === 'purchase_return' ? (p.buyPrice || p.price) : p.price, deductFromStock: false, stockAdjustmentStatus: 'pending' }]);
    setNewProductId(''); setError('');
  };
  const save = () => {
    setError('');
    if (!items.length || items.some(i => !Number.isFinite(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.unitPrice) || i.unitPrice < 0)) { setError('حداقل یک قلم معتبر لازم است؛ تعداد باید بیشتر از صفر و قیمت نباید منفی باشد.'); return; }
    const finalSubtotal = items.reduce((s, i) => s + recalcItem(i).totalPrice, 0);
    const finalTotal = Math.max(0, finalSubtotal - (invoice.totalDiscount || 0) + (invoice.tax || 0));
    const paidAmount = Math.max(0, Math.min(finalTotal, n(paid)));
    const ok = onSave(invoice.id, { date, time, notes: notes.trim() || undefined, items: items.map(recalcItem), subtotal: finalSubtotal, finalTotal, paidAmount, remainingAmount: Math.max(0, finalTotal - paidAmount), paymentStatus: paidAmount >= finalTotal ? 'full' : paidAmount > 0 ? 'partial' : 'credit' });
    if (ok) onClose();
  };
  return <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
    <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4"><div><h2 className="font-black text-lg">ویرایش فاکتور {invoice.invoiceNumber}</h2><p className="text-xs text-slate-500 mt-1">ویرایش تاریخ، اقلام، قیمت‌ها، توضیحات و مبلغ پرداختی</p></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X /></button></header>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><label className="text-xs font-bold">تاریخ<input value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-2.5" /></label><label className="text-xs font-bold">ساعت<input value={time} onChange={e=>setTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-2.5" /></label><label className="text-xs font-bold">مبلغ پرداخت‌شده (تومان)<input inputMode="numeric" value={toPersianDigits(paid)} onChange={e=>setPaid(toEnglishDigits(e.target.value).replace(/[^0-9]/g,''))} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-2.5" /></label></div>
        <div className="flex gap-2"><select value={newProductId} onChange={e=>setNewProductId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-2.5 text-sm"><option value="">افزودن کالا از انبار…</option>{products.filter(p=>!p.deleted).map(p=><option key={p.id} value={p.id}>{p.name} — موجودی {p.stock}</option>)}</select><button onClick={addProduct} className="rounded-xl bg-amber-600 text-white px-3 font-bold text-sm"><Plus className="inline ml-1" size={16}/>افزودن</button></div>
        {items.map((item,index)=><section key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3"><div className="flex justify-between items-center gap-2"><div className="font-bold text-sm">{toPersianDigits(index+1)}. {item.productName}</div><button onClick={()=>setItems(prev=>prev.filter(x=>x.id!==item.id))} className="text-rose-600 p-1" title="حذف قلم"><Trash2 size={17}/></button></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><label className="text-xs">نام کالا<input value={item.productName} onChange={e=>updateItem(item.id,{productName:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2" /></label><label className="text-xs">واحد<input value={item.unit} onChange={e=>updateItem(item.id,{unit:e.target.value as InvoiceItem['unit']})} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2" /></label><label className="text-xs">تعداد<input inputMode="decimal" value={toPersianDigits(item.quantity)} onChange={e=>updateItem(item.id,{quantity:n(e.target.value)})} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2" /></label><label className="text-xs">قیمت واحد<input inputMode="numeric" value={toPersianDigits(item.unitPrice)} onChange={e=>updateItem(item.id,{unitPrice:n(e.target.value)})} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-2" /></label></div><div className="text-left text-xs text-slate-500">جمع قلم: <b className="text-slate-900 dark:text-white">{formatToman(recalcItem(item).totalPrice)}</b>{item.stockAdjustmentStatus==='applied' && <span className="mr-2 text-emerald-600">· اثر موجودی قبلاً اعمال شده</span>}</div></section>)}
        <label className="block text-xs font-bold">توضیحات<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3" /></label>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs leading-6"><AlertTriangle className="inline ml-1 text-amber-600" size={15}/> ویرایش اقلامی که اثر موجودی آن‌ها قبلاً اعمال شده، موجودی را نیز با مقدار جدید هماهنگ می‌کند؛ تغییرات فقط در صورت کافی بودن موجودی ذخیره می‌شوند.</div>
        {error && <div className="rounded-xl bg-rose-50 text-rose-800 border border-rose-200 p-3 text-sm">{error}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 text-white p-4"><span className="font-bold">جمع اقلام</span><b>{formatToman(subtotal)}</b><button onClick={save} className="rounded-xl bg-amber-600 px-4 py-2.5 font-black"><Save className="inline ml-1" size={17}/>ذخیره تغییرات</button></div>
      </div>
    </div>
  </div>;
};

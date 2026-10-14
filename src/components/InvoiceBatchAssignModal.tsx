import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, PackagePlus } from 'lucide-react';
import { Invoice, User } from '../types';
import { StorageService, DEFAULT_LOCATION_ID } from '../services/storageService';
import { toPersianDigits } from '../utils/jalali';

interface Props {
  invoice: Invoice;
  currentUser: User;
  onClose: () => void;
  onChanged: () => void;
}

// تخصیص دستی بچ به قلم‌های فاکتور، بعد از ثبت فاکتور
export const InvoiceBatchAssignModal: React.FC<Props> = ({ invoice, currentUser, onClose, onChanged }) => {
  const [invData, setInvData] = useState<Invoice>(invoice);
  const [choice, setChoice] = useState<Record<string, string>>(() =>
    Object.fromEntries(invoice.items.map((i) => [i.id, i.batchId || '']))
  );
  const [newBatch, setNewBatch] = useState<Record<string, { expiry: string; number: string }>>({});
  const [openNew, setOpenNew] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  const refreshInvoice = () => {
    const fresh = StorageService.getInvoices().find((i) => i.id === invoice.id);
    if (fresh) setInvData(fresh);
    onChanged();
  };

  const itemLocation = (itemLoc?: string | null) => itemLoc || invData.locationId || DEFAULT_LOCATION_ID;
  const isPurchase = invData.type === 'purchase';

  const batchOptions = (productId: string, locId: string, currentId?: string | null) =>
    StorageService.getStockBatches().filter(
      (b) =>
        b.productId === productId &&
        (b.locationId || DEFAULT_LOCATION_ID) === locId &&
        (isPurchase || b.remainingQuantity > 0 || b.id === currentId)
    );

  const applyChoice = (itemId: string) => {
    const res = StorageService.assignInvoiceItemBatch(invData.id, itemId, choice[itemId] || null);
    setErrors((e) => ({ ...e, [itemId]: res.ok ? '' : res.reason || 'خطا' }));
    setDone((d) => ({ ...d, [itemId]: res.ok }));
    if (res.ok) refreshInvoice();
  };

  const createBatch = (itemId: string) => {
    const nb = newBatch[itemId] || { expiry: '', number: '' };
    const res = StorageService.createBatchForInvoiceItem(
      invData.id,
      itemId,
      { expiryDate: nb.expiry, batchNumber: nb.number },
      currentUser
    );
    setErrors((e) => ({ ...e, [itemId]: res.ok ? '' : res.reason || 'خطا' }));
    if (res.ok) {
      setOpenNew(null);
      setDone((d) => ({ ...d, [itemId]: true }));
      refreshInvoice();
      setChoice((c) => ({ ...c, [itemId]: StorageService.getInvoices().find((i) => i.id === invData.id)?.items.find((x) => x.id === itemId)?.batchId || '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">تخصیص بچ به فاکتور {invData.invoiceNumber}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          {isPurchase
            ? 'برای خرید، بچ فقط به قلم وصل می‌شود. اگر بچ نداری، می‌توانی بچ جدید با تاریخ انقضا بسازی.'
            : 'بچ انتخابی موجودی همان بچ را تغییر می‌دهد. تغییرات قبلی خودکار برگردانده می‌شوند.'}
        </p>

        <div className="overflow-y-auto flex-1 space-y-2.5">
          {invData.items.map((item) => {
            const loc = itemLocation(item.locationId);
            const opts = batchOptions(item.productId, loc, item.batchId);
            return (
              <div key={item.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between gap-2 text-xs">
                  <span className="font-bold truncate">{item.productName}</span>
                  <span className="shrink-0">{toPersianDigits(item.quantity)} {item.unit}</span>
                </div>
                <p className="text-[10px] text-slate-500">مکان: {StorageService.getLocationPath(loc)}</p>

                <select
                  value={choice[item.id] || ''}
                  onChange={(e) => setChoice((c) => ({ ...c, [item.id]: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="">بدون بچ</option>
                  {opts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber || 'بدون شماره'} · انقضا {new Date(b.expiryDate).toLocaleDateString('fa-IR')} · مانده {toPersianDigits(b.remainingQuantity)}
                    </option>
                  ))}
                </select>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyChoice(item.id)}
                    className="flex-1 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold"
                  >
                    ثبت بچ
                  </button>
                  {isPurchase && (
                    <button
                      type="button"
                      onClick={() => setOpenNew(openNew === item.id ? null : item.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center gap-1"
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                      بچ جدید
                    </button>
                  )}
                </div>

                {isPurchase && openNew === item.id && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="date"
                      value={newBatch[item.id]?.expiry || ''}
                      onChange={(e) => setNewBatch((n) => ({ ...n, [item.id]: { number: n[item.id]?.number || '', expiry: e.target.value } }))}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                    />
                    <input
                      placeholder="شماره بچ"
                      value={newBatch[item.id]?.number || ''}
                      onChange={(e) => setNewBatch((n) => ({ ...n, [item.id]: { expiry: n[item.id]?.expiry || '', number: e.target.value } }))}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                    />
                    <button type="button" onClick={() => createBatch(item.id)} className="col-span-2 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold">
                      ساخت و وصل کردن بچ
                    </button>
                  </div>
                )}

                {errors[item.id] && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-600">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors[item.id]}</span>
                  </div>
                )}
                {done[item.id] && !errors[item.id] && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>ذخیره شد</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

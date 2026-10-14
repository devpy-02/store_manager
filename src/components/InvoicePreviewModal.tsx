import React, { useRef } from 'react';
import { Invoice } from '../types';
import { formatToman, toPersianDigits, formatPersianDateTime } from '../utils/jalali';
import { X, Printer, Wrench, CheckCircle, Share2 } from 'lucide-react';

interface Props {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<Props> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const typeLabels = {
    sales: 'فاکتور فروش کالا',
    purchase: 'فاکتور خرید کالا',
    retail: 'فاکتور فروش نقدی (خرده‌فروشی)',
    purchase_return: 'فاکتور برگشت از خرید',
    sales_return: 'فاکتور برگشت از فروش',
  }[invoice.type];

  const handlePrint = () => {
    const source = printableRef.current;
    if (!source) {
      window.print();
      return;
    }

    // Print the complete invoice only, independently of the modal's scroll area.
    const printArea = document.createElement('div');
    printArea.id = 'print-invoice-area';
    printArea.innerHTML = source.innerHTML;
    document.body.appendChild(printArea);
    document.body.classList.add('printing-invoice');

    const cleanup = () => {
      printArea.remove();
      document.body.classList.remove('printing-invoice');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">پیش‌نمایش چاپ فاکتور</span>
            <span className="text-[11px] font-mono text-amber-400">({invoice.invoiceNumber})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Paper Area */}
        <div ref={printableRef} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 bg-white text-slate-900 print:p-0">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md">
                <Wrench className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-950">
                  فروشگاه ابزار حامی
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  بورس تخصصی ابزارآلات برقی، شارژی، دستی و تجهیزات کارگاهی
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  تلفن تماس: ۰۲۱-۵۵۴۴۳۳۲۲ · موبایل: ۰۹۱۲۱۱۱۲۲۳۳
                </p>
              </div>
            </div>

            <div className="text-left text-xs space-y-1">
              <div className="text-sm font-extrabold text-slate-900">
                {typeLabels}
              </div>
              <div className="font-mono text-xs">
                شماره: <span className="font-bold text-amber-700">{invoice.invoiceNumber}</span>
              </div>
              <div className="text-[11px] text-slate-600">
                تاریخ: {toPersianDigits(invoice.date)} · ساعت: {toPersianDigits(invoice.time)}
              </div>
            </div>
          </div>

          {/* Party Info (Buyer / Seller) */}
          <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">مشخصات طرف حساب:</span>
              <p className="font-bold text-slate-900 mt-0.5 text-sm">
                {invoice.customerName || invoice.supplierName || 'مشتری محترم حضوری (نقدی)'}
              </p>
              {(invoice.customerPhone || invoice.supplierPhone) && (
                <p className="text-slate-600 text-[11px] mt-0.5 font-mono">
                  شماره تماس: {toPersianDigits(invoice.customerPhone || invoice.supplierPhone || '')}
                </p>
              )}
            </div>

            <div className="text-left">
              <span className="text-slate-500 block text-[10px]">ثبت‌کننده / فروشنده:</span>
              <p className="font-bold text-slate-900 mt-0.5 text-sm">
                {invoice.createdByName}
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                فروشگاه ابزار حامی (شعبه مرکزی)
              </p>
            </div>
          </div>

          {/* Return specific notice */}
          {invoice.returnReason && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <span className="font-bold">علت مرجوعی:</span> {invoice.returnReason}
              {invoice.originalInvoiceNumber && (
                <span className="mr-3 font-mono">
                  (عطف به فاکتور اصلی: {invoice.originalInvoiceNumber})
                </span>
              )}
            </div>
          )}

          {/* Items Table */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">ردیف</th>
                  <th className="py-2.5 px-3">شرح کالا یا ابزار</th>
                  <th className="py-2.5 px-3 text-center">تعداد / واحد</th>
                  <th className="py-2.5 px-3 text-center">قیمت واحد (تومان)</th>
                  <th className="py-2.5 px-3 text-center">مبلغ کل (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                      {toPersianDigits(idx + 1)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.productCode}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                      {toPersianDigits(item.quantity)} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums">
                      {formatToman(item.unitPrice).replace(' تومان', '')}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold tabular-nums text-slate-900">
                      {formatToman(item.totalPrice).replace(' تومان', '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end">
            <div className="w-72 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>جمع کل اقلام:</span>
                <span className="font-bold tabular-nums">{formatToman(invoice.subtotal)}</span>
              </div>
              {invoice.totalDiscount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>تخفیف:</span>
                  <span className="tabular-nums">-{formatToman(invoice.totalDiscount)}</span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>مالیات:</span>
                  <span className="tabular-nums">+{formatToman(invoice.tax)}</span>
                </div>
              )}
              <div className="pt-2 border-t-2 border-slate-300 flex justify-between text-sm font-extrabold text-slate-950">
                <span>مبلغ قابل پرداخت:</span>
                <span className="text-amber-700 tabular-nums">{formatToman(invoice.finalTotal)}</span>
              </div>

              {invoice.remainingAmount > 0 && (
                <div className="pt-1 text-[11px] flex justify-between text-rose-600 font-bold">
                  <span>مانده دفتری:</span>
                  <span className="tabular-nums">{formatToman(invoice.remainingAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <span className="font-bold">یادداشت:</span> {invoice.notes}
            </div>
          )}

          {/* Running Balance Status Box */}
          {invoice.customerId && (invoice.balanceBefore !== undefined || invoice.type === 'sales' || invoice.type === 'retail') && (
            <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                <span>💰 وضعیت حساب</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  طرف حساب: {invoice.customerName}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">مانده قبلی:</span>
                  <span className="font-bold tabular-nums text-slate-900">
                    {formatToman(invoice.balanceBefore ?? 0)}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">مبلغ این فاکتور:</span>
                  <span className="font-bold tabular-nums text-emerald-700">
                    +{formatToman(invoice.finalTotal)}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">پرداخت این فاکتور:</span>
                  <span className="font-bold tabular-nums text-rose-700">
                    -{formatToman(invoice.paidAmount)}
                  </span>
                </div>
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 block font-bold">مانده جدید:</span>
                  <span className="font-black tabular-nums text-amber-900">
                    {formatToman(
                      invoice.balanceAfter ??
                        (invoice.balanceBefore ?? 0) + invoice.finalTotal - invoice.paidAmount
                    )}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 text-center font-bold text-slate-800 text-[11px]">
                {(invoice.balanceAfter ??
                  (invoice.balanceBefore ?? 0) + invoice.finalTotal - invoice.paidAmount) > 0 ? (
                  <span>
                    باقی مانده حساب شما با احتساب این فاکتور:{' '}
                    <strong className="text-amber-800 font-black">
                      {formatToman(
                        invoice.balanceAfter ??
                          (invoice.balanceBefore ?? 0) + invoice.finalTotal - invoice.paidAmount
                      )}
                    </strong>
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold">
                    حساب شما تسویه شد. با تشکر از خرید شما.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Signature Areas */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-600 border-t border-slate-200">
            <div className="space-y-8">
              <span>مهر و امضای فروشنده (ابزار حامی)</span>
              <div className="h-10"></div>
            </div>
            <div className="space-y-8">
              <span>امضاء و تأیید تحویل گیرنده / خریدار</span>
              <div className="h-10"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

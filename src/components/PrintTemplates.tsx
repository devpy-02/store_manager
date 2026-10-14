import React from 'react';
import { Invoice, ShopInfo, PrintTemplateId } from '../types';
import { formatToman, toPersianDigits } from '../utils/jalali';
import { Wrench, CheckCircle, ShieldCheck } from 'lucide-react';

export interface PrintOptions {
  includeLogo: boolean;
  includeAddressPhone: boolean;
  includeSignatures: boolean;
  showProfit: boolean;
  includeBarcode: boolean;
}

interface TemplateProps {
  invoice: Invoice;
  shopInfo: ShopInfo;
  options: PrintOptions;
}

// Barcode Visual Generator Component
const BarcodeVisual: React.FC<{ value: string }> = ({ value }) => {
  return (
    <div className="flex flex-col items-center gap-1 my-1">
      <div className="flex items-center h-8 gap-[2px] px-2 bg-white">
        {value.split('').map((char, i) => {
          const code = char.charCodeAt(0);
          const widthClass = code % 3 === 0 ? 'w-[3px]' : code % 2 === 0 ? 'w-[2px]' : 'w-[1px]';
          return <div key={i} className={`h-full bg-black ${widthClass}`} />;
        })}
        <div className="w-[3px] h-full bg-black ml-1" />
        <div className="w-[1px] h-full bg-black" />
        <div className="w-[2px] h-full bg-black" />
      </div>
      <span className="text-[10px] font-mono tracking-widest text-slate-600">{value}</span>
    </div>
  );
};

// 1. Template 1: ساده (Simple)
export const SimpleTemplate: React.FC<TemplateProps> = ({ invoice, shopInfo, options }) => {
  return (
    <div className="p-6 bg-white text-slate-900 font-sans text-xs max-w-2xl mx-auto space-y-4 border border-slate-300">
      {/* Header */}
      <div className="border-b border-black pb-3 flex justify-between items-start">
        <div>
          <h2 className="text-base font-bold text-black">{shopInfo.name}</h2>
          {options.includeAddressPhone && (
            <p className="text-[11px] text-slate-700 mt-0.5">
              {shopInfo.address} | تلفن: {toPersianDigits(shopInfo.phone)}
            </p>
          )}
        </div>
        <div className="text-left font-mono">
          <div>شماره: {invoice.invoiceNumber}</div>
          <div>تاریخ: {toPersianDigits(invoice.date)}</div>
          <div>ساعت: {toPersianDigits(invoice.time)}</div>
        </div>
      </div>

      {/* Party */}
      <div className="flex justify-between text-xs py-1">
        <div>
          <strong>طرف حساب:</strong> {invoice.customerName || invoice.supplierName || 'مشتری نقدی'}
          {invoice.customerPhone && <span className="mr-2">({toPersianDigits(invoice.customerPhone)})</span>}
        </div>
        <div>
          <strong>ثبت‌کننده:</strong> {invoice.createdByName}
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-right border-collapse border border-slate-400">
        <thead>
          <tr className="border-b border-slate-400 bg-slate-100">
            <th className="p-1.5 border border-slate-300 text-center w-8">ردیف</th>
            <th className="p-1.5 border border-slate-300">نام کالا</th>
            <th className="p-1.5 border border-slate-300 text-center">واحد</th>
            <th className="p-1.5 border border-slate-300 text-center">تعداد</th>
            <th className="p-1.5 border border-slate-300 text-center">قیمت واحد</th>
            <th className="p-1.5 border border-slate-300 text-center">مجموع (تومان)</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={item.id} className="border-b border-slate-300">
              <td className="p-1.5 border border-slate-300 text-center">{toPersianDigits(idx + 1)}</td>
              <td className="p-1.5 border border-slate-300 font-semibold">{item.productName}</td>
              <td className="p-1.5 border border-slate-300 text-center">{item.unit}</td>
              <td className="p-1.5 border border-slate-300 text-center">{toPersianDigits(item.quantity)}</td>
              <td className="p-1.5 border border-slate-300 text-center">{formatToman(item.unitPrice).replace(' تومان', '')}</td>
              <td className="p-1.5 border border-slate-300 text-center font-bold">{formatToman(item.totalPrice).replace(' تومان', '')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-between items-start pt-2">
        <div>
          {options.includeBarcode && <BarcodeVisual value={invoice.invoiceNumber} />}
          {invoice.notes && <p className="text-[11px] text-slate-600 mt-2">یادداشت: {invoice.notes}</p>}
        </div>
        <div className="w-64 space-y-1 text-xs border border-slate-300 p-2">
          <div className="flex justify-between">
            <span>جمع کل:</span>
            <span>{formatToman(invoice.subtotal)}</span>
          </div>
          {invoice.totalDiscount > 0 && (
            <div className="flex justify-between text-rose-700">
              <span>تخفیف:</span>
              <span>-{formatToman(invoice.totalDiscount)}</span>
            </div>
          )}
          {invoice.tax > 0 && (
            <div className="flex justify-between">
              <span>مالیات:</span>
              <span>+{formatToman(invoice.tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-slate-300 pt-1 text-sm">
            <span>مبلغ نهایی:</span>
            <span>{formatToman(invoice.finalTotal)}</span>
          </div>
          {invoice.remainingAmount > 0 && (
            <div className="flex justify-between text-rose-700 text-xs pt-1 border-t border-dashed">
              <span>مانده حساب:</span>
              <span>{formatToman(invoice.remainingAmount)}</span>
            </div>
          )}
          {options.showProfit && invoice.totalProfit !== undefined && (
            <div className="flex justify-between text-emerald-700 text-xs pt-1 border-t border-dashed">
              <span>سود داخلی:</span>
              <span>+{formatToman(invoice.totalProfit)}</span>
            </div>
          )}
        </div>
      </div>

      {options.includeSignatures && (
        <div className="pt-8 flex justify-between text-center text-xs text-slate-600">
          <div>امضای خریدار</div>
          <div>امضای فروشنده</div>
        </div>
      )}

      <div className="text-center text-[11px] text-slate-500 pt-3 border-t border-slate-200">
        از خرید و حسن اعتماد شما متشکریم
      </div>
    </div>
  );
};

// 2. Template 2: رسمی (Official)
export const OfficialTemplate: React.FC<TemplateProps> = ({ invoice, shopInfo, options }) => {
  return (
    <div className="p-8 bg-white text-slate-900 font-sans text-xs max-w-2xl mx-auto space-y-5 border-2 border-slate-800 shadow-sm">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {options.includeLogo && (
            <div className="w-14 h-14 bg-amber-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm">
              <Wrench className="w-8 h-8" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black text-slate-950">{shopInfo.name}</h1>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">بورس تخصصی ابزارآلات و تجهیزات صنعتی</p>
            {shopInfo.economicCode && (
              <p className="text-[11px] text-slate-500">کد اقتصادی: {toPersianDigits(shopInfo.economicCode)}</p>
            )}
          </div>
        </div>

        <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
          <div className="text-xs font-black text-amber-800">فاکتور رسمی فروش</div>
          <div className="font-mono text-xs">شماره: <strong>{invoice.invoiceNumber}</strong></div>
          <div className="text-[11px] text-slate-600">تاریخ: {toPersianDigits(invoice.date)} - ساعت: {toPersianDigits(invoice.time)}</div>
        </div>
      </div>

      {/* Contact info if checked */}
      {options.includeAddressPhone && (
        <div className="text-center text-[11px] text-slate-600 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200">
          آدرس: {shopInfo.address} · تلفن ثابت: {toPersianDigits(shopInfo.phone)} · همراه: {toPersianDigits(shopInfo.mobile)}
        </div>
      )}

      {/* Customer Info Box */}
      <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-300 text-xs">
        <div>
          <span className="text-slate-500 text-[10px] block">مشخصات خریدار / مشتری:</span>
          <p className="font-bold text-slate-950 text-sm mt-0.5">
            {invoice.customerName || invoice.supplierName || 'مشتری محترم نقدی'}
          </p>
          {invoice.customerPhone && (
            <p className="text-slate-600 text-[11px] mt-0.5">تلفن: {toPersianDigits(invoice.customerPhone)}</p>
          )}
        </div>
        <div className="text-left">
          <span className="text-slate-500 text-[10px] block">صادر کننده:</span>
          <p className="font-bold text-slate-950 text-sm mt-0.5">{invoice.createdByName}</p>
          <p className="text-slate-500 text-[11px] mt-0.5">روش تسویه: {invoice.paymentMethod === 'cash' ? 'نقدی' : invoice.paymentMethod}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-slate-300 rounded-xl overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-800 text-white font-bold">
            <tr>
              <th className="py-2.5 px-2 text-center w-8">ردیف</th>
              <th className="py-2.5 px-3">نام و مشخصات کالا</th>
              <th className="py-2.5 px-2 text-center">کد کالا</th>
              <th className="py-2.5 px-2 text-center">واحد</th>
              <th className="py-2.5 px-2 text-center">تعداد</th>
              <th className="py-2.5 px-3 text-center">قیمت واحد (تومان)</th>
              <th className="py-2.5 px-3 text-center">مبلغ کل (تومان)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="py-2 px-2 text-center font-mono text-slate-500">{toPersianDigits(idx + 1)}</td>
                <td className="py-2 px-3 font-semibold text-slate-900">{item.productName}</td>
                <td className="py-2 px-2 text-center font-mono text-slate-500 text-[11px]">{item.productCode}</td>
                <td className="py-2 px-2 text-center">{item.unit}</td>
                <td className="py-2 px-2 text-center font-bold">{toPersianDigits(item.quantity)}</td>
                <td className="py-2 px-3 text-center font-mono">{formatToman(item.unitPrice).replace(' تومان', '')}</td>
                <td className="py-2 px-3 text-center font-bold font-mono text-slate-950">{formatToman(item.totalPrice).replace(' تومان', '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Notes */}
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          {options.includeBarcode && <BarcodeVisual value={invoice.invoiceNumber} />}
          {invoice.notes && (
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 max-w-xs">
              <span className="font-bold">توضیحات:</span> {invoice.notes}
            </div>
          )}
        </div>

        <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs space-y-2">
          <div className="flex justify-between text-slate-600">
            <span>جمع کل فاکتور:</span>
            <span className="font-bold font-mono">{formatToman(invoice.subtotal)}</span>
          </div>
          {invoice.totalDiscount > 0 && (
            <div className="flex justify-between text-rose-600 font-semibold">
              <span>تخفیف ویژه:</span>
              <span className="font-mono">-{formatToman(invoice.totalDiscount)}</span>
            </div>
          )}
          {invoice.tax > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>مالیات بر ارزش افزوده:</span>
              <span className="font-mono">+{formatToman(invoice.tax)}</span>
            </div>
          )}
          <div className="border-t-2 border-slate-400 pt-2 flex justify-between text-sm font-black text-slate-950">
            <span>مبلغ قابل پرداخت:</span>
            <span className="text-amber-800 font-mono">{formatToman(invoice.finalTotal)}</span>
          </div>
          {invoice.remainingAmount > 0 && (
            <div className="pt-1 border-t border-slate-200 text-rose-700 flex justify-between font-bold">
              <span>مانده حساب دفتری:</span>
              <span className="font-mono">{formatToman(invoice.remainingAmount)}</span>
            </div>
          )}
          {options.showProfit && invoice.totalProfit !== undefined && (
            <div className="pt-1 border-t border-slate-200 text-emerald-700 flex justify-between font-bold">
              <span>سود فروشنده (محرمانه):</span>
              <span className="font-mono">+{formatToman(invoice.totalProfit)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signatures */}
      {options.includeSignatures && (
        <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-600 border-t border-slate-300">
          <div className="space-y-12">
            <span className="font-bold">مهر و امضای فروشنده ({shopInfo.name})</span>
            <div className="h-8"></div>
          </div>
          <div className="space-y-12">
            <span className="font-bold">امضاء و تأیید تحویل گیرنده / خریدار</span>
            <div className="h-8"></div>
          </div>
        </div>
      )}

      <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-200">
        از خرید و حسن انتخاب شما سپاسگزاریم · گارانتی و ضمانت اصالت ابزار
      </div>
    </div>
  );
};

// 3. Template 3: رنگی (Colorful)
export const ColorfulTemplate: React.FC<TemplateProps> = ({ invoice, shopInfo, options }) => {
  const accentColor =
    invoice.type === 'sales'
      ? 'emerald'
      : invoice.type === 'purchase'
      ? 'blue'
      : invoice.type === 'retail'
      ? 'amber'
      : 'rose';

  return (
    <div className="p-8 bg-white text-slate-900 font-sans text-xs max-w-2xl mx-auto space-y-5 rounded-3xl border border-slate-200 shadow-lg">
      {/* Colorful Header Banner */}
      <div className={`p-5 rounded-2xl text-white shadow-md bg-gradient-to-l from-emerald-600 to-teal-700`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {options.includeLogo && (
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xs text-white rounded-xl flex items-center justify-center font-bold">
                <Wrench className="w-7 h-7" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-black tracking-tight">{shopInfo.name}</h1>
              <p className="text-xs text-emerald-100">{shopInfo.address}</p>
            </div>
          </div>

          <div className="text-left bg-black/20 px-3.5 py-2 rounded-xl text-xs space-y-0.5">
            <div className="font-black text-amber-300">فاکتور فروش کالا</div>
            <div className="font-mono text-xs">{invoice.invoiceNumber}</div>
            <div className="text-[10px] text-white/80">{toPersianDigits(invoice.date)} · {toPersianDigits(invoice.time)}</div>
          </div>
        </div>
      </div>

      {/* Customer Card */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex justify-between items-center">
        <div>
          <span className="text-emerald-700 font-bold text-[10px] block">خریدار محترم:</span>
          <h3 className="text-sm font-extrabold text-slate-900">{invoice.customerName || invoice.supplierName || 'مشتری گرامی'}</h3>
          {invoice.customerPhone && <p className="text-slate-600 text-[11px] mt-0.5">تماس: {toPersianDigits(invoice.customerPhone)}</p>}
        </div>
        <div className="text-left text-xs">
          <span className="text-slate-500 block text-[10px]">مسئول فروش:</span>
          <span className="font-bold text-slate-800">{invoice.createdByName}</span>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-2xl border border-emerald-200 overflow-hidden shadow-xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-emerald-600 text-white font-bold">
            <tr>
              <th className="py-2.5 px-3 text-center w-8">#</th>
              <th className="py-2.5 px-3">شرح قلم کالا</th>
              <th className="py-2.5 px-2 text-center">تعداد</th>
              <th className="py-2.5 px-3 text-center">قیمت واحد (تومان)</th>
              <th className="py-2.5 px-3 text-center">مبلغ کل (تومان)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-100">
            {invoice.items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-emerald-50/40">
                <td className="py-2.5 px-3 text-center font-mono text-emerald-800 font-bold">{toPersianDigits(idx + 1)}</td>
                <td className="py-2.5 px-3 font-semibold text-slate-900">
                  <div>{item.productName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{item.productCode}</div>
                </td>
                <td className="py-2.5 px-2 text-center font-bold">
                  {toPersianDigits(item.quantity)} {item.unit}
                </td>
                <td className="py-2.5 px-3 text-center font-mono">{formatToman(item.unitPrice).replace(' تومان', '')}</td>
                <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-900">{formatToman(item.totalPrice).replace(' تومان', '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Summary */}
      <div className="flex justify-between items-start">
        <div>
          {options.includeBarcode && <BarcodeVisual value={invoice.invoiceNumber} />}
        </div>

        <div className="w-72 bg-gradient-to-br from-slate-50 to-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>جمع اقلام:</span>
            <span className="font-bold">{formatToman(invoice.subtotal)}</span>
          </div>
          {invoice.totalDiscount > 0 && (
            <div className="flex justify-between text-rose-600 font-semibold">
              <span>تخفیف:</span>
              <span>-{formatToman(invoice.totalDiscount)}</span>
            </div>
          )}
          <div className="border-t border-emerald-200 pt-2 flex justify-between text-sm font-black text-emerald-900">
            <span>مبلغ نهایی فاکتور:</span>
            <span>{formatToman(invoice.finalTotal)}</span>
          </div>
          {invoice.remainingAmount > 0 && (
            <div className="text-rose-600 font-bold flex justify-between pt-1 border-t border-dashed border-rose-200">
              <span>مانده حساب:</span>
              <span>{formatToman(invoice.remainingAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {options.includeSignatures && (
        <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-600 border-t border-emerald-100">
          <div>مهر و امضای فروشگاه</div>
          <div>امضای مشتری</div>
        </div>
      )}

      <div className="text-center text-[11px] text-emerald-800 font-medium pt-2">
        از خرید شما بی‌نهایت سپاسگزاریم · فروشگاه ابزار حامی
      </div>
    </div>
  );
};

// 4. Template 4: کلاسیک (Classic)
export const ClassicTemplate: React.FC<TemplateProps> = ({ invoice, shopInfo, options }) => {
  return (
    <div className="p-8 bg-[#fdfbf7] text-amber-950 font-serif text-xs max-w-2xl mx-auto space-y-5 border-4 border-double border-amber-900 shadow-md">
      {/* Classic Ornamental Header */}
      <div className="text-center border-b-2 border-amber-900 pb-4 space-y-1">
        <div className="text-xs text-amber-800 font-bold tracking-widest">بسمه تعالی</div>
        <h1 className="text-2xl font-black text-amber-950 tracking-wide">{shopInfo.name}</h1>
        <p className="text-xs text-amber-900 italic">فروش انواع ابزارآلات و یراق‌آلات مرغوب و استاندارد</p>
        {options.includeAddressPhone && (
          <p className="text-[11px] text-amber-800">
            نشانی: {shopInfo.address} | تلفن: {toPersianDigits(shopInfo.phone)}
          </p>
        )}
      </div>

      {/* Invoice Meta */}
      <div className="flex justify-between items-center text-xs border-b border-amber-800 pb-2">
        <div>
          <span>خریدار محترم: </span>
          <strong className="text-sm">{invoice.customerName || invoice.supplierName || 'مشتری گرامی'}</strong>
        </div>
        <div className="text-left font-mono">
          <div>شماره صورتحساب: <strong>{invoice.invoiceNumber}</strong></div>
          <div>تاریخ: {toPersianDigits(invoice.date)}</div>
        </div>
      </div>

      {/* Items Table with Double Borders */}
      <table className="w-full text-right text-xs border-collapse border-2 border-amber-900">
        <thead className="bg-amber-100 text-amber-950 font-bold border-b-2 border-amber-900">
          <tr>
            <th className="p-2 border border-amber-800 text-center w-8">ردیف</th>
            <th className="p-2 border border-amber-800">شرح کالای درخواستی</th>
            <th className="p-2 border border-amber-800 text-center">مقدار</th>
            <th className="p-2 border border-amber-800 text-center">قیمت واحد (تومان)</th>
            <th className="p-2 border border-amber-800 text-center">مبلغ کل (تومان)</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={item.id} className="border-b border-amber-800">
              <td className="p-2 border border-amber-800 text-center">{toPersianDigits(idx + 1)}</td>
              <td className="p-2 border border-amber-800 font-bold">{item.productName}</td>
              <td className="p-2 border border-amber-800 text-center">{toPersianDigits(item.quantity)} {item.unit}</td>
              <td className="p-2 border border-amber-800 text-center font-mono">{formatToman(item.unitPrice).replace(' تومان', '')}</td>
              <td className="p-2 border border-amber-800 text-center font-bold font-mono">{formatToman(item.totalPrice).replace(' تومان', '')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-between items-start">
        <div>
          {options.includeBarcode && <BarcodeVisual value={invoice.invoiceNumber} />}
        </div>

        <div className="w-64 border-2 border-amber-900 p-3 bg-amber-50 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span>مجموع بها:</span>
            <span>{formatToman(invoice.subtotal)}</span>
          </div>
          {invoice.totalDiscount > 0 && (
            <div className="flex justify-between text-rose-800">
              <span>تخفیف:</span>
              <span>-{formatToman(invoice.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-amber-900 pt-1 text-sm text-amber-950">
            <span>مبلغ قابل وصول:</span>
            <span>{formatToman(invoice.finalTotal)}</span>
          </div>
          {invoice.remainingAmount > 0 && (
            <div className="flex justify-between text-rose-800 font-bold pt-1 border-t border-dashed border-amber-800">
              <span>مانده بدهکاری:</span>
              <span>{formatToman(invoice.remainingAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {options.includeSignatures && (
        <div className="pt-10 flex justify-between text-center text-xs text-amber-900">
          <div>محل مهر و امضای متصدی فروشگاه</div>
          <div>محل امضاء و دریافت کالا توسط خریدار</div>
        </div>
      )}

      <div className="text-center text-[11px] text-amber-900 pt-3 border-t border-amber-800 italic">
        اجناس فروخته شده پس از تأیید سلامت قابل تعویض می‌باشند · برکت در کسب حلال است
      </div>
    </div>
  );
};

// 5. Template 5: حرارتی ۸۰mm (Thermal 80mm)
export const ThermalTemplate: React.FC<TemplateProps> = ({ invoice, shopInfo, options }) => {
  return (
    <div className="p-4 bg-white text-black font-mono text-[11px] w-[300px] mx-auto space-y-2 border border-dashed border-black">
      {/* Thermal Header */}
      <div className="text-center border-b border-dashed border-black pb-2 space-y-1">
        <h2 className="text-sm font-black">{shopInfo.name}</h2>
        {options.includeAddressPhone && (
          <p className="text-[10px] leading-tight">
            {shopInfo.address}<br />تلفن: {toPersianDigits(shopInfo.phone)}
          </p>
        )}
        <div className="text-[10px] font-bold">
          شماره: {invoice.invoiceNumber}<br />
          {toPersianDigits(invoice.date)} - {toPersianDigits(invoice.time)}
        </div>
      </div>

      {/* Party */}
      <div className="border-b border-dashed border-black pb-1.5 text-[10px]">
        <div>مشتری: <strong>{invoice.customerName || invoice.supplierName || 'نقدی'}</strong></div>
        <div>صندوق‌دار: {invoice.createdByName}</div>
      </div>

      {/* Items List */}
      <div className="space-y-1.5 border-b border-dashed border-black pb-2">
        {invoice.items.map((item, idx) => (
          <div key={item.id} className="text-[10px]">
            <div className="flex justify-between font-bold">
              <span>{toPersianDigits(idx + 1)}. {item.productName}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>{toPersianDigits(item.quantity)} {item.unit} × {formatToman(item.unitPrice).replace(' تومان', '')}</span>
              <span className="font-bold text-black">{formatToman(item.totalPrice).replace(' تومان', '')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1 text-[11px] border-b border-dashed border-black pb-2">
        <div className="flex justify-between">
          <span>جمع:</span>
          <span>{formatToman(invoice.subtotal)}</span>
        </div>
        {invoice.totalDiscount > 0 && (
          <div className="flex justify-between">
            <span>تخفیف:</span>
            <span>-{formatToman(invoice.totalDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
          <span>قابل پرداخت:</span>
          <span>{formatToman(invoice.finalTotal)}</span>
        </div>
        {invoice.remainingAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span>مانده حساب:</span>
            <span>{formatToman(invoice.remainingAmount)}</span>
          </div>
        )}
      </div>

      {options.includeBarcode && (
        <div className="py-1">
          <BarcodeVisual value={invoice.invoiceNumber} />
        </div>
      )}

      <div className="text-center text-[10px] pt-1">
        از خرید شما متشکریم<br />
        ابزار حامی
      </div>
    </div>
  );
};

// Dispatcher component by template ID
export const InvoiceTemplateRenderer: React.FC<TemplateProps & { templateId: PrintTemplateId }> = ({
  templateId,
  ...rest
}) => {
  switch (templateId) {
    case 'simple':
      return <SimpleTemplate {...rest} />;
    case 'official':
      return <OfficialTemplate {...rest} />;
    case 'colorful':
      return <ColorfulTemplate {...rest} />;
    case 'classic':
      return <ClassicTemplate {...rest} />;
    case 'thermal':
      return <ThermalTemplate {...rest} />;
    default:
      return <OfficialTemplate {...rest} />;
  }
};

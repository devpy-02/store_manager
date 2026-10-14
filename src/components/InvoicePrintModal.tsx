import React, { useState, useRef } from 'react';
import { Invoice, ShopInfo, PrintTemplateId, User } from '../types';
import { PrintOptions, InvoiceTemplateRenderer } from './PrintTemplates';
import {
  exportInvoiceToWord,
  exportInvoiceToExcel,
  exportInvoiceToPDF,
  exportElementToImage,
} from '../utils/invoiceExport';
import { StorageService } from '../services/storageService';
import {
  Printer,
  X,
  FileText,
  FileSpreadsheet,
  Image,
  Share2,
  Check,
  Bluetooth,
  Wifi,
  Download,
  Copy,
  Sliders,
} from 'lucide-react';
import { toPersianDigits } from '../utils/jalali';

interface Props {
  invoice: Invoice | null;
  shopInfo: ShopInfo;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onOpenShare: (invoice: Invoice) => void;
}

export const InvoicePrintModal: React.FC<Props> = ({
  invoice,
  shopInfo,
  currentUser,
  isOpen,
  onClose,
  onOpenShare,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplateId>('official');
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    includeLogo: true,
    includeAddressPhone: true,
    includeSignatures: true,
    showProfit: false,
    includeBarcode: true,
  });

  const [printerType, setPrinterType] = useState<'system' | 'bluetooth' | 'wifi' | 'pdf' | 'share'>('system');
  const [copies, setCopies] = useState<number>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const templateOptions: { id: PrintTemplateId; label: string; desc: string }[] = [
    { id: 'simple', label: 'قالب ساده', desc: 'ساده و تک‌رنگ، مناسب پرینت سریع' },
    { id: 'official', label: 'قالب رسمی', desc: 'اداری، دارای سربرگ، کداقتصادی و امضا' },
    { id: 'colorful', label: 'قالب رنگی', desc: 'طراحی مدرن رنگی با گرادیانت' },
    { id: 'classic', label: 'قالب کلاسیک', desc: 'حاشیه سنتی و طرح کادر دوبل' },
    { id: 'thermal', label: 'قالب حرارتی ۸۰mm', desc: 'عرض کم ۸۰ میلی‌متر، شبیه فیش' },
  ];

  const handlePrint = () => {
    StorageService.logInvoicePrinted(invoice, templateOptions.find((t) => t.id === selectedTemplate)?.label || 'رسمی', currentUser);
    const src = previewContainerRef.current;
    if (!src) {
      window.print();
      return;
    }
    // فقط خود فاکتور را در انتهای صفحه کپی می‌کنیم و بقیه را موقع چاپ پنهان می‌کنیم
    const wrap = document.createElement('div');
    wrap.id = 'print-invoice-area';
    wrap.innerHTML = src.innerHTML;
    document.body.appendChild(wrap);
    document.body.classList.add('printing-invoice');
    const cleanup = () => {
      wrap.remove();
      document.body.classList.remove('printing-invoice');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  const handleSavePDF = async () => {
    if (!previewContainerRef.current) return;
    setIsExporting(true);
    setExportNotice('در حال آماده‌سازی فایل PDF...');
    try {
      await exportInvoiceToPDF(previewContainerRef.current, invoice);
      StorageService.logInvoiceExported(invoice, 'PDF', currentUser);
      setExportNotice('فایل PDF با موفقیت آماده شد.');
      setTimeout(() => setExportNotice(null), 3000);
    } catch {
      setExportNotice('خطا در ایجاد PDF');
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = () => {
    setIsExporting(true);
    try {
      exportInvoiceToWord(invoice, shopInfo);
      StorageService.logInvoiceExported(invoice, 'Word (.docx)', currentUser);
      setExportNotice('فایل Word با موفقیت دانلود شد.');
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      exportInvoiceToExcel(invoice, shopInfo);
      StorageService.logInvoiceExported(invoice, 'Excel (.xlsx)', currentUser);
      setExportNotice('فایل Excel با موفقیت دانلود شد.');
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImage = async (format: 'png' | 'jpg' = 'png') => {
    if (!previewContainerRef.current) return;
    setIsExporting(true);
    setExportNotice(`در حال آماده‌سازی تصویر ${format.toUpperCase()}...`);
    try {
      await exportElementToImage(previewContainerRef.current, invoice, format);
      StorageService.logInvoiceExported(invoice, `تصویر ${format.toUpperCase()}`, currentUser);
      setExportNotice(`تصویر با موفقیت در پوشه دانلودها ذخیره شد.`);
      setTimeout(() => setExportNotice(null), 3000);
    } catch {
      setExportNotice('خطا در تبدیل به تصویر');
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full min-w-0 max-w-6xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold">چاپ و پیش‌نمایش فاکتور</span>
            <span className="text-xs font-mono text-amber-400">({invoice.invoiceNumber})</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice banner if any */}
        {exportNotice && (
          <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Modal Body: Split into Settings (Left on desktop / Top on mobile) & Preview */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-4 sm:gap-5">
          {/* Controls & Settings Side Panel */}
          <div className="w-full lg:w-80 space-y-4 shrink-0 text-xs no-print">
            {/* 1. Template Selector */}
            <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                انتخاب قالب:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
                {templateOptions.map((tmpl) => {
                  const isActive = selectedTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`w-full text-right p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                        isActive
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${isActive ? 'border-white bg-white' : 'border-slate-400'}`}>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs">{tmpl.label}</div>
                        <div className={`text-[10px] mt-0.5 ${isActive ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'}`}>
                          {tmpl.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Print Settings Checkboxes */}
            <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                <span>تنظیمات چاپ:</span>
              </span>

              <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                <input
                  type="checkbox"
                  checked={printOptions.includeLogo}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeLogo: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-slate-700 dark:text-slate-300">☑ شامل لوگو</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                <input
                  type="checkbox"
                  checked={printOptions.includeAddressPhone}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeAddressPhone: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-slate-700 dark:text-slate-300">☑ شامل آدرس و تلفن</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                <input
                  type="checkbox"
                  checked={printOptions.includeSignatures}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeSignatures: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-slate-700 dark:text-slate-300">☑ شامل مهر و امضا</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                <input
                  type="checkbox"
                  checked={printOptions.showProfit}
                  onChange={(e) => setPrintOptions({ ...printOptions, showProfit: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-slate-700 dark:text-slate-300">☐ نمایش سود (فقط نسخه داخلی)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                <input
                  type="checkbox"
                  checked={printOptions.includeBarcode}
                  onChange={(e) => setPrintOptions({ ...printOptions, includeBarcode: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-slate-700 dark:text-slate-300">☑ شامل بارکد فاکتور (اختیاری)</span>
              </label>
            </div>

            {/* 3. Printer Options & Copies */}
            <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">چاپگر:</span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  onClick={() => setPrinterType('system')}
                  className={`p-2 rounded-xl border text-center transition-colors ${
                    printerType === 'system'
                      ? 'bg-amber-600 text-white border-amber-700 font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  چاپگر ویندوز / مرورگر
                </button>
                <button
                  onClick={() => setPrinterType('bluetooth')}
                  className={`p-2 rounded-xl border text-center transition-colors flex items-center justify-center gap-1 ${
                    printerType === 'bluetooth'
                      ? 'bg-amber-600 text-white border-amber-700 font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Bluetooth className="w-3 h-3" />
                  <span>Bluetooth</span>
                </button>
                <button
                  onClick={() => setPrinterType('wifi')}
                  className={`p-2 rounded-xl border text-center transition-colors flex items-center justify-center gap-1 ${
                    printerType === 'wifi'
                      ? 'bg-amber-600 text-white border-amber-700 font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Wifi className="w-3 h-3" />
                  <span>WiFi</span>
                </button>
                <button
                  onClick={() => {
                    setPrinterType('pdf');
                    handleSavePDF();
                  }}
                  className={`p-2 rounded-xl border text-center transition-colors ${
                    printerType === 'pdf'
                      ? 'bg-amber-600 text-white border-amber-700 font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  ذخیره به PDF
                </button>
              </div>

              {/* Number of Copies */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300">تعداد نسخه:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 font-bold flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="font-bold font-mono text-sm">{toPersianDigits(copies)}</span>
                  <button
                    onClick={() => setCopies(copies + 1)}
                    className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Export formats */}
            <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                خروجی با فرمت‌های مختلف:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={handleExportWord}
                  className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border border-blue-200 dark:border-blue-900"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Word (.docx)</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border border-emerald-200 dark:border-emerald-900"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>

                <button
                  onClick={() => handleExportImage('png')}
                  className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border border-purple-200 dark:border-purple-900"
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>تصویر (PNG)</span>
                </button>

                <button
                  onClick={() => onOpenShare(invoice)}
                  className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border border-amber-200 dark:border-amber-900"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>اشتراک‌گذاری</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Paper Box */}
          <div className="flex-1 min-w-0 w-full lg:w-auto bg-slate-200 dark:bg-slate-950/50 p-2 sm:p-4 rounded-2xl overflow-auto flex flex-col items-stretch justify-start border border-slate-300 dark:border-slate-800 min-h-[320px]">
            <div className="text-[11px] text-slate-500 mb-2 font-semibold flex items-center gap-1 no-print">
              <span>👁️ پیش‌نمایش چاپ:</span>
              <span className="text-amber-600 font-bold">
                ({templateOptions.find((t) => t.id === selectedTemplate)?.label})
              </span>
            </div>

            {/* Printable Frame Target */}
            <div
              ref={previewContainerRef}
              className="w-full min-w-0 flex-none bg-white text-slate-900 shadow-xl rounded-xl transition-all overflow-visible"
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
            >
              <div className="w-full min-w-0" style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                <InvoiceTemplateRenderer
                  templateId={selectedTemplate}
                  invoice={invoice}
                  shopInfo={shopInfo}
                  options={printOptions}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="p-4 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isExporting}
              className="min-h-[40px] px-5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ فاکتور</span>
            </button>

            <button
              onClick={handleSavePDF}
              disabled={isExporting}
              className="min-h-[40px] px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>ذخیره PDF</span>
            </button>

            <button
              onClick={() => onOpenShare(invoice)}
              className="min-h-[40px] px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-4 h-4 text-amber-500" />
              <span>اشتراک‌گذاری</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            لغو و بازگشت
          </button>
        </div>
      </div>
    </div>
  );
};

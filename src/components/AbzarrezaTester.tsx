import React, { useState } from 'react';
import {
  FlaskConical,
  Search,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertTriangle,
  Code,
  FileText,
  Clock,
  Layers,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  Eye,
  Sliders,
  DollarSign,
  Download,
  Info,
} from 'lucide-react';
import {
  AbzarrezaTestReport,
  AutoPricingSettings,
  RawProductCard,
  ParserTraceItem,
} from '../types';
import { AbzarrezaService, FALLBACK_ABZARREZA_CATALOG } from '../services/abzarrezaService';
import { formatToman, toPersianDigits } from '../utils/jalali';

interface Props {
  settings: AutoPricingSettings;
}

export const AbzarrezaTester: React.FC<Props> = ({ settings }) => {
  const [query, setQuery] = useState('DR-18V');
  const [searchType, setSearchType] = useState<'auto' | 'code' | 'name'>('auto');
  const [mode, setMode] = useState<'auto' | 'live' | 'simulation' | 'custom_html'>('auto');
  const [customHtml, setCustomHtml] = useState('');
  const [showCustomHtmlInput, setShowCustomHtmlInput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AbzarrezaTestReport | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'cards' | 'html' | 'trace'>('summary');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [htmlSearchTerm, setHtmlSearchTerm] = useState('');

  // Sample query presets
  const samplePresets = [
    { label: 'دریل ۱۸ ولت (کد)', query: 'DR-18V', type: 'code' as const },
    { label: 'رونیکس ۸۶۱۲ (نام)', query: 'دریل شارژی رونیکس ۸۶۱۲', type: 'name' as const },
    { label: 'پیچ‌گوشتی ۲۸۰W (کد)', query: 'SD-280', type: 'code' as const },
    { label: 'آچار فرانسه ۱۰ اینچ', query: 'آچار فرانسه ۱۰ اینچ', type: 'name' as const },
    { label: 'چکش ۵۰۰ گرمی', query: 'CH-010', type: 'code' as const },
    { label: 'مینی فرز رونیکس', query: 'مینی فرز ۸۵۰ وات', type: 'name' as const },
    { label: 'اینورتر جوشکاری', query: 'WD-015', type: 'code' as const },
  ];

  const handleRunTest = async (testQuery = query, testType = searchType, testMode = mode) => {
    if (!testQuery.trim() && testMode !== 'custom_html') return;
    setLoading(true);
    try {
      const res = await AbzarrezaService.runQuickTest({
        query: testQuery,
        searchType: testType,
        mode: testMode,
        customHtml: testMode === 'custom_html' ? customHtml : undefined,
        settings,
      });
      setReport(res);
      // If no cards in summary, set default tab appropriately
      if (res.productCards.length > 0 && !res.extractedProduct) {
        setActiveTab('cards');
      } else {
        setActiveTab('summary');
      }
    } catch {
      // Test error fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: typeof samplePresets[0]) => {
    setQuery(preset.query);
    setSearchType(preset.type);
    if (mode === 'custom_html') {
      setMode('auto');
      setShowCustomHtmlInput(false);
    }
    handleRunTest(preset.query, preset.type, 'auto');
  };

  const handleCopyHtml = () => {
    if (!report?.rawHtml) return;
    navigator.clipboard.writeText(report.rawHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleDownloadHtml = () => {
    if (!report?.rawHtml) return;
    const blob = new Blob([report.rawHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abzarreza_search_${encodeURIComponent(report.query || 'raw')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyDiagnostics = () => {
    if (!report) return;
    const text = [
      `=== گزارش تست پارسر ابزار رضا ===`,
      `عبارت جستجو: ${report.query}`,
      `نوع جستجو: ${report.searchType}`,
      `منبع پاسخ: ${report.source === 'live' ? 'زنده (abzarreza.com)' : report.source === 'simulation' ? 'شبیه‌ساز کاتالوگ' : 'کد دستی'}`,
      `زمان پاسخ: ${report.responseTimeMs} ms`,
      `حجم HTML: ${report.rawHtmlLength} کاراکتر`,
      `آدرس جستجو: ${report.searchUrl}`,
      `تعداد کارت‌های پیدا شده: ${report.productCards.length}`,
      `محصول استخراج شده: ${report.extractedProduct?.title || 'یافت نشد'}`,
      `کد استخراج شده: ${report.extractedProduct?.code || '---'}`,
      `قیمت تک استخراج شده: ${report.extractedProduct?.retailPrice?.toLocaleString() || '---'} تومان`,
      `قیمت عمده استخراج شده: ${report.extractedProduct?.wholesalePrice?.toLocaleString() || '---'} تومان`,
      `قیمت فروش پیشنهادی: ${report.calculatedSellPrice?.toLocaleString() || '---'} تومان`,
      `چک‌لیست صحت:`,
      `- کارت‌ها: ${report.checklist.cardsFound ? 'OK' : 'FAIL'}`,
      `- عنوان: ${report.checklist.titleExtracted ? 'OK' : 'FAIL'}`,
      `- قیمت تک: ${report.checklist.retailPriceExtracted ? 'OK' : 'FAIL'}`,
      `- قیمت عمده: ${report.checklist.wholesalePriceExtracted ? 'OK' : 'FAIL'}`,
      `- کد کالا: ${report.checklist.codeExtracted ? 'OK' : 'FAIL'}`,
      `- تبدیل اعداد فارسی: ${report.checklist.persianDigitsConverted ? 'OK' : 'FAIL'}`,
      `- محاسبه سود: ${report.checklist.sellPriceCalculated ? 'OK' : 'FAIL'}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border-2 border-amber-500/30 dark:border-amber-500/20 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>ابزار تست سریع و اعتبارسنجی پارسر ابزار رضا</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                Quick Parser Tester
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              نام یا کد کالا را وارد کنید تا نتایج خام جستجوی سایت abzarreza.com، کارت‌ها، قیمت‌ها و عملکرد پارسرها را مشاهده و بررسی کنید.
            </p>
          </div>
        </div>

        {report && (
          <button
            onClick={handleCopyDiagnostics}
            className="px-2.5 py-1 text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1.5 self-start sm:self-auto font-medium transition-colors"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? 'گزارش کپی شد' : 'کپی گزارش خطایابی'}</span>
          </button>
        )}
      </div>

      {/* Preset sample buttons */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>تست فوری با نمونه‌های آماده ابزار رضا:</span>
          </span>
          <span className="text-[10px] text-slate-400">برای تست ۱-کلیک کنید</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {samplePresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                query === preset.query
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs Form */}
      <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Query input */}
          <div className="sm:col-span-6">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              نام یا کد کالا در ابزار رضا:
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRunTest())}
                placeholder="مثال: DR-18V یا دریل شارژی رونیکس..."
                className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Search type */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              روش جستجو:
            </label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none"
            >
              <option value="auto">تشخیص هوشمند (Auto)</option>
              <option value="code">فقط با کد کالا (Code)</option>
              <option value="name">فقط با نام کالا (Name)</option>
            </select>
          </div>

          {/* Mode selector */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              حالت داده / استعلام:
            </label>
            <select
              value={mode}
              onChange={(e) => {
                const val = e.target.value as any;
                setMode(val);
                setShowCustomHtmlInput(val === 'custom_html');
              }}
              className="w-full px-2.5 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none"
            >
              <option value="auto">زنده با پشتیبان خودکار (Auto)</option>
              <option value="live">اتصال زنده فقط (Live Proxy)</option>
              <option value="simulation">شبیه‌ساز کاتالوگ ابزار رضا</option>
              <option value="custom_html">ورود دستی کد HTML خام</option>
            </select>
          </div>
        </div>

        {/* Custom HTML Textarea if selected */}
        {showCustomHtmlInput && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-amber-500" />
                <span>کد HTML خام سفارشی جهت بررسی پارسر:</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setCustomHtml(AbzarrezaService.generateRealisticSearchResultsHtml(query || 'دریل'))
                  }
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                >
                  درج HTML نمونه صفحه جستجو
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() =>
                    setCustomHtml(AbzarrezaService.generateRealisticProductHtml(FALLBACK_ABZARREZA_CATALOG[0]))
                  }
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                >
                  درج HTML نمونه صفحه محصول
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={customHtml}
              onChange={(e) => setCustomHtml(e.target.value)}
              placeholder="کد HTML صفحه جستجو یا صفحه محصول سایت ابزار رضا را اینجا پیست (Paste) کنید..."
              className="w-full p-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono ltr text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            آدرس هدف: <span className="text-amber-600 dark:text-amber-400 ltr inline-block">https://abzarreza.com/?s={encodeURIComponent(query || '')}&post_type=product</span>
          </div>

          <div className="flex items-center gap-2">
            {report && (
              <button
                type="button"
                onClick={() => setReport(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 rounded-xl transition-colors"
              >
                پاک کردن نتایج
              </button>
            )}

            <button
              type="button"
              onClick={() => handleRunTest()}
              disabled={loading || (!query.trim() && mode !== 'custom_html')}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال استعلام و اجرای پارسر...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>اجرای تست و استعلام پارسر</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Container */}
      {report && (
        <div className="space-y-3.5 animate-in fade-in duration-300">
          {/* Status & Metrics Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>وضعیت HTTP: {toPersianDigits(report.httpStatus)}</span>
              </span>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Info className="w-3 h-3" />
                <span>
                  منبع:{' '}
                  {report.source === 'live'
                    ? 'اتصال زنده (abzarreza.com)'
                    : report.source === 'custom_html'
                    ? 'کد HTML دستی'
                    : 'شبیه‌ساز کاتالوگ ابزار رضا'}
                </span>
              </span>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>زمان پاسخ: {toPersianDigits(report.responseTimeMs)} میلی‌ثانیه</span>
              </span>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                حجم HTML: {toPersianDigits(Math.round(report.rawHtmlLength / 1024))} کیلوبایت ({toPersianDigits(report.rawHtmlLength)} کاراکتر)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={report.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>مشاهده در ابزار رضا</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Parser Health & Accuracy Checklist (صحت عملکرد پارسرها) */}
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>چک‌لیست صحت عملکرد پارسرها (Parser Validation Checklist):</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {toPersianDigits(
                  Object.values(report.checklist).filter(Boolean).length
                )}{' '}
                از {toPersianDigits(Object.keys(report.checklist).length)} مؤلفه فعال
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div
                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                  report.checklist.cardsFound
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
              >
                {report.checklist.cardsFound ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                <span>کارت‌های محصول ({toPersianDigits(report.productCards.length)})</span>
              </div>

              <div
                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                  report.checklist.titleExtracted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
              >
                {report.checklist.titleExtracted ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                <span>عنوان کالا (h1 / Title)</span>
              </div>

              <div
                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                  report.checklist.retailPriceExtracted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
              >
                {report.checklist.retailPriceExtracted ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                <span>قیمت تک (Regex & DOM)</span>
              </div>

              <div
                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                  report.checklist.wholesalePriceExtracted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
              >
                {report.checklist.wholesalePriceExtracted ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                <span>قیمت عمده (همکار)</span>
              </div>

              <div
                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                  report.checklist.codeExtracted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                }`}
              >
                {report.checklist.codeExtracted ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                <span>کد و شناسه (SKU)</span>
              </div>

              <div
                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                  report.checklist.availabilityExtracted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
              >
                {report.checklist.availabilityExtracted ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                <span>وضعیت موجودی انبار</span>
              </div>

              <div
                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                  report.checklist.persianDigitsConverted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
              >
                {report.checklist.persianDigitsConverted ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                <span>تبدیل ارقام فارسی به انگلیسی</span>
              </div>

              <div
                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                  report.checklist.sellPriceCalculated
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
              >
                {report.checklist.sellPriceCalculated ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                <span>محاسبه و گرد کردن قیمت فروش</span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`pb-2 px-3 text-xs font-bold transition-colors border-b-2 ${
                activeTab === 'summary'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              📊 نتیجه استخراج شده و سود فروش
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`pb-2 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'cards'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <span>📦 کارت‌های پیدا شده در صفحه</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-750">
                {toPersianDigits(report.productCards.length)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('html')}
              className={`pb-2 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'html'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>کد HTML خام دریافتی</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trace')}
              className={`pb-2 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'trace'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <span>🔬 مراحل خطایابی پارسر (Trace)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-750">
                {toPersianDigits(report.traces.length)}
              </span>
            </button>
          </div>

          {/* TAB 1: SUMMARY & PRICING */}
          {activeTab === 'summary' && (
            <div className="space-y-3">
              {report.extractedProduct ? (
                <div className="p-4 bg-gradient-to-br from-white to-amber-50/40 dark:from-slate-800 dark:to-slate-850 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 shadow-xs space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        ✅ محصول با موفقیت پارس و تطبیق یافت
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                        {report.extractedProduct.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        شناسه کالا: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{report.extractedProduct.code || 'نامشخص'}</span> ·{' '}
                        وضعیت: <span className="text-emerald-600 font-medium">{report.extractedProduct.availability || 'موجود در انبار'}</span> ·{' '}
                        نوع تطابق: <span className="text-amber-600 font-medium">{report.extractedProduct.matchedBy === 'code' ? 'بر اساس کد دقیق' : report.extractedProduct.matchedBy === 'name' ? 'بر اساس نام دقیق' : 'تطابق هوشمند'}</span>
                      </p>
                    </div>

                    <a
                      href={report.extractedProduct.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                    >
                      <span>مشاهده صفحه کالا</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Pricing Comparison Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                        قیمت عمده استخراج شده (خرید):
                      </span>
                      <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                        {report.extractedProduct.wholesalePrice
                          ? `${formatToman(report.extractedProduct.wholesalePrice)} تومان`
                          : 'نامشخص'}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        مبنای محاسبه قیمت خرید فروشگاه
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                        قیمت تک استخراج شده (مصرف‌کننده):
                      </span>
                      <div className="text-base font-extrabold text-slate-700 dark:text-slate-300 tabular-nums">
                        {report.extractedProduct.retailPrice
                          ? `${formatToman(report.extractedProduct.retailPrice)} تومان`
                          : 'نامشخص'}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        قیمت درج‌شده در سایت برای تک‌فروشی
                      </span>
                    </div>

                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 block mb-1 font-bold">
                        قیمت فروش پیشنهادی سیستم:
                      </span>
                      <div className="text-base font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                        {report.calculatedSellPrice
                          ? `${formatToman(report.calculatedSellPrice)} تومان`
                          : 'نامشخص'}
                      </div>
                      <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 block">
                        با احتساب {toPersianDigits(settings.defaultProfitValue)}٪ سود (گرد شده)
                      </span>
                    </div>
                  </div>

                  {/* Profit breakdown note */}
                  <div className="p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        سود ناخالص هر عدد: <strong className="text-emerald-600">{report.profitAmount ? formatToman(report.profitAmount) : '۰'} تومان</strong> ({toPersianDigits(report.profitPercent || 0)}٪)
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      قاعده گرد کردن: نزدیک‌ترین {toPersianDigits(settings.roundToNearest)} تومان
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    هیچ کالای مستقیمی با این عبارت تطبیق قطعی نیافت
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    می‌توانید تب «کارت‌های پیدا شده» را بررسی کنید تا ببینید آیا در صفحه کارت‌هایی یافت شده است، یا نام و کد دیگری را جستجو نمایید.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CARDS PARSED */}
          {activeTab === 'cards' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>تعداد کارت‌های استخراج شده با سلکتورهای Part 5: <strong>{toPersianDigits(report.productCards.length)}</strong></span>
                <span className="text-[11px]">سلکتورها: .product, .product-item, article.product, li.product</span>
              </div>

              {report.productCards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {report.productCards.map((card, idx) => {
                    const isBest = report.bestMatchCard?.id === card.id || idx === 0;
                    return (
                      <div
                        key={card.id || idx}
                        className={`p-3 rounded-xl border transition-all ${
                          isBest
                            ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 shadow-xs ring-1 ring-amber-400/50'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isBest && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                                  ⭐ بهترین تطابق (Best Match)
                                </span>
                              )}
                              {card.code && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                  کد: {card.code}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                امتیاز: {toPersianDigits(card.matchScore)} ({card.matchedBy})
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                              {card.title}
                            </h5>
                          </div>

                          {card.imageUrl && (
                            <img
                              src={card.imageUrl}
                              alt={card.title}
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          )}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {card.priceValue ? `${formatToman(card.priceValue)} تومان` : card.priceText || 'بدون قیمت'}
                          </span>

                          {card.url && (
                            <a
                              href={card.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-amber-600 hover:underline flex items-center gap-1"
                            >
                              <span>مشاهده لینک</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center text-xs text-slate-500">
                  هیچ کارتی با کلاس‌های محصول در این کد HTML شناسایی نشد.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RAW HTML INSPECTOR */}
          {activeTab === 'html' && (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    اندازه: <strong>{toPersianDigits(report.rawHtmlLength)}</strong> کاراکتر
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      value={htmlSearchTerm}
                      onChange={(e) => setHtmlSearchTerm(e.target.value)}
                      placeholder="فیلتر متن درون HTML..."
                      className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none w-44"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyHtml}
                    className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHtml ? 'کپی شد' : 'کپی کل HTML'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadHtml}
                    className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود فایل HTML</span>
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-200 font-mono text-[11px] ltr p-3 max-h-96 overflow-auto whitespace-pre-wrap select-all">
                {htmlSearchTerm
                  ? report.rawHtml
                      .split('\n')
                      .filter((line) => line.toLowerCase().includes(htmlSearchTerm.toLowerCase()))
                      .join('\n') || `--- موردی با عبارت "${htmlSearchTerm}" در کد HTML یافت نشد ---`
                  : report.rawHtml}
              </div>
            </div>
          )}

          {/* TAB 4: TRACE & LOGS */}
          {activeTab === 'trace' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                مراحل موشکافانه اجرای سلکتورهای CSS و الگوهای عبارات منظم (Regex) روی داده‌های دریافتی:
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">مرحله / هدف</th>
                      <th className="p-2.5">الگو / سلکتور</th>
                      <th className="p-2.5">داده خام یافته‌شده</th>
                      <th className="p-2.5">خروجی پارس شده</th>
                      <th className="p-2.5 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850">
                    {report.traces.map((trace, idx) => (
                      <tr key={trace.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {trace.stage}
                          {trace.details && (
                            <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                              {trace.details}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 ltr text-left">
                          {trace.target}
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {trace.foundRaw || '---'}
                        </td>
                        <td className="p-2.5 font-bold text-amber-600 dark:text-amber-400 max-w-xs truncate">
                          {trace.parsedOutput !== null && trace.parsedOutput !== undefined
                            ? String(trace.parsedOutput)
                            : '---'}
                        </td>
                        <td className="p-2.5 text-center">
                          {trace.status === 'success' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              موفق
                            </span>
                          ) : trace.status === 'fallback' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              جایگزین
                            </span>
                          ) : trace.status === 'not_found' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                              نیافت
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                              خطا
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

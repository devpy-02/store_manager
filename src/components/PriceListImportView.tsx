import React, { useMemo, useState } from 'react';
import { FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Product, User } from '../types';
import { StorageService } from '../services/storageService';
import { parsePriceListLines, parseSpreadsheetFile, matchRows, MatchResult, PriceListRow } from '../utils/priceListParser';
import { extractPdfLines } from '../utils/pdfText';
import { toPersianDigits, formatToman } from '../utils/jalali';

interface Props {
  products: Product[];
  currentUser: User;
  onChanged: () => void;
}

interface Sel {
  include: boolean;
  productId: string | null;
}
type PricingMode = 'buy_only' | 'buy_profit' | 'file_both' | 'sell_profit';
interface PricePlanItem { productId: string; code: string; newBuy?: number; newSell?: number; recalcSell?: boolean; }

const STATUS_LABEL: Record<string, string> = {
  exact: 'کد دقیق',
  sure: 'مطمئن',
  maybe: 'مشکوک',
  none: 'بدون تطبیق',
};
const STATUS_COLOR: Record<string, string> = {
  exact: 'bg-emerald-100 text-emerald-800',
  sure: 'bg-emerald-50 text-emerald-700',
  maybe: 'bg-amber-100 text-amber-800',
  none: 'bg-slate-200 text-slate-700',
};

// ورود لیست قیمت PDF تامین‌کننده: تطبیق با کالاها، پیش‌نمایش، و اعمال قیمت خرید (عمده)
export const PriceListImportView: React.FC<Props> = ({ products, currentUser, onChanged }) => {
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [sel, setSel] = useState<Sel[]>([]);
  const [filter, setFilter] = useState<'all' | 'sure' | 'maybe' | 'none'>('all');
  const [result, setResult] = useState('');
  const [pricingMode, setPricingMode] = useState<PricingMode>('buy_profit');

  const active = useMemo(
    () => products.filter((p) => !p.deleted).sort((a, b) => a.name.localeCompare(b.name, 'fa')),
    [products]
  );

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setResult('');
    setFileName(file.name);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let rows: PriceListRow[] = [];
      let lines: string[] = [];
      if (ext === 'pdf' || file.type === 'application/pdf') {
        lines = await extractPdfLines(file);
        rows = parsePriceListLines(lines);
        setDebugLines(lines.slice(0, 15));
        if (rows.length === 0) {
          setError('هیچ ردیف کالایی در این فایل پیدا نشد. مطمئن شو PDF متنی است (نه اسکن عکس). برای فایل اسکن‌شده باید OCR اضافه شود.');
          setMatches([]);
          setSel([]);
          return;
        }
      } else if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
        rows = await parseSpreadsheetFile(file);
        setDebugLines([]);
        if (rows.length === 0) {
          setError('در فایل هیچ ردیف کالایی پیدا نشد. ستون نام/کد کالا و دست‌کم یکی از ستون‌های قیمت را بررسی کن.');
          setMatches([]);
          setSel([]);
          return;
        }
      } else {
        throw new Error('نوع فایل پشتیبانی نمی‌شود. فقط PDF، Excel (.xlsx/.xls) و CSV مجاز است.');
      }
      const m = matchRows(rows, active);
      setMatches(m);
      setSel(
        m.map((x) => ({
          include: (x.status === 'exact' || x.status === 'sure') && !x.row.duplicate,
          productId: x.productId,
        }))
      );
      setDebugLines(lines.slice(0, 15));
    } catch (e: any) {
      setError('خواندن فایل انجام نشد: ' + (e?.message || 'خطای ناشناخته')); 
    } finally {
      setBusy(false);
    }
  };

  const shown = matches
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => filter === 'all' || m.status === filter || (filter === 'sure' && m.status === 'exact'))
    .slice(0, 200);

  const counts = useMemo(() => {
    const c = { exact: 0, sure: 0, maybe: 0, none: 0 };
    matches.forEach((m) => { c[m.status]++; });
    return c;
  }, [matches]);

  // پیش‌نمایش قیمت‌های هدف بر اساس روش انتخاب‌شده
  const previewFor = (m: MatchResult, i: number) => {
    const chosenId = sel[i]?.productId;
    const product = chosenId ? active.find((p) => p.id === chosenId) : undefined;
    if (!product) return { buy: pricingMode === 'sell_profit' ? null : m.row.wholesale, sell: pricingMode === 'file_both' ? m.row.retail : null, note: '' };
    if (pricingMode === 'sell_profit') {
      if (!product.buyPrice || product.buyPrice <= 0) return { buy: null, sell: null, note: 'قیمت خرید ثبت نشده' };
      const profit = StorageService.effectiveProfit(product);
      if (!profit) return { buy: null, sell: null, note: 'سود کالا/تگ/بازه تعریف نشده' };
      return { buy: null, sell: StorageService.calcNewPrice(product.buyPrice, profit.type, profit.value), note: 'محاسبه از قیمت خرید فعلی' };
    }
    if (pricingMode === 'buy_profit' && m.row.wholesale != null) {
      const profit = StorageService.effectiveProfit({ ...product, buyPrice: m.row.wholesale });
      return { buy: m.row.wholesale, sell: profit ? StorageService.calcNewPrice(m.row.wholesale, profit.type, profit.value) : null, note: profit ? 'فروش بر اساس سود تعریف‌شده' : 'سود تعریف نشده؛ فروش تغییر نمی‌کند' };
    }
    return { buy: m.row.wholesale, sell: pricingMode === 'file_both' ? m.row.retail : null, note: '' };
  };

  // برنامهٔ نهایی تغییرات؛ هر کالا فقط یک‌بار وارد برنامه می‌شود.
  const buildPlan = (): PricePlanItem[] => {
    const seen = new Set<string>();
    const plan: PricePlanItem[] = [];
    matches.forEach((m, i) => {
      const s = sel[i];
      if (!s || !s.include || !s.productId || seen.has(s.productId)) return;
      const product = active.find((p) => p.id === s.productId);
      if (!product) return;
      seen.add(s.productId);
      const item: PricePlanItem = { productId: s.productId, code: m.row.code };
      if (pricingMode === 'buy_only' || pricingMode === 'buy_profit' || pricingMode === 'file_both') {
        if (m.row.wholesale != null && m.row.wholesale > 0) item.newBuy = m.row.wholesale;
      }
      if (pricingMode === 'file_both') {
        if (m.row.retail != null && m.row.retail > 0) item.newSell = m.row.retail;
      } else if (pricingMode === 'sell_profit') {
        if (product.buyPrice && product.buyPrice > 0) {
          const profit = StorageService.effectiveProfit(product);
          if (profit) item.newSell = StorageService.calcNewPrice(product.buyPrice, profit.type, profit.value);
        }
      } else if (pricingMode === 'buy_profit' && item.newBuy != null) {
        item.recalcSell = true;
      }
      if (item.newBuy == null && item.newSell == null && !item.recalcSell) return;
      plan.push(item);
    });
    return plan;
  };

  const apply = (plan: PricePlanItem[]) => {
    let buyChanged = 0;
    let sellChanged = 0;
    let skipped = 0;
    const productsNow = StorageService.getProducts();
    const nowIso = new Date().toISOString();
    plan.forEach((it) => {
      const idx = productsNow.findIndex((p) => p.id === it.productId);
      if (idx < 0) { skipped++; return; }
      const current = productsNow[idx];
      let updated = { ...current };
      if (it.newBuy != null && it.newBuy > 0 && it.newBuy !== current.buyPrice) {
        updated.buyPrice = it.newBuy;
        buyChanged++;
      }
      if (it.recalcSell && it.newBuy != null && it.newBuy > 0) {
        const profit = StorageService.effectiveProfit({ ...updated, buyPrice: it.newBuy });
        if (profit) {
          const target = StorageService.calcNewPrice(it.newBuy, profit.type, profit.value);
          if (target !== current.price) { updated.price = target; updated.sellPrice = target; sellChanged++; }
        }
      } else if (it.newSell != null && it.newSell > 0 && it.newSell !== current.price) {
        updated.price = it.newSell;
        updated.sellPrice = it.newSell;
        sellChanged++;
      }
      if (!it.code.startsWith('ROW') && it.code && it.code !== current.supplierCode) updated.supplierCode = it.code;
      if (updated.buyPrice !== current.buyPrice || updated.price !== current.price) {
        updated.updatedAt = nowIso;
        updated.updatedBy = currentUser.id;
        updated.updatedByName = currentUser.name;
        updated.version = (current.version || 1) + 1;
        StorageService.addAuditLog({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          productId: current.id,
          productName: current.name,
          changeType: 'price_update',
          oldValue: `خرید: ${current.buyPrice ?? 'ثبت‌نشده'}؛ فروش: ${current.price}`,
          newValue: `خرید: ${updated.buyPrice ?? 'ثبت‌نشده'}؛ فروش: ${updated.price} (ورود فایل قیمت)`,
          changedBy: currentUser.id,
          changedByName: currentUser.name,
          changedAt: nowIso,
          synced: !StorageService.isSimulatedOffline(),
        });
      }
      if (updated.buyPrice !== current.buyPrice || updated.price !== current.price || updated.supplierCode !== current.supplierCode) productsNow[idx] = updated;
    });
    StorageService.saveProducts(productsNow);
    setResult(
      `قیمت خرید ${toPersianDigits(buyChanged)} کالا و قیمت فروش ${toPersianDigits(sellChanged)} کالا تغییر کرد.` +
      (skipped ? ` ${toPersianDigits(skipped)} کالا به دلیل پیدا نشدن در انبار رد شد.` : '')
    );
    onChanged();
  };

  const startApply = () => {
    setResult('');
    const plan = buildPlan();
    if (!plan.length) {
      setError('هیچ کالای قابل‌اعمالی انتخاب نشده است. ستون قیمت مناسب روش انتخاب‌شده و قیمت خرید/سود تعریف‌شده را بررسی کن.');
      return;
    }
    setError('');
    // برای حالت محاسبه بر اساس سود، پیش‌نمایش هدف در خود جدول نشان داده می‌شود و با تأیید اعمال می‌شود.
    apply(plan);
  };

  const box = 'bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3';
  const input = 'w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-gradient-to-r from-sky-700 to-blue-800 text-white p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 p-2 rounded-xl"><FileText className="w-6 h-6" /></span>
          <h2 className="text-lg font-extrabold">ورود فایل لیست قیمت</h2>
        </div>
        <p className="text-xs text-sky-100 mt-1">فایل PDF، Excel یا CSV را وارد کن؛ تطبیق کالا ابتدا با کد و سپس با نام انجام می‌شود.</p>
      </div>

      <div className={box}>
        <label className="block text-xs font-bold">روش به‌روزرسانی قیمت</label>
        <select value={pricingMode} onChange={(e) => setPricingMode(e.target.value as PricingMode)} className={input}>
          <option value="buy_profit">قیمت خرید از فایل + محاسبه قیمت فروش بر اساس سود تعریف‌شده</option>
          <option value="buy_only">فقط به‌روزرسانی قیمت خرید؛ قیمت فروش بدون تغییر</option>
          <option value="file_both">ثبت قیمت خرید و فروش مستقیماً از فایل</option>
          <option value="sell_profit">محاسبه قیمت فروش از قیمت خرید فعلی و سود تعریف‌شده</option>
        </select>
        <p className="text-[11px] text-slate-500">برای حالت «مستقیماً از فایل»، فایل باید ستون قیمت خرید/عمده و قیمت فروش/تک داشته باشد. سود کالا می‌تواند از تنظیمات خود کالا، تگ یا بازهٔ سود خوانده شود.</p>
        <input
          type="file"
          accept="application/pdf,.pdf,.xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="w-full text-xs"
        />
        {busy && <p className="text-xs text-slate-500">در حال خواندن فایل {fileName}...</p>}
        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {result && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{result}</span>
          </div>
        )}
      </div>

      {matches.length > 0 && (
        <>
          <div className={box}>
            <p className="text-xs font-bold">
              {toPersianDigits(matches.length)} ردیف از «{fileName}» · کد دقیق {toPersianDigits(counts.exact)} · مطمئن {toPersianDigits(counts.sure)} · مشکوک {toPersianDigits(counts.maybe)} · بدون تطبیق {toPersianDigits(counts.none)}
            </p>
            <div className="flex gap-1.5 flex-wrap text-[11px]">
              {(['all', 'sure', 'maybe', 'none'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg font-bold ${filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
                >
                  {f === 'all' ? 'همه' : f === 'sure' ? 'مطمئن' : f === 'maybe' ? 'مشکوک' : 'بدون تطبیق'}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {shown.map(({ m, i }) => (
                <div key={i} className={`p-2 rounded-xl border text-[11px] space-y-1.5 ${m.row.duplicate ? 'border-rose-300' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={!!sel[i]?.include}
                        onChange={(e) => setSel((s) => s.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))}
                      />
                      <span className="font-bold truncate">{m.row.name}</span>
                    </label>
                    <span className={`px-1.5 py-0.5 rounded-md font-bold shrink-0 ${STATUS_COLOR[m.status]}`}>{STATUS_LABEL[m.status]}</span>
                  </div>
                  <div className="text-slate-500">
                    کد {m.row.code}{m.row.wholesale != null ? ` · خرید/عمده ${formatToman(m.row.wholesale)}` : ''}
                    {m.row.minQty ? ` (خرید بالای ${toPersianDigits(m.row.minQty)} عدد)` : ''}
                    {m.row.retail != null ? ` · فروش/تک ${formatToman(m.row.retail)}` : ''}
                    {(() => { const pv = previewFor(m, i); return pv.sell != null ? ` · فروش هدف ${formatToman(pv.sell)}` : ''; })()}
                    {(() => { const pv = previewFor(m, i); return pv.note ? ` · ${pv.note}` : ''; })()}
                    {(() => { const p = active.find((x) => x.id === sel[i]?.productId); return p ? ` · فعلی: خرید ${p.buyPrice != null ? formatToman(p.buyPrice) : 'ثبت‌نشده'} / فروش ${formatToman(p.price)}` : ''; })()}
                    {m.row.duplicate && <span className="text-rose-600 font-bold"> · کد تکراری در فایل</span>}
                  </div>
                  <select
                    value={sel[i]?.productId || ''}
                    onChange={(e) => setSel((s) => s.map((x, j) => (j === i ? { ...x, productId: e.target.value || null } : x)))}
                    className={input}
                  >
                    <option value="">— کالای انبار را انتخاب کن —</option>
                    {active.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.buyPrice ? ` (خرید فعلی ${formatToman(p.buyPrice)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {matches.length > 200 && shown.length === 200 && (
                <p className="text-[11px] text-slate-500">فقط ۲۰۰ ردیف اول نمایش داده می‌شود. با فیلتر، بقیه را ببین.</p>
              )}
            </div>

            <button type="button" onClick={startApply} className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold">
              اعمال قیمت‌های انتخاب‌شده
            </button>
          </div>
        </>
      )}

      {debugLines.length > 0 && (
        <details className={box}>
          <summary className="text-xs font-bold cursor-pointer">متن خوانده‌شده از PDF (برای بررسی)</summary>
          <div className="mt-2 space-y-1 text-[10px] font-mono text-slate-600 dark:text-slate-300 break-words">
            {debugLines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </details>
      )}

    </div>
  );
};

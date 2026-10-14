import React, { useMemo, useState } from 'react';
import { Tags, Plus, Pencil, Trash2, Check, X, Search } from 'lucide-react';
import { Product, ProductTag, User, TagKind } from '../types';
import { PriorityList } from './PriorityList';
import { StorageService } from '../services/storageService';
import { buildTree } from '../utils/treeUtils';
import { TreeView, useTreeExpansion, RowMeta } from './TreeView';
import { toEnglishDigits, toPersianDigits, formatToman } from '../utils/jalali';

interface Props {
  products: Product[];
  currentUser: User;
  onChanged: () => void;
}

const box = 'bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3';
const input = 'w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';

// تگ‌ها: ساخت درختی، تگ‌زدن به کالاها با جستجوی زنده، و تغییر قیمت گروهی با پیش‌نمایش
// اولویت گروه‌های سود: کاربر با کشیدن ترتیب می‌دهد
export const ProfitPriorityEditor: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [ids, setIds] = useState(() => StorageService.getProfitPriority());
  const tags = StorageService.getTags();
  const items = ids.map((id) => ({ id, label: tags.find((t) => t.id === id)?.name || '—' }));
  const handleChange = (next: string[]) => {
    StorageService.setProfitPriority(next);
    setIds(next);
    onChanged();
  };
  return (
    <div className={box}>
      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">اولویت گروه‌های سود</h3>
      <p className="text-[11px] text-slate-500">
        اگر کالایی از چند گروه سود تگ داشته باشد، گروهی که بالاتر است برنده می‌شود. با گرفتن ☰ و کشیدن، ترتیب را عوض کن.
      </p>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-500">هنوز گروه سودی نساخته‌ای. یک تگ اصلی از نوع «گروه سود» بساز.</p>
      ) : (
        <PriorityList items={items} onChange={handleChange} />
      )}
    </div>
  );
};

// انواع تگ: کاربر نوع می‌سازد و مشخص می‌کند نوع سودساز باشد یا نه
export const TagTypesEditor: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [types, setTypes] = useState(() => StorageService.getTagTypes());
  const [name, setName] = useState('');
  const [drives, setDrives] = useState(false);
  const [msg, setMsg] = useState('');

  const add = () => {
    if (!name.trim()) return;
    StorageService.addTagType(name, drives);
    setTypes(StorageService.getTagTypes());
    setName('');
    setDrives(false);
    onChanged();
  };

  const del = (id: string) => {
    const r = StorageService.deleteTagType(id);
    setMsg(r.ok ? '' : r.reason || '');
    setTypes(StorageService.getTagTypes());
    onChanged();
  };

  return (
    <div className={box}>
      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">انواع تگ</h3>
      <p className="text-[11px] text-slate-500">هر نوع تگ را خودت بساز. مثلاً «تامین‌کننده» یا «شهر». فقط نوعی که «روی سود اثر دارد» را تیک بزن، مثل «گروه سود».</p>
      <div className="space-y-1">
        {types.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
            <span>
              {t.name} {t.drivesProfit && <span className="text-[10px] text-amber-700 font-bold">(سودساز)</span>}
            </span>
            <button type="button" onClick={() => del(t.id)} className="text-rose-600 font-bold">حذف</button>
          </div>
        ))}
      </div>
      {msg && <p className="text-[11px] text-rose-600">{msg}</p>}
      <div className="flex gap-1.5 items-center text-xs min-w-0">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام نوع، مثلاً شهر" className={input + ' min-w-0 flex-1 min-h-11 px-3 text-sm'} />
        <label className="flex items-center gap-1 shrink-0">
          <input type="checkbox" checked={drives} onChange={(e) => setDrives(e.target.checked)} />
          سودساز
        </label>
      </div>
      <button type="button" onClick={add} className="w-full py-2 rounded-xl bg-amber-600 text-white text-xs font-bold">افزودن نوع</button>
    </div>
  );
};

// بازه‌های قیمت خرید: برای کالاهایی که نه سود خودشان و نه سود تگ دارند
export const BandsEditor: React.FC = () => {
  const [bands, setBands] = useState(() => StorageService.getProfitBands());
  const [minB, setMinB] = useState('');
  const [maxB, setMaxB] = useState('');
  const [pType, setPType] = useState<'percent' | 'amount'>('percent');
  const [pVal, setPVal] = useState('');
  const num = (v: string) => Number(toEnglishDigits(v).replace(/[^0-9]/g, ''));
  const sorted = [...bands].sort((a, b) => a.minBuy - b.minBuy);

  const add = () => {
    const min = num(minB);
    const max = maxB.trim() ? num(maxB) : null;
    const val = parseFloat(toEnglishDigits(pVal));
    if (!min || !Number.isFinite(val) || (max !== null && max <= min)) return;
    StorageService.addProfitBand({ minBuy: min, maxBuy: max, profitType: pType, profitValue: val });
    setBands(StorageService.getProfitBands());
    setMinB(''); setMaxB(''); setPVal('');
  };

  return (
    <div className={box}>
      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">بازه‌های قیمت خرید (سود پیش‌فرض)</h3>
      <p className="text-[11px] text-slate-500">فقط برای کالاهایی که تگ ندارند و سود خودشان را هم ندارند. کالاهای دارای تگ، سود تگ را می‌گیرند. بازه‌ی بی‌سقف را خالی بگذار.</p>
      <div className="space-y-1">
        {sorted.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
            <span>
              از {toPersianDigits(b.minBuy)} تا {b.maxBuy === null ? 'بی‌نهایت' : toPersianDigits(b.maxBuy)} ← {toPersianDigits(b.profitValue)}{b.profitType === 'percent' ? '٪' : ' تومان'}
            </span>
            <button type="button" onClick={() => { StorageService.deleteProfitBand(b.id); setBands(StorageService.getProfitBands()); }} className="text-rose-600 font-bold">حذف</button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <input inputMode="numeric" value={minB} onChange={(e) => setMinB(toEnglishDigits(e.target.value))} placeholder="از قیمت خرید" className={input} />
        <input inputMode="numeric" value={maxB} onChange={(e) => setMaxB(toEnglishDigits(e.target.value))} placeholder="تا قیمت خرید (خالی = بی‌سقف)" className={input} />
        <select value={pType} onChange={(e) => setPType(e.target.value as 'percent' | 'amount')} className={input}>
          <option value="percent">درصد سود</option>
          <option value="amount">مبلغ سود</option>
        </select>
        <input inputMode="decimal" value={pVal} onChange={(e) => setPVal(toEnglishDigits(e.target.value))} placeholder="مقدار سود" className={input} />
      </div>
      <button type="button" onClick={add} className="w-full py-2 rounded-xl bg-amber-600 text-white text-xs font-bold">افزودن بازه</button>
    </div>
  );
};

export const TagsView: React.FC<Props> = ({ products, currentUser, onChanged }) => {
  const [tags, setTags] = useState<ProductTag[]>(() => StorageService.getTags());
  const tree = useTreeExpansion();
  const nodes = useMemo(() => buildTree<ProductTag>(tags, (a, b) => a.createdAt.localeCompare(b.createdAt)), [tags]);

  const [addingUnder, setAddingUnder] = useState<string | null | undefined>(undefined);
  const [newKind, setNewKind] = useState<TagKind>('general');
  const [typesVersion, setTypesVersion] = useState(0);
  const tagTypes = useMemo(() => StorageService.getTagTypes(), [typesVersion]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  // تغییر قیمت گروهی
  const [pMode, setPMode] = useState<'percent' | 'amount'>('percent');
  const [pValue, setPValue] = useState('');
  const [pSub, setPSub] = useState(true);
  const [pTarget, setPTarget] = useState<'sell' | 'buy' | 'both'>('sell');
  const [preview, setPreview] = useState<ReturnType<typeof StorageService.previewTagPriceChange> | null>(null);

  // تگ‌زدن به کالاها
  const [pSearch, setPSearch] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const selected = tags.find((t) => t.id === selectedId) || null;
  const [profitType, setProfitType] = useState<'none' | 'percent' | 'amount'>('none');
  const [profitValueInput, setProfitValueInput] = useState('');
  const activeProducts = products.filter((p) => !p.deleted);
  const countOf = (id: string) => activeProducts.filter((p) => (p.tagIds || []).includes(id)).length;

  const refresh = () => {
    setTags(StorageService.getTags());
    onChanged();
  };

  const parseValue = () => {
    const n = parseFloat(toEnglishDigits(pValue).replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : NaN;
  };

  const runPreview = () => {
    setMsg('');
    if (!selected) return setMsg('ابتدا یک تگ را انتخاب کن.');
    const v = parseValue();
    if (!Number.isFinite(v) || v === 0) return setMsg('مقدار تغییر را وارد کن (مثلاً 20 یا -10 یا 1000).');
    setPreview(StorageService.previewTagPriceChange({ tagId: selected.id, includeSubtree: pSub, mode: pMode, value: v, target: pTarget }));
  };

  const applyPrice = () => {
    if (!selected) return;
    const v = parseValue();
    const n = StorageService.applyTagPriceChange({ tagId: selected.id, includeSubtree: pSub, mode: pMode, value: v, target: pTarget }, currentUser);
    setPreview(null);
    setPValue('');
    setMsg(`قیمت ${toPersianDigits(n)} کالا به‌روز شد.`);
    refresh();
  };

  const addTag = () => {
    const name = draft.trim();
    if (!name || addingUnder === undefined) return;
    const parent = addingUnder ? tags.find((t) => t.id === addingUnder) : undefined;
    StorageService.addTag(name, addingUnder, parent ? parent.kind || 'general' : newKind);
    if (addingUnder) tree.open(addingUnder);
    setDraft('');
    setAddingUnder(undefined);
    refresh();
  };

  const renameTag = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    StorageService.renameTag(id, name);
    setEditingId(null);
    refresh();
  };

  const deleteTag = (id: string) => {
    StorageService.deleteTag(id);
    if (selectedId === id) setSelectedId(null);
    refresh();
  };

  const candidates = activeProducts
    .filter((p) => {
      const q = toEnglishDigits(pSearch).trim().toLowerCase();
      return !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    })
    .slice(0, 60);

  const assignChecked = (add: boolean) => {
    if (!selected) return;
    const ids = Object.keys(checked).filter((id) => checked[id]);
    if (!ids.length) return;
    const n = StorageService.setTagOnProducts(selected.id, ids, add, currentUser);
    setChecked({});
    setMsg(`${toPersianDigits(n)} کالا ${add ? 'به' : 'از'} تگ «${selected.name}» ${add ? 'اضافه' : 'حذف'} شد.`);
    refresh();
  };

  const renderRow = (tag: ProductTag, meta: RowMeta) => (
    <div>
      <div className={`flex items-center gap-1.5 py-1.5 rounded-lg ${selectedId === tag.id ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}>
        {editingId === tag.id ? (
          <>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className={input + ' min-w-0 flex-1 min-h-10 px-3 text-sm'} />
            <button type="button" onClick={() => renameTag(tag.id)} className="p-1.5 rounded-lg bg-emerald-600 text-white"><Check className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"><X className="w-3.5 h-3.5" /></button>
          </>
        ) : (
          <>
            <Tags className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <button
              type="button"
              onClick={() => {
                setSelectedId(tag.id);
                setMsg('');
                setPreview(null);
                setProfitType(tag.profitType || 'none');
                setProfitValueInput(tag.profitValue !== undefined ? String(tag.profitValue) : '');
                if (meta.hasChildren) tree.toggle(tag.id);
              }}
              className="flex-1 text-right text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
            >
              {tag.name} <span className="text-[10px] text-amber-700 font-normal">{StorageService.tagTypeName(tag.kind || 'general')}</span>{' '}
              <span className="text-slate-400 font-normal">({toPersianDigits(countOf(tag.id))})</span>
            </button>
            <button type="button" title="زیرتگ" onClick={() => { setAddingUnder(tag.id); setDraft(''); }} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"><Plus className="w-3.5 h-3.5" /></button>
            <button type="button" title="تغییر نام" onClick={() => { setEditingId(tag.id); setEditName(tag.name); }} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"><Pencil className="w-3.5 h-3.5" /></button>
            <button type="button" title="حذف" onClick={() => deleteTag(tag.id)} className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        )}
      </div>
      {addingUnder === tag.id && (
        <div className="flex gap-1.5 py-1" style={{ paddingRight: (meta.depth + 1) * 16 }}>
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} placeholder="نام زیرتگ" className={input + ' min-w-0 flex-1 min-h-11 px-3 text-sm'} />
          <button type="button" onClick={addTag} className="px-3 rounded-lg bg-amber-600 text-white text-xs font-bold">ثبت</button>
        </div>
      )}
    </div>
  );

  const allIds = (function collect(list: typeof nodes, acc: string[] = []): string[] {
    list.forEach((n) => { if (n.children.length) acc.push(n.item.id); collect(n.children, acc); });
    return acc;
  })(nodes);

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 p-2 rounded-xl"><Tags className="w-6 h-6" /></span>
          <h2 className="text-lg font-extrabold">تگ‌ها و قیمت گروهی</h2>
        </div>
        <p className="text-xs text-violet-100 mt-1">تگ بساز، کالاها را تگ‌گذاری کن، و قیمت همه‌ی کالاهای یک تگ را یک‌جا تغییر بده.</p>
      </div>

      {msg && <div className="p-2.5 rounded-xl text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200">{msg}</div>}

      {/* درخت تگ‌ها */}
      <div className={box}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">درخت تگ‌ها</h3>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => tree.openAll(allIds)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800">باز کردن همه</button>
            <button type="button" onClick={tree.closeAll} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800">بستن همه</button>
          </div>
        </div>
        {addingUnder === null && (
          <div className="flex flex-col gap-2 min-w-0">
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as TagKind)} className={input + ' w-full min-h-11'}>
              {tagTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="flex gap-1.5 min-w-0 items-stretch">
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} placeholder="نام تگ جدید" className={input + ' min-w-0 flex-1 min-h-11 px-3 text-sm'} />
              <button type="button" onClick={addTag} className="px-4 min-w-[64px] rounded-lg bg-amber-600 text-white text-xs font-bold">ثبت</button>
            </div>
          </div>
        )}
        <TreeView<ProductTag> nodes={nodes} expanded={tree.expanded} onToggle={tree.toggle} getId={(t) => t.id} renderRow={renderRow} />
        <button type="button" onClick={() => { setAddingUnder(null); setDraft(''); }} className="w-full py-2 rounded-xl bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" /> تگ اصلی جدید
        </button>
      </div>

      {/* انواع تگ و بازه‌های قیمت خرید */}
      <TagTypesEditor onChanged={() => setTypesVersion((v) => v + 1)} />
      <ProfitPriorityEditor onChanged={() => setTypesVersion((v) => v + 1)} />
      <BandsEditor />

      {!selected ? (
        <p className="text-xs text-slate-500 text-center">برای تغییر قیمت یا تگ‌زدن کالاها، یک تگ را از درخت انتخاب کن.</p>
      ) : (
        <>
          {/* تگ‌زدن به کالاها */}
          <div className={box}>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">کالاهای تگ «{selected.name}»</h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
              <input value={pSearch} onChange={(e) => setPSearch(e.target.value)} placeholder="جستجوی کالا (نام یا کد)" className={input + ' pr-8'} />
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              {candidates.map((p) => {
                const has = (p.tagIds || []).includes(selected.id);
                return (
                  <label key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={!!checked[p.id]} onChange={(e) => setChecked((c) => ({ ...c, [p.id]: e.target.checked }))} />
                    <span className="flex-1 truncate">{p.name} <span className="text-slate-400 font-mono">({p.code})</span></span>
                    {has && <span className="text-[10px] font-bold text-emerald-700">تگ دارد</span>}
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => assignChecked(true)} className="flex-1 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold">افزودن تگ به انتخاب‌شده‌ها</button>
              <button type="button" onClick={() => assignChecked(false)} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">حذف تگ از انتخاب‌شده‌ها</button>
            </div>
          </div>

          {/* تغییر قیمت گروهی */}
          <div className={box}>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">تغییر قیمت گروهی</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select value={pMode} onChange={(e) => { setPMode(e.target.value as 'percent' | 'amount'); setPreview(null); }} className={input}>
                <option value="percent">درصدی (٪)</option>
                <option value="amount">مبلغی (تومان)</option>
              </select>
              <input inputMode="decimal" value={pValue} onChange={(e) => { setPValue(e.target.value); setPreview(null); }} placeholder={pMode === 'percent' ? 'مثلاً 20 یا -10' : 'مثلاً 1000 یا -500'} className={input} />
              <select value={pTarget} onChange={(e) => { setPTarget(e.target.value as 'sell' | 'buy' | 'both'); setPreview(null); }} className={input}>
                <option value="sell">قیمت فروش</option>
                <option value="buy">قیمت خرید</option>
                <option value="both">هر دو</option>
              </select>
              <label className="flex items-center gap-1.5 px-2">
                <input type="checkbox" checked={pSub} onChange={(e) => { setPSub(e.target.checked); setPreview(null); }} />
                زیرتگ‌ها هم
              </label>
            </div>
            <button type="button" onClick={runPreview} className="w-full py-2 rounded-xl bg-slate-800 text-white text-xs font-bold">پیش‌نمایش تغییر</button>

            {preview && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500">
                  {toPersianDigits(preview.length)} کالا تحت تأثیر قرار می‌گیرد
                  {(pTarget === 'sell' || pTarget === 'both') && preview.some((r) => r.product.buyPrice && r.newSell < r.product.buyPrice) && (
                    <span className="text-rose-600 font-bold"> · {toPersianDigits(preview.filter((r) => r.product.buyPrice && r.newSell < r.product.buyPrice).length)} کالا زیر قیمت خرید (زیان)</span>
                  )}:
                </p>
                {pTarget === 'buy' && selected && (() => {
                  const scope = new Set(StorageService.tagScopeIds(selected.id, pSub));
                  const taggedCount = StorageService.getProducts().filter((p) => !p.deleted && (p.tagIds || []).some((id) => scope.has(id))).length;
                  const missingBuyCount = Math.max(0, taggedCount - preview.length);
                  return missingBuyCount > 0 ? <p className="text-[11px] text-amber-700">قیمت خرید برای {toPersianDigits(missingBuyCount)} کالای دارای این تگ ثبت نشده است؛ این کالاها تغییر نمی‌کنند.</p> : null;
                })()}
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {preview.map((r) => (
                    <div key={r.product.id} className="text-[11px] p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <span className="block truncate mb-1">{r.product.name}</span>
                      {pTarget === 'buy' ? (
                        <span className="block">قیمت خرید: {formatToman(r.oldBuy ?? 0)} ← <strong>{formatToman(r.newBuy ?? r.oldBuy ?? 0)}</strong></span>
                      ) : pTarget === 'both' ? (
                        <div className="space-y-1">
                          <span className="block">قیمت فروش: {formatToman(r.oldSell)} ← <strong className={r.product.buyPrice && r.newSell < r.product.buyPrice ? 'text-rose-600' : ''}>{formatToman(r.newSell)}</strong></span>
                          <span className="block">قیمت خرید: {r.oldBuy ? formatToman(r.oldBuy) : 'ثبت نشده'} ← <strong>{r.newBuy != null ? formatToman(r.newBuy) : 'ثبت نشده'}</strong></span>
                        </div>
                      ) : (
                        <span className="block">قیمت فروش: {formatToman(r.oldSell)} ← <strong className={r.product.buyPrice && r.newSell < r.product.buyPrice ? 'text-rose-600' : ''}>{formatToman(r.newSell)}</strong></span>
                      )}
                    </div>
                  ))}
                </div>
                {preview.length === 0 ? (
                  <p className="text-xs text-rose-600">{pTarget === 'buy' ? 'کالای دارای این تگ با قیمت خرید ثبت‌شده پیدا نشد.' : 'کالایی با این تگ پیدا نشد.'}</p>
                ) : (
                  <button type="button" onClick={applyPrice} className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold">اعمال تغییر قیمت</button>
                )}
              </div>
            )}
          </div>

          {StorageService.tagTypeDrivesProfit(selected.kind || 'general') && (
          <>
          {/* سود پیش‌فرض تگ */}
          <div className={box}>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">سود پیش‌فرض این تگ</h3>
            <p className="text-[11px] text-slate-500">اگر کالایی سود خودش را نداشته باشد، از این تگ استفاده می‌شود. با تغییر قیمت خرید، قیمت فروش خودکار تنظیم می‌شود.</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select value={profitType} onChange={(e) => setProfitType(e.target.value as 'none' | 'percent' | 'amount')} className={input}>
                <option value="none">بدون سود</option>
                <option value="percent">درصد سود</option>
                <option value="amount">مبلغ سود (تومان)</option>
              </select>
              <input inputMode="decimal" value={profitValueInput} onChange={(e) => setProfitValueInput(toEnglishDigits(e.target.value))} placeholder="مقدار" className={input} disabled={profitType === 'none'} />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const v = parseFloat(profitValueInput);
                  if (profitType !== 'none' && !Number.isFinite(v)) return setMsg('مقدار سود را وارد کن.');
                  StorageService.setTagProfit(selected.id, profitType === 'none' ? null : profitType, profitType === 'none' ? null : v);
                  setMsg('سود تگ ذخیره شد. (برای اعمال روی کالاها، دکمه‌ی اعمال را بزن)');
                  refresh();
                }}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
              >
                ذخیره سود تگ
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = StorageService.applyTagProfitNow(selected.id, pSub, currentUser);
                  setMsg(`قیمت فروش ${toPersianDigits(n)} کالا بر اساس سود تگ به‌روز شد.`);
                  refresh();
                }}
                className="flex-1 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold"
              >
                اعمال روی کالاها
              </button>
            </div>
          </div>

          </>
          )}

          {/* کالاهای این تگ (برای حذف) */}
          <div className={box}>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">کالاهای دارای این تگ: {toPersianDigits(countOf(selected.id))}</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {activeProducts.filter((p) => (p.tagIds || []).includes(selected.id)).slice(0, 80).map((p) => (
                <div key={p.id} className="flex justify-between items-center gap-2 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="truncate">{p.name}</span>
                  <button type="button" onClick={() => { StorageService.setTagOnProducts(selected.id, [p.id], false, currentUser); refresh(); }} className="text-rose-600 font-bold shrink-0">حذف تگ</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// بخش تنظیمات تگ و قیمت پیشرفته: یک کلید برای روشن/خاموش، و ویرایشگرها فقط وقتی روشن‌اند
export const AdvancedPricingSection: React.FC<{ onOpenTags?: () => void }> = ({ onOpenTags }) => {
  const [enabled, setEnabled] = useState(() => StorageService.advancedPricingEnabled());
  const [ver, setVer] = useState(0);
  const toggle = (v: boolean) => {
    StorageService.setAdvancedPricingEnabled(v);
    setEnabled(v);
  };
  return (
    <section className="space-y-3 bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800" key={ver}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">تگ و قیمت پیشرفته</h3>
          <p className="text-[11px] text-slate-500">
            {enabled ? 'روشن است: سود از تگ‌ها و بازه‌های قیمت محاسبه می‌شود.' : 'خاموش است: فقط سود خود کالا اعمال می‌شود. ساده‌تر و بدون تنظیمات اضافه.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggle(!enabled)}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold ${enabled ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'}`}
        >
          {enabled ? 'خاموش کردن' : 'روشن کردن'}
        </button>
      </div>

      {enabled && (
        <>
          {onOpenTags && (
            <button type="button" onClick={onOpenTags} className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold">
              مدیریت درخت تگ‌ها و تغییر قیمت گروهی
            </button>
          )}
          <TagTypesEditor onChanged={() => setVer((v) => v + 1)} />
          <ProfitPriorityEditor onChanged={() => setVer((v) => v + 1)} />
          <BandsEditor />
        </>
      )}
    </section>
  );
};

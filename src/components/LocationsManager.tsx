import React, { useMemo, useState } from 'react';
import { X, Plus, Pencil, Trash2, FolderTree, Check } from 'lucide-react';
import { StockLocation } from '../types';
import { StorageService, DEFAULT_LOCATION_ID } from '../services/storageService';
import { buildTree, expandableIds } from '../utils/treeUtils';
import { TreeView, useTreeExpansion } from './TreeView';

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

// مدیریت درختی مکان‌ها: هر مکان زیرمجموعه‌ی بی‌حد دارد، و درخت یا شاخه‌ها قابل باز و بسته شدن هستند
export const LocationsManager: React.FC<Props> = ({ onClose, onChanged }) => {
  const [locations, setLocations] = useState<StockLocation[]>(() => StorageService.getLocations());
  // undefined: بسته، null: افزودن مکان اصلی، رشته: افزودن زیرمجموعه‌ی آن مکان
  const [addingUnder, setAddingUnder] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [message, setMessage] = useState('');
  const tree = useTreeExpansion();

  const nodes = useMemo(
    () => buildTree<StockLocation>(locations, (a, b) => a.createdAt.localeCompare(b.createdAt)),
    [locations]
  );

  const refresh = () => {
    setLocations(StorageService.getLocations());
    onChanged();
  };

  const handleAdd = () => {
    const name = draft.trim();
    if (!name || addingUnder === undefined) return;
    StorageService.addLocation(name, addingUnder);
    if (addingUnder) tree.open(addingUnder);
    setDraft('');
    setAddingUnder(undefined);
    setMessage('');
    refresh();
  };

  const handleRename = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    StorageService.renameLocation(id, name);
    setEditingId(null);
    refresh();
  };

  const handleDelete = (loc: StockLocation) => {
    const res = StorageService.deleteLocation(loc.id);
    if (!res.ok) {
      setMessage(res.reason || 'حذف انجام نشد.');
      return;
    }
    setMessage('');
    refresh();
  };

  const addRow = (depth: number) => (
    <div className="flex gap-2 py-1.5" style={{ paddingRight: depth * 16 }}>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="نام مکان، مثلاً کمد"
        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
      />
      <button type="button" onClick={handleAdd} className="px-3 rounded-lg bg-amber-600 text-white text-xs font-bold">
        ثبت
      </button>
      <button type="button" onClick={() => setAddingUnder(undefined)} className="px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
        انصراف
      </button>
    </div>
  );

  const renderRow = (loc: StockLocation, meta: { depth: number; hasChildren: boolean; isExpanded: boolean }) => (
    <div>
      <div className="flex items-center gap-2 py-1.5">
        {editingId === loc.id ? (
          <>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
            <button type="button" onClick={() => handleRename(loc.id)} className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <FolderTree className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <button
              type="button"
              onClick={() => meta.hasChildren && tree.toggle(loc.id)}
              className="flex-1 text-right text-sm text-slate-800 dark:text-slate-100 truncate"
            >
              {loc.name}
              {meta.hasChildren && <span className="text-[10px] text-slate-400 mr-1">({StorageService.getLocations().filter((l) => l.parentId === loc.id).length})</span>}
            </button>
            <button
              type="button"
              title="افزودن زیرمجموعه"
              onClick={() => {
                setAddingUnder(loc.id);
                setDraft('');
              }}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="تغییر نام"
              onClick={() => {
                setEditingId(loc.id);
                setEditName(loc.name);
              }}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {loc.id !== DEFAULT_LOCATION_ID && (
              <button type="button" title="حذف" onClick={() => handleDelete(loc)} className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
      {addingUnder === loc.id && addRow(meta.depth + 1)}
    </div>
  );

  const allIds = expandableIds<StockLocation>(nodes, (l: StockLocation) => l.id);

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">مدیریت مکان‌های انبار</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">برای باز کردن شاخه، روی نام آن بزن.</p>
          <div className="flex gap-1.5 shrink-0">
            <button type="button" onClick={() => tree.openAll(allIds)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800">
              باز کردن همه
            </button>
            <button type="button" onClick={tree.closeAll} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800">
              بستن همه
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {addingUnder === null && addRow(0)}
          <TreeView<StockLocation>
            nodes={nodes}
            expanded={tree.expanded}
            onToggle={tree.toggle}
            getId={(l) => l.id}
            renderRow={renderRow}
          />
        </div>

        {message && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg">{message}</p>}

        <button
          type="button"
          onClick={() => {
            setAddingUnder(null);
            setDraft('');
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm"
        >
          <Plus className="w-4 h-4" />
          افزودن مکان اصلی
        </button>
      </div>
    </div>
  );
};

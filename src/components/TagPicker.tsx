import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ProductTag } from '../types';
import { StorageService } from '../services/storageService';
import { buildTree, TreeNode } from '../utils/treeUtils';

interface Props {
  tags: ProductTag[];
  value: string[];
  onChange: (ids: string[]) => void;
}

// انتخاب تگ‌ها با جستجوی زنده و نمایش درختی
export const TagPicker: React.FC<Props> = ({ tags, value, onChange }) => {
  const [q, setQ] = useState('');

  const flat = useMemo(() => {
    const tree = buildTree<ProductTag>(tags, (a, b) => a.createdAt.localeCompare(b.createdAt));
    const out: { id: string; name: string; depth: number; kind: string }[] = [];
    const walk = (nodes: TreeNode<ProductTag>[]) =>
      nodes.forEach((n) => {
        out.push({ id: n.item.id, name: n.item.name, depth: n.depth, kind: StorageService.tagTypeName(n.item.kind || 'general') });
        walk(n.children);
      });
    walk(tree);
    return out;
  }, [tags]);

  const needle = q.trim().toLowerCase();
  const visible = flat.filter((o) => !needle || o.name.toLowerCase().includes(needle)).slice(0, 40);
  const nameOf = (id: string) => tags.find((t) => t.id === id)?.name || '';
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 text-[11px] font-bold">
              {nameOf(id)}
              <button type="button" onClick={() => toggle(id)} aria-label="حذف تگ">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="جستجوی تگ..."
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
      />
      <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
        {visible.length === 0 ? (
          <p className="p-2 text-[11px] text-slate-500">تگی پیدا نشد. از بخش «تگ‌ها و قیمت گروهی» تگ بساز.</p>
        ) : (
          visible.map((o) => {
            const on = value.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                className={`w-full text-right px-2.5 py-1.5 text-xs flex items-center justify-between ${on ? 'bg-amber-50 dark:bg-amber-950/30 font-bold' : ''}`}
                style={{ paddingRight: 10 + o.depth * 14 }}
              >
                <span>{o.depth ? '↳ ' : ''}{o.name} <span className="text-[10px] text-slate-400">({o.kind})</span></span>
                <span>{on ? '✓' : ''}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

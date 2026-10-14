import React, { useCallback, useState } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { TreeNode } from '../utils/treeUtils';

export interface RowMeta {
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

// وضعیت باز/بسته بودن گره‌ها
export function useTreeExpansion(initial: string[] = []) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initial));

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const open = useCallback((id: string) => {
    setExpanded((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const openAll = useCallback((ids: string[]) => setExpanded(new Set(ids)), []);
  const closeAll = useCallback(() => setExpanded(new Set()), []);

  return { expanded, toggle, open, openAll, closeAll };
}

interface TreeViewProps<T> {
  nodes: TreeNode<T>[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  getId: (item: T) => string;
  renderRow: (item: T, meta: RowMeta) => React.ReactNode;
}

// نمایش درختی بی‌حد: هر گره با فلش باز/بسته می‌شود
export function TreeView<T>({ nodes, expanded, onToggle, getId, renderRow }: TreeViewProps<T>) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => {
        const id = getId(node.item);
        const hasChildren = node.children.length > 0;
        const isExpanded = expanded.has(id);
        return (
          <div key={id}>
            <div className="flex items-start gap-1" style={{ paddingRight: node.depth * 16 }}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggle(id)}
                  className="mt-1 p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 shrink-0"
                  aria-label={isExpanded ? 'بستن' : 'باز کردن'}
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>
              ) : (
                <span className="w-[22px] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {renderRow(node.item, { depth: node.depth, hasChildren, isExpanded })}
              </div>
            </div>
            {hasChildren && isExpanded && (
              <TreeView
                nodes={node.children}
                expanded={expanded}
                onToggle={onToggle}
                getId={getId}
                renderRow={renderRow}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

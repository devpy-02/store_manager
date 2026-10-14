import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { NavTab } from './BottomNav';
import { TreeView, useTreeExpansion, RowMeta } from './TreeView';
import { TreeNode } from '../utils/treeUtils';
import { StorageService } from '../services/storageService';

// ساختار منوی کشویی: گروه‌ها می‌توانند زیرمجموعه داشته باشند، و فقط برگ‌های دارای تب قابل انتخاب‌اند
export interface MenuItem {
  id: string;
  label: string;
  tab?: NavTab;
  children?: MenuItem[];
}

export const MENU: MenuItem[] = [
  {
    id: 'warehouse',
    label: 'انبارداری',
    children: [
      { id: 'm_products', label: 'محصولات', tab: 'products' },
      { id: 'm_receipt', label: 'ورود و انتقال کالا', tab: 'goods_receipt' },
      { id: 'm_categories', label: 'دسته‌بندی‌ها', tab: 'categories' },
      {
        id: 'm_expiry',
        label: 'انقضا',
        children: [
          { id: 'm_expiry_alerts', label: 'هشدارها', tab: 'expiry_alerts' },
          { id: 'm_expiry_reports', label: 'گزارش انقضا', tab: 'expiry_reports' },
        ],
      },
      { id: 'm_history', label: 'تاریخچه', tab: 'history' },
      { id: 'm_loc_report', label: 'گزارش مکان‌ها', tab: 'location_report' },
      { id: 'm_tags', label: 'تگ‌ها و قیمت گروهی', tab: 'tags' },
      { id: 'm_price_import', label: 'ورود لیست قیمت PDF', tab: 'price_import' },
    ],
  },
  {
    id: 'sales',
    label: 'فروش و مالی',
    children: [
      { id: 'm_invoices', label: 'فاکتورها', tab: 'invoices' },
      { id: 'm_customers', label: 'مخاطبین', tab: 'customers' },
      { id: 'm_debt', label: 'گزارش بدهی', tab: 'debt_reports' },
    ],
  },
  {
    id: 'reports',
    label: 'گزارش‌ها',
    children: [
      { id: 'm_analytics', label: 'آمار و تحلیل', tab: 'analytics' },
      { id: 'm_notifications', label: 'اعلان‌ها', tab: 'notifications' },
    ],
  },
  {
    id: 'system',
    label: 'سیستم',
    children: [{ id: 'm_settings', label: 'تنظیمات', tab: 'settings' }],
  },
];

function toNodes(items: MenuItem[], depth: number): TreeNode<MenuItem>[] {
  return items.map((item) => ({ item, depth, children: toNodes(item.children || [], depth + 1) }));
}

// مسیر والدهای یک تب، تا هنگام باز شدن منو، شاخه‌ی تب فعلی باز باشد
function ancestorsOf(items: MenuItem[], tab: NavTab, trail: string[] = []): string[] | null {
  for (const it of items) {
    if (it.tab === tab) return trail;
    if (it.children) {
      const found = ancestorsOf(it.children, tab, [...trail, it.id]);
      if (found) return found;
    }
  }
  return null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onSelect: (tab: NavTab) => void;
}

const hideTags = (items: MenuItem[]): MenuItem[] =>
  items
    .filter((i) => i.id !== 'm_tags')
    .map((i) => (i.children ? { ...i, children: hideTags(i.children) } : i));

export const SideDrawer: React.FC<Props> = ({ open, onClose, activeTab, onSelect }) => {
  const tree = useTreeExpansion();
  const advanced = StorageService.advancedPricingEnabled();
  const nodes = useMemo(() => toNodes(advanced ? MENU : hideTags(MENU), 0), [advanced]);

  // هنگام باز شدن، مسیر تب فعلی باز می‌شود
  useEffect(() => {
    if (!open) return;
    const path = ancestorsOf(MENU, activeTab);
    if (path) path.forEach((id) => tree.open(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const renderRow = (item: MenuItem, meta: RowMeta) => {
    if (item.tab) {
      const isActive = item.tab === activeTab;
      return (
        <button
          type="button"
          onClick={() => onSelect(item.tab as NavTab)}
          className={`w-full text-right px-3 py-2.5 rounded-xl text-sm transition-colors ${
            isActive
              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 font-bold'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {item.label}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => meta.hasChildren && tree.toggle(item.id)}
        className="w-full text-right px-3 py-2.5 rounded-xl text-sm font-extrabold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        {item.label}
      </button>
    );
  };

  return (
    <>
      {/* پس‌زمینه‌ی تیره: با لمس آن منو بسته می‌شود */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[70] bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* کشوی منو از سمت راست */}
      <aside
        dir="rtl"
        className={`fixed top-0 right-0 h-full w-[82%] max-w-xs z-[80] bg-white dark:bg-slate-900 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white">
          <h2 className="font-extrabold text-sm">منو</h2>
          <button type="button" onClick={onClose} aria-label="بستن منو" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <TreeView<MenuItem>
            nodes={nodes}
            expanded={tree.expanded}
            onToggle={tree.toggle}
            getId={(m) => m.id}
            renderRow={renderRow}
          />
        </div>
      </aside>
    </>
  );
};

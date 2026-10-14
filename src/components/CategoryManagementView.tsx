import { buildTree, expandableIds, flattenLabels, subtreeIds, TreeNode } from '../utils/treeUtils';
import { TreeView, useTreeExpansion, RowMeta } from './TreeView';
import React, { useState } from 'react';
import { Category } from '../types';
import {
  Folder,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Layers,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Check,
  X,
  Palette,
  Tag,
  Zap,
  Wrench,
  Disc,
  Hammer,
  Scissors,
  Ruler,
  Wind,
  Box,
  Sparkles,
  Shield,
  Sliders,
} from 'lucide-react';

interface Props {
  categories: Category[];
  totalProductsCount: number;
  onCreateCategory: (cat: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parentId?: string | null;
  }) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (
    id: string,
    action: 'uncategorized' | 'delete_products' | 'move_to_category',
    targetCategoryId?: string
  ) => void;
  onReorderCategories: (ids: string[]) => void;
  onSelectCategoryFilter?: (categoryName: string) => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

const PRESET_ICONS = [
  { name: 'Zap', label: 'برقی', icon: Zap },
  { name: 'Wrench', label: 'آچار/دریل', icon: Wrench },
  { name: 'Hammer', label: 'چکش', icon: Hammer },
  { name: 'Disc', label: 'فرز/برش', icon: Disc },
  { name: 'Scissors', label: 'انبر', icon: Scissors },
  { name: 'Ruler', label: 'اندازه‌گیری', icon: Ruler },
  { name: 'Wind', label: 'بادی', icon: Wind },
  { name: 'Box', label: 'جعبه', icon: Box },
  { name: 'Sparkles', label: 'ویژه', icon: Sparkles },
  { name: 'Folder', label: 'پوشه', icon: Folder },
];

export const CategoryManagementView: React.FC<Props> = ({
  categories,
  totalProductsCount,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  onSelectCategoryFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [parentForSubcategory, setParentForSubcategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#3B82F6');
  const [formIcon, setFormIcon] = useState('Folder');
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Delete modal options
  const [deleteAction, setDeleteAction] = useState<'uncategorized' | 'delete_products' | 'move_to_category'>('uncategorized');
  const [deleteTargetCatId, setDeleteTargetCatId] = useState<string>('');

  // Main categories (parentId == null)
  const mainCategories = categories.filter((c) => !c.parentId && !c.deleted);

  // Filtered categories
  const filteredMainCategories = mainCategories.filter((main) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (main.name.toLowerCase().includes(q) || (main.description && main.description.toLowerCase().includes(q))) {
      return true;
    }
    // Also check if any subcategory matches
    const subMatch = categories.some(
      (sub) =>
        sub.parentId === main.id &&
        !sub.deleted &&
        (sub.name.toLowerCase().includes(q) || (sub.description && sub.description.toLowerCase().includes(q)))
    );
    return subMatch;
  });

  // ---- درخت دسته‌ها با عمق نامحدود ----
  const catTree = useTreeExpansion();
  const activeCats = categories.filter((c) => !c.deleted);
  const catQuery = searchQuery.trim().toLowerCase();
  let visibleCats = activeCats;
  if (catQuery) {
    const matches = activeCats.filter(
      (c) => c.name.toLowerCase().includes(catQuery) || (c.description || '').toLowerCase().includes(catQuery)
    );
    // نتیجه‌ی جستجو همراه با والدهایش نشان داده می‌شود
    const keep = new Set<string>();
    matches.forEach((m) => {
      let cur: Category | undefined = m;
      while (cur && !keep.has(cur.id)) {
        keep.add(cur.id);
        const pid: string | null = cur.parentId;
        cur = pid ? activeCats.find((c) => c.id === pid) : undefined;
      }
    });
    visibleCats = activeCats.filter((c) => keep.has(c.id));
  }
  const catNodes: TreeNode<Category>[] = buildTree(visibleCats, (a, b) => a.displayOrder - b.displayOrder);
  const effectiveExpanded = catQuery ? new Set(expandableIds(catNodes, (c) => c.id)) : catTree.expanded;

  const subtreeProductCount = (id: string): number => {
    const node = catNodes.length ? findNode(catNodes, id) : undefined;
    if (!node) {
      const own = activeCats.find((c) => c.id === id);
      return own ? own.productCount : 0;
    }
    return subtreeIds(node, (c) => c.id).reduce((sum, sid) => {
      const c = activeCats.find((x) => x.id === sid);
      return sum + (c ? c.productCount : 0);
    }, 0);
  };
  const findNode = (list: TreeNode<Category>[], id: string): TreeNode<Category> | undefined => {
    for (const n of list) {
      if (n.item.id === id) return n;
      const inner = findNode(n.children, id);
      if (inner) return inner;
    }
    return undefined;
  };

  const renderCategoryRow = (cat: Category, meta: RowMeta) => {
    const siblings = activeCats
      .filter((c) => (c.parentId ?? null) === (cat.parentId ?? null))
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = siblings.findIndex((s) => s.id === cat.id);
    return (
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#3B82F6' }} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`truncate ${meta.depth === 0 ? 'font-extrabold text-sm' : 'font-bold text-xs'} text-slate-900 dark:text-slate-100`}>
                {cat.name}
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                {subtreeProductCount(cat.id)} کالا
              </span>
            </div>
            {cat.description && <p className="text-[10px] text-slate-500 truncate">{cat.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => handleMoveOrder(cat.id, 'up')}
            disabled={idx <= 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30"
            title="انتقال به بالا"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleMoveOrder(cat.id, 'down')}
            disabled={idx === siblings.length - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30"
            title="انتقال به پایین"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              openCreateModal(cat);
              catTree.open(cat.id);
            }}
            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
            title="افزودن زیردسته"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => openEditModal(cat)} className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40" title="ویرایش">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => openDeleteModal(cat)} className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="حذف">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const toggleExpand = (catId: string) => {
    setExpandedParents((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const openCreateModal = (parent?: Category) => {
    setParentForSubcategory(parent || null);
    setFormName('');
    setFormDescription('');
    setFormColor(parent?.color || '#3B82F6');
    setFormIcon(parent?.icon || 'Folder');
    setFormParentId(parent ? parent.id : null);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormColor(cat.color || '#3B82F6');
    setFormIcon(cat.icon || 'Folder');
    setFormParentId(cat.parentId);
    setFormError('');
  };

  const openDeleteModal = (cat: Category) => {
    setDeletingCategory(cat);
    setDeleteAction('uncategorized');
    // Default target category to first available other category
    const other = categories.find((c) => c.id !== cat.id && !c.deleted);
    setDeleteTargetCatId(other ? other.id : '');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('لطفاً نام دسته‌بندی را وارد کنید');
      return;
    }

    if (editingCategory) {
      onUpdateCategory(editingCategory.id, {
        name: formName.trim(),
        description: formDescription.trim(),
        color: formColor,
        icon: formIcon,
        parentId: formParentId,
      });
      setEditingCategory(null);
    } else {
      onCreateCategory({
        name: formName.trim(),
        description: formDescription.trim(),
        color: formColor,
        icon: formIcon,
        parentId: formParentId,
      });
      setIsCreateModalOpen(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    onDeleteCategory(deletingCategory.id, deleteAction, deleteTargetCatId);
    setDeletingCategory(null);
  };

  const handleMoveOrder = (catId: string, direction: 'up' | 'down') => {
    const all = categories.filter((c) => !c.deleted).sort((a, b) => a.displayOrder - b.displayOrder);
    const cat = all.find((c) => c.id === catId);
    if (!cat) return;
    const siblings = all.filter((c) => (c.parentId ?? null) === (cat.parentId ?? null));
    const i = siblings.findIndex((c) => c.id === catId);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return;
    const ia = all.findIndex((c) => c.id === siblings[i].id);
    const ib = all.findIndex((c) => c.id === siblings[j].id);
    [all[ia], all[ib]] = [all[ib], all[ia]];
    onReorderCategories(all.map((c) => c.id));
  };

  const renderIcon = (iconName?: string, color?: string) => {
    const iconObj = PRESET_ICONS.find((i) => i.name === iconName);
    const IconComp = iconObj ? iconObj.icon : Folder;
    return <IconComp className="w-4 h-4" style={{ color: color || '#3B82F6' }} />;
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <span>مدیریت دسته‌بندی‌ها (دسته‌بندی دلخواه)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ایجاد ساختار درختی، زیردسته‌ها و تعیین دسته‌بندی‌های اختصاصی انبار
          </p>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="min-h-[42px] px-4 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-amber-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن دسته‌بندی اصلی</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در نام یا توضیحات دسته‌بندی‌ها..."
            className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>
            تعداد دسته‌ها: <strong>{categories.filter((c) => !c.deleted).length}</strong> (شامل{' '}
            {mainCategories.length} دسته اصلی)
          </span>
          <span>
            کل ابزارهای انبار: <strong>{totalProductsCount}</strong> قلم
          </span>
        </div>
      </div>

      {/* Category Tree List */}
      <div className="space-y-3">
        {filteredMainCategories.length === 0 ? (
          <div className="bg-white dark:bg-slate-850 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <Folder className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery ? 'دسته‌بندی با این مشخصات یافت نشد' : 'هیچ دسته‌بندی فعالی ثبت نشده است'}
            </p>
            <button
              onClick={() => openCreateModal()}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
            >
              ایجاد اولین دسته‌بندی
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => catTree.openAll(expandableIds(catNodes, (c) => c.id))}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800"
              >
                باز کردن همه
              </button>
              <button type="button" onClick={catTree.closeAll} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800">
                بستن همه
              </button>
            </div>
            <TreeView
              nodes={catNodes}
              expanded={effectiveExpanded}
              onToggle={(id) => {
                if (!catQuery) catTree.toggle(id);
              }}
              getId={(c) => c.id}
              renderRow={renderCategoryRow}
            />
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(isCreateModalOpen || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                <span>
                  {editingCategory
                    ? 'ویرایش دسته‌بندی'
                    : parentForSubcategory
                    ? `افزودن زیردسته به «${parentForSubcategory.name}»`
                    : 'افزودن دسته‌بندی جدید'}
                </span>
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingCategory(null);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl font-semibold border border-rose-200">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  نام دسته‌بندی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormError('');
                  }}
                  placeholder="مثال: دریل و پیچ‌گوشتی، ابزار نجاری..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  autoFocus
                />
              </div>

              {/* Parent category select */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  دسته‌بندی والد (اختیاری):
                </label>
                <select
                  value={formParentId || ''}
                  onChange={(e) => setFormParentId(e.target.value || null)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="">-- دسته‌بندی اصلی (بدون والد) --</option>
                  {flattenLabels(categories.filter((c) => !c.deleted), editingCategory?.id).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  توضیحات (اختیاری):
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="توضیح کوتاه درباره اقلام این دسته..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs resize-none"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <span>رنگ اختصاصی:</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((clr) => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setFormColor(clr)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        formColor === clr ? 'scale-115 border-slate-900 dark:border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: clr }}
                    />
                  ))}
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                    title="انتخاب رنگ دلخواه"
                  />
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  آیکون نمادین:
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = formIcon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormIcon(item.name)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[9px] font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-amber-600/30"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCategory ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Part 7: Delete Options) */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  حذف دسته‌بندی «{deletingCategory.name}»
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  این دسته‌بندی شامل <strong>{deletingCategory.productCount}</strong> کالا می‌باشد.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                تکلیف کالاهای این دسته‌بندی چه شود؟
              </span>

              <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-750 cursor-pointer">
                <input
                  type="radio"
                  name="delAction"
                  checked={deleteAction === 'uncategorized'}
                  onChange={() => setDeleteAction('uncategorized')}
                  className="text-amber-600"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">انتقال به "بدون دسته‌بندی"</span>
                  <span className="text-[11px] text-slate-500">کالاها در انبار باقی می‌مانند ولی دسته‌بندی ندارند</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-750 cursor-pointer">
                <input
                  type="radio"
                  name="delAction"
                  checked={deleteAction === 'move_to_category'}
                  onChange={() => setDeleteAction('move_to_category')}
                  className="text-amber-600"
                />
                <div className="flex-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">انتقال به دسته‌بندی دیگر</span>
                  {deleteAction === 'move_to_category' && (
                    <select
                      value={deleteTargetCatId}
                      onChange={(e) => setDeleteTargetCatId(e.target.value)}
                      className="mt-1.5 w-full px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                    >
                      {categories
                        .filter((c) => c.id !== deletingCategory.id && !c.deleted)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl hover:bg-rose-50/50 dark:hover:bg-rose-950/20 cursor-pointer text-rose-700 dark:text-rose-400">
                <input
                  type="radio"
                  name="delAction"
                  checked={deleteAction === 'delete_products'}
                  onChange={() => setDeleteAction('delete_products')}
                  className="text-rose-600"
                />
                <div>
                  <span className="font-bold block">حذف تمام کالاهای این دسته‌بندی</span>
                  <span className="text-[11px] text-rose-500/80">تمام {deletingCategory.productCount} کالا به سطل زباله منتقل می‌شوند</span>
                </div>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingCategory(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-rose-600/30"
              >
                تأیید و حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

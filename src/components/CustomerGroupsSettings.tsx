import React, { useState } from 'react';
import { CustomerGroup, User } from '../types';
import { StorageService } from '../services/storageService';
import { soundManager } from '../utils/audio';
import { Users, Plus, Edit2, Trash2, Check, X, Shield, Crown, Store, User as UserIcon, AlertTriangle } from 'lucide-react';

interface Props {
  currentUser: User;
}

export const CustomerGroupsSettings: React.FC<Props> = ({ currentUser }) => {
  const [groups, setGroups] = useState<CustomerGroup[]>(() => StorageService.getCustomerGroups());
  const [customers, setCustomers] = useState(() => StorageService.getCustomers());
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [defaultPriceLevel, setDefaultPriceLevel] = useState('خرده‌فروش');
  const [defaultDiscountPercent, setDefaultDiscountPercent] = useState<number>(0);

  const handleOpenAdd = () => {
    setName('');
    setDescription('');
    setColor('#3B82F6');
    setDefaultPriceLevel('خرده‌فروش');
    setDefaultDiscountPercent(0);
    setEditingGroup(null);
    setIsAdding(true);
  };

  const handleOpenEdit = (grp: CustomerGroup) => {
    setEditingGroup(grp);
    setName(grp.name);
    setDescription(grp.description || '');
    setColor(grp.color || '#3B82F6');
    setDefaultPriceLevel(grp.defaultPriceLevel || 'خرده‌فروش');
    setDefaultDiscountPercent(grp.defaultDiscountPercent || 0);
    setIsAdding(false);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingGroup) {
      StorageService.updateCustomerGroup(editingGroup.id, {
        name: name.trim(),
        description: description.trim() || null,
        color,
        defaultPriceLevel,
        defaultDiscountPercent: Number(defaultDiscountPercent) || 0,
      });
    } else {
      StorageService.addCustomerGroup({
        name: name.trim(),
        description: description.trim() || null,
        color,
        icon: 'Users',
        defaultPriceLevel,
        defaultDiscountPercent: Number(defaultDiscountPercent) || 0,
        displayOrder: groups.length + 1,
      });
    }

    soundManager.playSuccessSound();
    setGroups(StorageService.getCustomerGroups());
    setIsAdding(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = (id: string) => {
    if (window.confirm('آیا از حذف این گروه مشتری اطمینان دارید؟')) {
      StorageService.deleteCustomerGroup(id);
      soundManager.playSuccessSound();
      setGroups(StorageService.getCustomerGroups());
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <span>گروه‌های مشتریان</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            دسته‌بندی مشتریان، تعیین تخفیف پیش‌فرض و سطح قیمت
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن گروه جدید</span>
        </button>
      </div>

      {/* Add / Edit Form */}
      {(isAdding || editingGroup) && (
        <form onSubmit={handleSaveGroup} className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {editingGroup ? 'ویرایش گروه مشتری' : 'افزودن گروه مشتری جدید'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                نام گروه *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: همکار / پیمانکار"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                توضیحات گروه
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیح کوتاه درباره این گروه"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                سطح قیمت
              </label>
              <select
                value={defaultPriceLevel}
                onChange={(e) => setDefaultPriceLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              >
                <option value="خرده‌فروش">خرده‌فروش</option>
                <option value="عمده‌فروش">عمده‌فروش</option>
                <option value="همکار">همکار</option>
                <option value="مشتری ویژه">مشتری ویژه</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                تخفیف پیش‌فرض (٪)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={defaultDiscountPercent}
                onChange={(e) => setDefaultDiscountPercent(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                رنگ مشخصه
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingGroup(null);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              <span>ذخیره گروه</span>
            </button>
          </div>
        </form>
      )}

      {/* Groups List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map((grp) => {
          const assignedCount = customers.filter((c) => c.groupId === grp.id).length;
          return (
            <div
              key={grp.id}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
                  style={{ backgroundColor: grp.color || '#3B82F6' }}
                >
                  {grp.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{grp.name}</span>
                    {grp.defaultDiscountPercent > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold">
                        تخفیف {grp.defaultDiscountPercent}٪
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {assignedCount} مشتری · سطح: {grp.defaultPriceLevel || 'عادی'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(grp)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteGroup(grp.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Customer, CustomerGroup, User } from '../types';
import { StorageService } from '../services/storageService';
import { toEnglishDigits, formatToman } from '../utils/jalali';
import { X, Check, UserPlus, Phone, MapPin, Tag, Percent, DollarSign, Layers, Plus, Sparkles, Building2 } from 'lucide-react';

interface Props {
  initialCustomer?: Customer | null;
  groups: CustomerGroup[];
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: Partial<Customer> & { name: string; mobile: string }) => void;
  onAddGroupQuick?: (groupName: string) => void;
}

export const CustomerFormModal: React.FC<Props> = ({
  initialCustomer,
  groups,
  currentUser,
  isOpen,
  onClose,
  onSave,
  onAddGroupQuick,
}) => {
  const isEditing = !!initialCustomer;

  const [name, setName] = useState(initialCustomer?.name || '');
  const [mobile, setMobile] = useState(initialCustomer?.mobile || '');
  const [phone, setPhone] = useState(initialCustomer?.phone || '');
  const [address, setAddress] = useState(initialCustomer?.address || '');
  const [groupId, setGroupId] = useState<string>(
    initialCustomer?.groupId || (groups[0]?.id || '')
  );
  const [defaultPriceLevel, setDefaultPriceLevel] = useState(
    initialCustomer?.defaultPriceLevel || 'خرده‌فروش'
  );
  const [defaultDiscountPercent, setDefaultDiscountPercent] = useState<number>(
    initialCustomer?.defaultDiscountPercent || 0
  );
  const [notes, setNotes] = useState(initialCustomer?.notes || '');
  const [tagsStr, setTagsStr] = useState(initialCustomer?.tags?.join(', ') || '');
  const [initialDebtStr, setInitialDebtStr] = useState(
    initialCustomer?.totalDebt !== undefined ? initialCustomer.totalDebt.toString() : '0'
  );
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGroupChange = (gId: string) => {
    if (gId === '__ADD_NEW__') {
      setIsAddingNewGroup(true);
      return;
    }
    setGroupId(gId);
    const selectedG = groups.find((g) => g.id === gId);
    if (selectedG) {
      if (selectedG.defaultPriceLevel) setDefaultPriceLevel(selectedG.defaultPriceLevel);
      if (selectedG.defaultDiscountPercent !== undefined) setDefaultDiscountPercent(selectedG.defaultDiscountPercent);
    }
  };

  const handleConfirmNewGroup = () => {
    if (!newGroupName.trim()) return;
    const created = StorageService.addCustomerGroup({
      name: newGroupName.trim(),
      defaultDiscountPercent: 0,
      displayOrder: groups.length + 1,
      color: '#3B82F6',
      icon: 'Users',
    });
    setGroupId(created.id);
    setIsAddingNewGroup(false);
    setNewGroupName('');
    if (onAddGroupQuick) onAddGroupQuick(created.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('لطفاً نام مشتری را وارد نمایید');
      return;
    }
    const cleanMobile = toEnglishDigits(mobile).trim();
    if (!cleanMobile) {
      setError('لطفاً شماره موبایل مشتری را وارد نمایید');
      return;
    }

    const cleanDebt = parseInt(toEnglishDigits(initialDebtStr).replace(/[^0-9-]/g, ''), 10) || 0;
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      name: name.trim(),
      mobile: cleanMobile,
      phone: toEnglishDigits(phone).trim() || null,
      address: address.trim() || null,
      groupId: groupId || null,
      defaultPriceLevel,
      defaultDiscountPercent: Number(defaultDiscountPercent) || 0,
      notes: notes.trim() || null,
      tags,
      totalDebt: cleanDebt,
      debt: cleanDebt,
      isActive: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              👤
            </div>
            <h3 className="text-sm font-bold">
              {isEditing ? 'ویرایش مشخصات مشتری' : 'افزودن مشتری جدید'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نام و نام خانوادگی / عنوان شرکت *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setError('');
                  setName(e.target.value);
                }}
                placeholder="مثال: علی رضایی یا شرکت سازه‌گستر"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  شماره موبایل *
                </label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => {
                    setError('');
                    setMobile(toEnglishDigits(e.target.value));
                  }}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تلفن ثابت (اختیاری)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(toEnglishDigits(e.target.value))}
                  placeholder="۰۲۱۱۲۳۴۵۶۷۸"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                آدرس محل کار / تحویل فاکتور
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="تهران، خیابان..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Section 2: Group, Price Level & Discount */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Group */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    گروه مشتری
                  </label>
                </div>
                {isAddingNewGroup ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="نام گروه جدید"
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-amber-500 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmNewGroup}
                      className="px-2.5 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold"
                    >
                      تأیید
                    </button>
                  </div>
                ) : (
                  <select
                    value={groupId}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (تخفیف: {g.defaultDiscountPercent}٪)
                      </option>
                    ))}
                    <option value="__ADD_NEW__">➕ افزودن گروه جدید...</option>
                  </select>
                )}
              </div>

              {/* Price level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سطح قیمت
                </label>
                <select
                  value={defaultPriceLevel}
                  onChange={(e) => setDefaultPriceLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="خرده‌فروش">خرده‌فروش (قیمت عادی)</option>
                  <option value="عمده‌فروش">عمده‌فروش (قیمت عمده)</option>
                  <option value="همکار">همکار (قیمت همکار)</option>
                  <option value="مشتری ویژه">مشتری ویژه (تخفیف ویژه)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Default discount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تخفیف پیش‌فرض (درصد)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={defaultDiscountPercent}
                    onChange={(e) => setDefaultDiscountPercent(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">٪</span>
                </div>
              </div>

              {/* Initial debt (only for new customer) */}
              {!isEditing && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    مانده بدهی اولیه (تومان)
                  </label>
                  <input
                    type="text"
                    value={initialDebtStr ? formatToman(parseInt(toEnglishDigits(initialDebtStr), 10) || 0).replace(' تومان', '') : '۰'}
                    onChange={(e) => setInitialDebtStr(toEnglishDigits(e.target.value))}
                    placeholder="۰"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Notes & Tags */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                برچسب‌ها (با ویرگول جدا کنید)
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="مثال: پیمانکار, پروژه‌ای, خوش‌حساب"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                یادداشت و توضیحات داخلی
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات مربوط به نحوه تسویه یا پروژه..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100"
            >
              لغو
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>ذخیره مشخصات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

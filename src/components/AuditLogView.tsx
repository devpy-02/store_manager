import React, { useState } from 'react';
import { AuditLog, User, ChangeType } from '../types';
import { formatPersianDateTime, timeAgoPersian } from '../utils/jalali';
import { History, Search, Filter, TrendingUp, TrendingDown, PlusCircle, Edit3, Trash2, RotateCcw, User as UserIcon } from 'lucide-react';

interface Props {
  auditLogs: AuditLog[];
  users: User[];
  onClearLogs?: () => void;
}

export const AuditLogView: React.FC<Props> = ({ auditLogs, users }) => {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedUser !== 'all' && log.changedBy !== selectedUser) return false;
    if (selectedType !== 'all' && log.changeType !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = log.productName.toLowerCase().includes(q);
      const matchUser = log.changedByName.toLowerCase().includes(q);
      if (!matchName && !matchUser) return false;
    }
    return true;
  });

  const getLogTypeBadge = (type: ChangeType) => {
    switch (type) {
      case 'price_update':
        return {
          label: 'تغییر قیمت',
          icon: TrendingUp,
          color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'stock_update':
        return {
          label: 'تغییر موجودی',
          icon: Edit3,
          color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'create_product':
        return {
          label: 'کالای جدید',
          icon: PlusCircle,
          color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'edit_product':
        return {
          label: 'ویرایش مشخصات',
          icon: Edit3,
          color: 'text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'delete_product':
        return {
          label: 'حذف کالا',
          icon: Trash2,
          color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
      default:
        return {
          label: 'تغییرات',
          icon: RotateCcw,
          color: 'text-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            <span>تاریخچه تغییرات قیمت و موجودی (Audit Log)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ثبت خودکار تمامی تغییرات انجام شده توسط پدر، پسر و فروشندگان
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-850 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در نام ابزار یا نام کاربر..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              فیلتر بر اساس کاربر:
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">همه کاربران (پدر، پسر، فروشندگان)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'admin' ? 'مدیر' : 'فروشنده'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              نوع عملیات:
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">همه رویدادها</option>
              <option value="price_update">تغییر قیمت</option>
              <option value="stock_update">تغییر موجودی</option>
              <option value="create_product">ایجاد کالای جدید</option>
              <option value="edit_product">ویرایش مشخصات</option>
              <option value="delete_product">حذف کالا</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
            <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              هیچ رکوردی در تاریخچه یافت نشد
            </p>
            <p className="text-xs text-slate-400 mt-1">
              با تغییر قیمت یا موجودی ابزارها، لاگ‌های تغییرات اینجا ثبت می‌شوند.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getLogTypeBadge(log.changeType);
            const BadgeIcon = badge.icon;
            return (
              <div
                key={log.id}
                className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
              >
                {/* Header: User name, role badge, timestamp */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                      {log.changedByName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {log.changedByName}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {timeAgoPersian(log.changedAt)}
                  </span>
                </div>

                {/* Product Name & Badge */}
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {log.productName}
                  </h4>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.color} shrink-0`}
                  >
                    <BadgeIcon className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Diff box: Old -> New */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-750 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block">مقدار قبلی:</span>
                    <span className="font-medium text-slate-600 dark:text-slate-400 line-through truncate tabular-nums">
                      {log.oldValue}
                    </span>
                  </div>

                  <div className="text-slate-400 shrink-0 font-bold text-sm">⬅️</div>

                  <div className="text-left min-w-0">
                    <span className="text-[10px] text-slate-400 block text-left">مقدار جدید:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {log.newValue}
                    </span>
                  </div>
                </div>

                {/* Timestamp in Jalali / Shamsi Calendar */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 border-t border-slate-100 dark:border-slate-800/60">
                  <span>تاریخ خورشیدی: {formatPersianDateTime(log.changedAt)}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    {log.synced ? '✓ ثبت در پایگاه داده' : 'در صف همگام‌سازی'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

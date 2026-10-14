import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  Package,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import { Product, StockBatch, User } from '../types';
import { StorageService } from '../services/storageService';
import { formatToman, toPersianDigits, formatPersianDateTime } from '../utils/jalali';
import { soundManager } from '../utils/audio';

interface Props {
  currentUser: User;
  products: Product[];
  categories: { id: string; name: string }[];
}

export const ExpiryReportView: React.FC<Props> = ({ currentUser, products, categories }) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'expired' | 'critical' | 'warning' | 'healthy'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [daysRange, setDaysRange] = useState<number>(30); // 30 days future default
  const [searchQuery, setSearchQuery] = useState('');

  const batches = StorageService.getStockBatches();
  const expirySettings = StorageService.getDefaultExpirySettings();
  const now = Date.now();

  const evaluated = batches.map((b) => {
    const product = products.find((p) => p.id === b.productId);
    const warningDays = product?.expiryWarningDays ?? expirySettings.defaultExpiryWarningDays;
    const criticalDays = product?.expiryCriticalDays ?? expirySettings.defaultExpiryCriticalDays;
    const expiryTime = new Date(b.expiryDate).getTime();
    const diffDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

    let status: 'expired' | 'critical' | 'warning' | 'healthy' = 'healthy';
    if (diffDays < 0) status = 'expired';
    else if (diffDays <= criticalDays) status = 'critical';
    else if (diffDays <= warningDays) status = 'warning';

    return {
      ...b,
      diffDays,
      status,
      product,
    };
  });

  const filtered = evaluated.filter((b) => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (selectedCategory !== 'همه' && b.product?.category !== selectedCategory) return false;
    if (daysRange > 0 && b.diffDays > daysRange && b.status !== 'expired') return false;
    if (searchQuery && !b.productName.includes(searchQuery) && !b.batchNumber?.includes(searchQuery)) return false;
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['نام کالا', 'شماره بچ', 'تعداد', 'تاریخ انقضا', 'وضعیت', 'تأمین‌کننده'];
    const rows = filtered.map((b) => [
      b.productName,
      b.batchNumber || '---',
      b.remainingQuantity,
      formatPersianDateTime(b.expiryDate).split(' - ')[0],
      b.status === 'expired' ? 'منقضی شده' : b.status === 'critical' ? 'بحرانی' : b.status === 'warning' ? 'نزدیک به انقضا' : 'سالم',
      b.supplierName || '---',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expiry_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundManager.playSuccessSound();
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">📋 گزارش کالاهای دارای انقضا</h2>
            <p className="text-xs text-slate-400">لیست جامع بچ‌های انبار بر اساس تاریخ انقضا و وضعیت سلامت</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>خروجی Excel / CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ گزارش</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">فیلتر وضعیت</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="expired">منقضی شده</option>
              <option value="critical">هشدار بحرانی</option>
              <option value="warning">نزدیک به انقضا</option>
              <option value="healthy">سالم</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">دسته‌بندی کالا</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
            >
              <option value="همه">همه دسته‌ها</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">بازه زمانی انقضا</label>
            <select
              value={daysRange}
              onChange={(e) => setDaysRange(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
            >
              <option value={30}>۳۰ روز آینده</option>
              <option value={60}>۶۰ روز آینده</option>
              <option value={90}>۹۰ روز آینده</option>
              <option value={180}>۶ ماه آینده</option>
              <option value={365}>یک سال آینده</option>
              <option value={0}>بدون محدودیت بازه</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی نام کالا یا شماره بچ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">نام کالا</th>
                <th className="p-3.5">شماره بچ</th>
                <th className="p-3.5">موجودی بچ</th>
                <th className="p-3.5">تاریخ انقضا</th>
                <th className="p-3.5">وضعیت</th>
                <th className="p-3.5">تأمین‌کننده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    هیچ موردی برای نمایش وجود ندارد.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">{b.productName}</td>
                    <td className="p-3.5 font-mono font-medium text-slate-700 dark:text-slate-300">{b.batchNumber || '---'}</td>
                    <td className="p-3.5 font-bold text-amber-600 dark:text-amber-400">{toPersianDigits(b.remainingQuantity)} عدد</td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{formatPersianDateTime(b.expiryDate).split(' - ')[0]}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full inline-block ${
                          b.status === 'expired'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : b.status === 'critical'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : b.status === 'warning'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {b.status === 'expired'
                          ? 'منقضی شده'
                          : b.status === 'critical'
                          ? `${toPersianDigits(b.diffDays)} روز (بحرانی)`
                          : b.status === 'warning'
                          ? `${toPersianDigits(b.diffDays)} روز`
                          : 'سالم'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">{b.supplierName || '---'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

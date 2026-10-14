import React, { useState, useMemo } from 'react';
import { Customer, CustomerGroup, User, Invoice } from '../types';
import { StorageService } from '../services/storageService';
import { formatToman, toPersianDigits, formatPersianDateTime } from '../utils/jalali';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerStatementModal } from './CustomerStatementModal';
import { RegisterPaymentModal } from './RegisterPaymentModal';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  MapPin,
  Tag,
  CreditCard,
  FileText,
  Plus,
  ArrowRight,
  Edit2,
  Trash2,
  CheckCircle2,
  DollarSign,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';

interface Props {
  currentUser: User;
  customers: Customer[];
  groups: CustomerGroup[];
  invoices: Invoice[];
  onAddCustomer: (customerData: Partial<Customer> & { name: string; mobile: string }) => void;
  onUpdateCustomer: (id: string, customerData: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
  onCreateInvoiceForCustomer: (customer: Customer) => void;
}

export const CustomersView: React.FC<Props> = ({
  currentUser,
  customers,
  groups,
  invoices,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onCreateInvoiceForCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'debtor' | 'settled' | 'creditor'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (c.deleted) return false;

      // Group filter
      if (selectedGroupId !== 'all' && c.groupId !== selectedGroupId) return false;

      // Debt filter
      if (debtFilter === 'debtor' && c.totalDebt <= 0) return false;
      if (debtFilter === 'settled' && c.totalDebt !== 0) return false;
      if (debtFilter === 'creditor' && c.totalDebt >= 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchMobile = (c.mobile || '').includes(q);
        const matchPhone = (c.phone || '').includes(q);
        const matchCode = (c.customerCode || '').toLowerCase().includes(q);
        const matchAddress = (c.address || '').toLowerCase().includes(q);
        return matchName || matchMobile || matchPhone || matchCode || matchAddress;
      }

      return true;
    });
  }, [customers, selectedGroupId, debtFilter, searchQuery]);

  // Customer transactions/invoices
  const customerInvoices = useMemo(() => {
    if (!activeCustomer) return [];
    return invoices
      .filter((i) => i.customerId === activeCustomer.id && !i.deleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeCustomer, invoices]);

  const customerLedger = useMemo(() => {
    if (!activeCustomer) return [];
    return StorageService.getCustomerLedgerByCustomerId(activeCustomer.id);
  }, [activeCustomer]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCustomer(c);
    setIsFormModalOpen(true);
  };

  const handleSaveCustomerForm = (data: Partial<Customer> & { name: string; mobile: string }) => {
    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, data);
      if (activeCustomer && activeCustomer.id === editingCustomer.id) {
        setActiveCustomer({ ...activeCustomer, ...data });
      }
    } else {
      onAddCustomer(data);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* If Active Customer -> Profile View */}
      {activeCustomer ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Back to list button */}
          <button
            onClick={() => setActiveCustomer(null)}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به لیست مخاطبین</span>
          </button>

          {/* Customer Profile Header Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-lg shadow-inner">
                  {activeCustomer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                      {activeCustomer.name}
                    </h2>
                    <span className="text-xs font-mono text-slate-400">
                      ({activeCustomer.customerCode})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    <span>📱 {toPersianDigits(activeCustomer.mobile)}</span>
                    {activeCustomer.phone && <span>· ☎️ {toPersianDigits(activeCustomer.phone)}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleOpenEdit(activeCustomer, e)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>ویرایش</span>
                </button>
              </div>
            </div>

            {/* Address & Group Info */}
            <div className="flex flex-wrap items-center gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              {activeCustomer.groupId && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {groups.find((g) => g.id === activeCustomer.groupId)?.name || 'بدون گروه'}
                  </span>
                  {activeCustomer.defaultDiscountPercent > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-mono">
                      (تخفیف {activeCustomer.defaultDiscountPercent}٪)
                    </span>
                  )}
                </div>
              )}

              {activeCustomer.address && (
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeCustomer.address}</span>
                </div>
              )}
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-right">
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold block">
                  💰 مانده حساب
                </span>
                <span className="text-sm sm:text-base font-black text-amber-900 dark:text-amber-200 font-mono mt-0.5 block">
                  {formatToman(activeCustomer.totalDebt)}
                </span>
              </div>

              <div className="p-3.5 bg-blue-500/10 border border-blue-500/25 rounded-2xl text-right">
                <span className="text-[11px] text-blue-800 dark:text-blue-300 font-bold block">
                  📊 مجموع خرید
                </span>
                <span className="text-sm sm:text-base font-bold text-blue-900 dark:text-blue-200 font-mono mt-0.5 block">
                  {formatToman(activeCustomer.totalPurchases || 0)}
                </span>
              </div>

              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-right">
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block">
                  💵 مجموع پرداخت
                </span>
                <span className="text-sm sm:text-base font-bold text-emerald-900 dark:text-emerald-200 font-mono mt-0.5 block">
                  {formatToman(activeCustomer.totalPayments || 0)}
                </span>
              </div>

              <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-right">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold block">
                  🛒 تعداد فاکتور
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
                  {toPersianDigits(customerInvoices.length)} فاکتور
                </span>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                <span>ثبت پرداخت وجه</span>
              </button>

              <button
                onClick={() => onCreateInvoiceForCustomer(activeCustomer)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>فاکتور جدید</span>
              </button>

              <button
                onClick={() => setIsStatementModalOpen(true)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>مشاهده صورتحساب</span>
              </button>
            </div>
          </div>

          {/* Recent Transactions Timeline */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>آخرین تراکنش‌ها و اسناد دفتر حساب</span>
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {customerLedger.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  هیچ تراکنشی هنوز ثبت نشده است
                </div>
              ) : (
                customerLedger.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {entry.description}
                        </span>
                        {entry.referenceNumber && (
                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                            ({entry.referenceNumber})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                        {toPersianDigits(entry.date)} · {toPersianDigits(entry.time)}
                      </span>
                    </div>

                    <div className="text-left font-mono">
                      {entry.debit > 0 && (
                        <span className="text-amber-700 dark:text-amber-400 font-bold block">
                          +{formatToman(entry.debit)}
                        </span>
                      )}
                      {entry.credit > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                          -{formatToman(entry.credit)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 block">
                        مانده: {formatToman(entry.balanceAfter)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Customer List Page */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-lg">
                👥
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                  مخاطبین و مشتریان
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  مدیریت حساب مشتریان، گروه‌ها و پیگیری بدهی‌ها
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>افزودن مشتری جدید</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="space-y-2.5 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام، موبایل، تلفن، کد مشتری یا آدرس..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px] font-bold">فیلتر بدهی:</span>
              {[
                { id: 'all', label: 'همه' },
                { id: 'debtor', label: 'بدهکاران 🟡' },
                { id: 'settled', label: 'بدون بدهی ✅' },
                { id: 'creditor', label: 'طلبکاران 🟢' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDebtFilter(f.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                    debtFilter === f.id
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <span className="text-slate-400 text-[11px] font-bold mr-2">گروه:</span>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs outline-none"
              >
                <option value="all">همه گروه‌ها</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredCustomers.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-bold">هیچ مخاطبی یافت نشد</p>
                <p className="text-[11px] text-slate-400">
                  جستجو را تغییر دهید یا با کلیک بر روی «افزودن مشتری جدید» مخاطب بسازید.
                </p>
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const groupName = groups.find((g) => g.id === c.groupId)?.name || 'عادی';
                const hasDebt = c.totalDebt > 0;
                const isCreditor = c.totalDebt < 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveCustomer(c)}
                    className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-sm flex items-center justify-center">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{c.name}</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {toPersianDigits(c.mobile)} · {c.customerCode}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {groupName}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>مانده حساب:</span>
                      </div>

                      <div className="text-left font-mono font-black">
                        {hasDebt ? (
                          <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <span>بدهی: {formatToman(c.totalDebt)}</span>
                            <span>🟡</span>
                          </span>
                        ) : isCreditor ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span>طلبکار: {formatToman(Math.abs(c.totalDebt))}</span>
                            <span>🟢</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span>۰ تومان (تسویه)</span>
                            <span>✅</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isFormModalOpen && (
        <CustomerFormModal
          initialCustomer={editingCustomer}
          groups={groups}
          currentUser={currentUser}
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveCustomerForm}
        />
      )}

      {/* Customer Statement Modal */}
      {isStatementModalOpen && activeCustomer && (
        <CustomerStatementModal
          customer={activeCustomer}
          currentUser={currentUser}
          isOpen={isStatementModalOpen}
          onClose={() => setIsStatementModalOpen(false)}
        />
      )}

      {/* Register Payment Modal */}
      {isPaymentModalOpen && activeCustomer && (
        <RegisterPaymentModal
          customer={activeCustomer}
          currentUser={currentUser}
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaymentRegistered={() => {
            const updated = StorageService.getCustomerById(activeCustomer.id);
            if (updated) setActiveCustomer(updated);
          }}
        />
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown as InvChevDown, ChevronLeft as InvChevLeft } from 'lucide-react';
import { BuyPriceConflictModal, ConflictRow } from './BuyPriceConflictModal';
import { LossWarningModal, LossRow } from './LossWarningModal';
import { DEFAULT_LOCATION_ID as INV_DEFAULT_LOC, StorageService as InvStorage } from '../services/storageService';
import {
  Invoice,
  InvoiceType,
  InvoiceItem,
  DiscountType,
  PaymentStatus,
  PaymentMethod,
  Product,
  Customer,
  User,
} from '../types';
import {
  formatToman,
  toPersianDigits,
  toEnglishDigits,
  formatPersianDateShort,
} from '../utils/jalali';
import { CustomerSelectModal } from './CustomerSelectModal';
import { ProductSelectModal } from './ProductSelectModal';
import {
  X,
  Plus,
  Trash2,
  User as UserIcon,
  ShoppingBag,
  Store,
  ArrowDownLeft,
  RotateCcw,
  ArrowUpRight,
  Eye,
  Check,
  Calendar,
  Clock,
  Building,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  Search,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  FileText,
  CornerDownLeft,
  Tag,
} from 'lucide-react';

interface Props {
  type: InvoiceType;
  products: Product[];
  customers: Customer[];
  existingInvoices: Invoice[];
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'createdBy' | 'createdByName'>) => void;
  onAddCustomer: (customerData: Partial<Customer> & { name: string; mobile: string }) => Customer;
  onPreviewInvoice?: (invoice: Invoice) => void;
}

export const InvoiceFormModal: React.FC<Props> = ({
  type,
  products,
  customers,
  existingInvoices,
  currentUser,
  isOpen,
  onClose,
  onSubmit,
  onAddCustomer,
  onPreviewInvoice,
}) => {
  const isReturn = type === 'sales_return' || type === 'purchase_return';

  // Wizard Step for Return Invoices (Step 1: Select Original Invoice, Step 2: Return Items & Settlement)
  const [returnStep, setReturnStep] = useState<1 | 2>(1);
  const [returnCustomerSearch, setReturnCustomerSearch] = useState('');
  const [selectedCustomerFilterId, setSelectedCustomerFilterId] = useState<string>('all');

  // Track original max quantity per item ID for return limits
  const [originalMaxQuantities, setOriginalMaxQuantities] = useState<Record<string, number>>({});
  // Track which items from the original invoice are included for return
  const [includedReturnItemIds, setIncludedReturnItemIds] = useState<Record<string, boolean>>({});

  // Reset steps when modal opens or invoice type changes
  useEffect(() => {
    if (isOpen) {
      setReturnStep(1);
      setReturnCustomerSearch('');
      setSelectedCustomerFilterId('all');
    }
  }, [isOpen, type]);

  // Serial prefix
  const invoicePrefix = {
    sales: 'ف',
    purchase: 'خ',
    retail: 'خرد',
    purchase_return: 'برخ',
    sales_return: 'برف',
  }[type];

  const typeConfig = {
    sales: {
      title: 'فاکتور فروش جدید',
      color: 'emerald',
      priceLabel: 'قیمت فروش',
      badge: 'فروش به مشتری',
    },
    purchase: {
      title: 'فاکتور خرید جدید',
      color: 'blue',
      priceLabel: 'قیمت خرید',
      badge: 'ورود به انبار',
    },
    retail: {
      title: 'فاکتور خرده‌فروشی جدید',
      color: 'amber',
      priceLabel: 'قیمت فروش',
      badge: 'فروش نقدی پیشخوان',
    },
    purchase_return: {
      title: 'فاکتور برگشت از خرید',
      color: 'red',
      priceLabel: 'قیمت مرجوعی',
      badge: 'مرجوع به تأمین‌کننده',
    },
    sales_return: {
      title: 'فاکتور برگشت از فروش',
      color: 'rose',
      priceLabel: 'قیمت استرداد',
      badge: 'مرجوعی مشتری',
    },
  }[type];

  // Date and Time
  const now = new Date();
  const defaultDate = formatPersianDateShort(now);
  const defaultTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);

  // Customer or Supplier
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  // Return Invoices specific state
  const [originalInvoiceId, setOriginalInvoiceId] = useState('');
  const [selectedOriginalInvoice, setSelectedOriginalInvoice] = useState<Invoice | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState<'refund' | 'exchange' | 'credit'>('refund');

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Invoice-level discount & tax
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<DiscountType>('none');
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState<string>('0');
  const [taxValue, setTaxValue] = useState<string>('0');

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('full');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Effective items (for return invoices, only items marked as included)
  const effectiveItems = useMemo(() => {
    if (!isReturn) return items;
    return items.filter((item) => includedReturnItemIds[item.id] !== false);
  }, [items, isReturn, includedReturnItemIds]);

  // Calculations
  const subtotal = useMemo(() => {
    return effectiveItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [effectiveItems]);

  const invoiceDiscount = useMemo(() => {
    const rawVal = parseInt(toEnglishDigits(invoiceDiscountValue).replace(/[^0-9]/g, ''), 10) || 0;
    if (invoiceDiscountType === 'none') return 0;
    if (invoiceDiscountType === 'percent') {
      const pct = Math.min(100, Math.max(0, rawVal));
      return Math.round((subtotal * pct) / 100);
    }
    return Math.min(subtotal, rawVal);
  }, [subtotal, invoiceDiscountType, invoiceDiscountValue]);

  const tax = useMemo(() => {
    return parseInt(toEnglishDigits(taxValue).replace(/[^0-9]/g, ''), 10) || 0;
  }, [taxValue]);

  const finalTotal = useMemo(() => {
    return Math.max(0, subtotal - invoiceDiscount + tax);
  }, [subtotal, invoiceDiscount, tax]);

  const totalDiscount = useMemo(() => {
    const itemDiscounts = effectiveItems.reduce((sum, item) => {
      const rawPrice = item.quantity * item.unitPrice;
      return sum + (rawPrice - item.totalPrice);
    }, 0);
    return itemDiscounts + invoiceDiscount;
  }, [effectiveItems, invoiceDiscount]);

  const totalProfit = useMemo(() => {
    if (type !== 'sales' && type !== 'retail') return undefined;
    const itemsProfit = effectiveItems.reduce((sum, item) => sum + (item.profit || 0), 0);
    return itemsProfit - invoiceDiscount;
  }, [effectiveItems, invoiceDiscount, type]);

  // Sync paid amount when final total or status changes
  useEffect(() => {
    if (paymentStatus === 'full') {
      setPaidAmountInput(finalTotal.toString());
    } else if (paymentStatus === 'credit') {
      setPaidAmountInput('0');
    } else if (paymentStatus === 'partial' && paidAmountInput === '') {
      setPaidAmountInput(Math.round(finalTotal / 2).toString());
    }
  }, [paymentStatus, finalTotal]);

  const paidAmount = useMemo(() => {
    const val = parseInt(toEnglishDigits(paidAmountInput).replace(/[^0-9]/g, ''), 10);
    return isNaN(val) ? 0 : val;
  }, [paidAmountInput]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, finalTotal - paidAmount);
  }, [finalTotal, paidAmount]);

  // Eligible original invoices for returns
  const eligibleOriginalInvoices = useMemo(() => {
    if (type === 'sales_return') {
      return existingInvoices.filter((i) => i.type === 'sales' || i.type === 'retail');
    }
    if (type === 'purchase_return') {
      return existingInvoices.filter((i) => i.type === 'purchase');
    }
    return [];
  }, [existingInvoices, type]);

  // Filtered original invoices based on user search and customer filter (Part 8)
  const filteredOriginalInvoices = useMemo(() => {
    return eligibleOriginalInvoices.filter((inv) => {
      if (selectedCustomerFilterId !== 'all') {
        if (inv.customerId !== selectedCustomerFilterId) return false;
      }
      if (returnCustomerSearch.trim()) {
        const q = returnCustomerSearch.trim().toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchCust = (inv.customerName || '').toLowerCase().includes(q);
        const matchSupp = (inv.supplierName || '').toLowerCase().includes(q);
        const matchPhone = ((inv.customerPhone || '') + (inv.supplierPhone || '')).includes(q);
        const matchItems = inv.items.some((it) => it.productName.toLowerCase().includes(q));
        if (!matchNum && !matchCust && !matchSupp && !matchPhone && !matchItems) return false;
      }
      return true;
    });
  }, [eligibleOriginalInvoices, selectedCustomerFilterId, returnCustomerSearch]);

  // Selection of original invoice
  const handleSelectOriginalInvoice = (invoice: Invoice) => {
    setOriginalInvoiceId(invoice.id);
    setSelectedOriginalInvoice(invoice);

    if (invoice.customerId) {
      const cust = customers.find((c) => c.id === invoice.customerId);
      if (cust) setSelectedCustomer(cust);
    }
    if (invoice.supplierName) {
      setSupplierName(invoice.supplierName);
      setSupplierPhone(invoice.supplierPhone || '');
    }

    const maxMap: Record<string, number> = {};
    const inclusionMap: Record<string, boolean> = {};

    const returnItems: InvoiceItem[] = invoice.items.map((it) => {
      const newId = `item_ret_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      maxMap[newId] = it.quantity;
      inclusionMap[newId] = true;
      return {
        ...it,
        id: newId,
        quantity: it.quantity,
        discountType: 'none',
        discountValue: 0,
        totalPrice: it.quantity * it.unitPrice,
      };
    });

    setOriginalMaxQuantities(maxMap);
    setIncludedReturnItemIds(inclusionMap);
    setItems(returnItems);
    setReturnStep(2);
  };

  const toggleIncludeItem = (itemId: string) => {
    setIncludedReturnItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  if (!isOpen) return null;

  // Add Item manually
  const handleAddProduct = (product: Product) => {
    const isBuy = type === 'purchase' || type === 'purchase_return';
    const unitPrice = isBuy ? product.buyPrice || product.price : product.price;
    const buyPrice = product.buyPrice || Math.round(product.price * 0.8);
    const qty = 1;
    const lineTotal = qty * unitPrice;

    const profit = !isBuy ? (unitPrice - buyPrice) * qty : undefined;
    const profitPercent = !isBuy && buyPrice > 0 ? (profit! / (buyPrice * qty)) * 100 : undefined;

    const newItem: InvoiceItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      unit: product.unit,
      quantity: qty,
      unitPrice,
      buyPrice,
      discountType: 'none',
      discountValue: 0,
      totalPrice: lineTotal,
      profit,
      profitPercent,
      deductFromStock: product.deductFromStock !== undefined ? product.deductFromStock : true,
    };

    setItems((prev) => [...prev, newItem]);
    if (isReturn) {
      setIncludedReturnItemIds((prev) => ({ ...prev, [newItem.id]: true }));
    }
  };

  // Update item field
  const updateItem = (id: string, updates: Partial<InvoiceItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        // Recalculate item line total
        const rawTotal = updated.quantity * updated.unitPrice;
        let lineDiscount = 0;
        if (updated.discountType === 'amount') {
          lineDiscount = Math.min(rawTotal, updated.discountValue || 0);
        } else if (updated.discountType === 'percent') {
          lineDiscount = Math.round((rawTotal * (updated.discountValue || 0)) / 100);
        }
        updated.totalPrice = Math.max(0, rawTotal - lineDiscount);

        // Recalculate item profit
        if (updated.buyPrice && (type === 'sales' || type === 'retail')) {
          const totalCost = updated.quantity * updated.buyPrice;
          updated.profit = updated.totalPrice - totalCost;
          updated.profitPercent = totalCost > 0 ? (updated.profit / totalCost) * 100 : 0;
        }

        return updated;
      })
    );
  };

  type Split = NonNullable<InvoiceItem['locationSplits']>[number];
  const setSplits = (item: InvoiceItem, next: Split[]) => updateItem(item.id, { locationSplits: next });
  const setSplit = (item: InvoiceItem, idx: number, patch: Partial<Split>) =>
    setSplits(item, (item.locationSplits || []).map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const addSplit = (item: InvoiceItem) =>
    setSplits(item, [...(item.locationSplits || []), { locationId: invLocation, quantity: 0, batchId: null }]);
  const removeSplit = (item: InvoiceItem, idx: number) =>
    setSplits(item, (item.locationSplits || []).filter((_, i) => i !== idx));

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Profit Badge Renderer
  const renderProfitBadge = (profit?: number, percent?: number) => {
    if (profit === undefined || percent === undefined) return null;

    let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    let icon = '🟢';

    if (percent <= 0) {
      badgeColor = 'bg-red-900 text-white';
      icon = '🚫';
    } else if (percent < 5) {
      badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      icon = '🔴';
    } else if (percent < 10) {
      badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      icon = '🟠';
    } else if (percent < 20) {
      badgeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
      icon = '🟡';
    }

    return (
      <div className={`mt-2 p-2 rounded-xl text-xs font-bold flex items-center justify-between ${badgeColor}`}>
        <span>
          💰 سود این قلم: {formatToman(profit)} ({toPersianDigits(percent.toFixed(1))}٪)
        </span>
        <span className="text-sm">{icon}</span>
      </div>
    );
  };

  // Submit Handler
  const [invLocation, setInvLocation] = useState<string>(INV_DEFAULT_LOC);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [conflictRows, setConflictRows] = useState<ConflictRow[] | null>(null);
  const conflictDecided = useRef(false);
  const [lossRows, setLossRows] = useState<LossRow[] | null>(null);
  const lossDecided = useRef(false);
  const conflictApply = useRef<Record<string, boolean>>({});
  // پیش‌فرض همه‌ی ردیف‌ها باز هستند؛ فقط آن‌هایی که بسته شده‌اند false دارند
  const rowOpen = (id: string) => expandedItems[id] !== false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // فروش: اگر قیمت فروش از قیمت خرید کمتر است، هشدار زیان
    if ((type === 'sales' || type === 'retail') && !lossDecided.current) {
      const rows: LossRow[] = [];
      effectiveItems.forEach((it) => {
        const prod = InvStorage.getProducts().find((p) => p.id === it.productId);
        const buy = prod?.buyPrice || it.buyPrice || 0;
        if (buy > 0 && it.unitPrice < buy) rows.push({ key: it.id, name: it.productName, sell: it.unitPrice, buy });
      });
      if (rows.length) {
        setLossRows(rows);
        return;
      }
    }

    // خرید: اگر قیمت خرید جدید سود را کمتر از سود تعریف‌شده کند، اول از فروشنده بپرس
    if (type === 'purchase' && !conflictDecided.current) {
      const rows: ConflictRow[] = [];
      effectiveItems.forEach((it) => {
        const prod = InvStorage.getProducts().find((p) => p.id === it.productId);
        if (!prod) return;
        const c = InvStorage.buyPriceConflict(prod, it.unitPrice);
        if (c) rows.push({ key: it.id, name: it.productName, newBuy: it.unitPrice, current: c.current, target: c.target });
      });
      if (rows.length) {
        setConflictRows(rows);
        return;
      }
    }

    if (effectiveItems.length === 0) {
      setErrorMessage('حداقل یک قلم کالا برای این فاکتور انتخاب نمایید');
      return;
    }

    // Customer is required for sales and sales return
    if ((type === 'sales' || type === 'sales_return') && !selectedCustomer) {
      setErrorMessage('انتخاب مشتری برای فاکتور فروش و برگشت از فروش الزامی است');
      return;
    }

    // Return reason required for return invoices
    if ((type === 'purchase_return' || type === 'sales_return') && !returnReason.trim()) {
      setErrorMessage('ثبت علت مرجوعی کالا الزامی است');
      return;
    }

    if (type === 'sales' || type === 'retail') {
      for (const it of items) {
        if (!it.batchId) continue;
        const b = InvStorage.getStockBatches().find((x) => x.id === it.batchId);
        if (b && it.quantity > b.remainingQuantity) {
          setErrorMessage(`تعداد «${it.productName}» از مانده‌ی بچ ${b.batchNumber || ''} (${toPersianDigits(b.remainingQuantity)}) بیشتر است.`);
          return;
        }
      }
    }

    for (const it of items) {
      if (!it.locationSplits || it.locationSplits.length === 0) continue;
      const sum = it.locationSplits.reduce((s2, x) => s2 + (x.quantity || 0), 0);
      if (sum !== it.quantity) {
        setErrorMessage(`جمع تقسیم «${it.productName}» (${toPersianDigits(sum)}) با تعداد قلم (${toPersianDigits(it.quantity)}) برابر نیست.`);
        return;
      }
      if (it.locationSplits.some((x) => !Number.isInteger(x.quantity) || x.quantity <= 0)) {
        setErrorMessage(`تعداد هر سهم «${it.productName}» باید بزرگ‌تر از صفر باشد.`);
        return;
      }
      if (type === 'sales' || type === 'retail' || type === 'purchase_return') {
        const prod = InvStorage.getProducts().find((p) => p.id === it.productId);
        for (const x of it.locationSplits) {
          const have = prod?.locationStock?.[x.locationId] ?? 0;
          if (x.quantity > have) {
            setErrorMessage(`موجودی «${it.productName}» در این مکان کافی نیست (${toPersianDigits(have)}).`);
            return;
          }
        }
      }
    }

    onSubmit({
      type,
      locationId: invLocation,
      date,
      time,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.mobile || selectedCustomer?.phone || undefined,
      supplierName: supplierName.trim() || undefined,
      supplierPhone: supplierPhone.trim() || undefined,
      originalInvoiceId: originalInvoiceId || undefined,
      originalInvoiceNumber: selectedOriginalInvoice?.invoiceNumber,
      returnReason: returnReason.trim() || undefined,
      returnType: type === 'sales_return' ? returnType : undefined,
      items: effectiveItems.map((it) => ({ ...it, applyProfit: conflictApply.current[it.id] === true })),
      subtotal,
      discountType: invoiceDiscountType,
      discountValue: parseInt(toEnglishDigits(invoiceDiscountValue).replace(/[^0-9]/g, ''), 10) || 0,
      totalDiscount,
      tax,
      finalTotal,
      totalProfit,
      paymentStatus: type === 'retail' ? 'full' : paymentStatus,
      paidAmount: type === 'retail' ? finalTotal : paidAmount,
      remainingAmount: type === 'retail' ? 0 : remainingAmount,
      paymentMethod,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Android bottom grab handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Modal Top Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl bg-${typeConfig.color}-500/20 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400 flex items-center justify-center font-bold text-sm`}>
              {invoicePrefix}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{typeConfig.title}</span>
                <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                  {typeConfig.badge}
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* PART 8: STEP 1 - SELECT ORIGINAL INVOICE (KEY SCREEN)         */}
        {/* ============================================================== */}
        {isReturn && returnStep === 1 ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Step Indicators */}
            <div className="flex items-center justify-between p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200/80 dark:border-rose-900/40">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
                  ۱
                </span>
                <span className="text-xs font-bold text-rose-950 dark:text-rose-200">
                  مرحله ۱: انتخاب فاکتور اصلی مرجع
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                گام بعدی: انتخاب اقلام مرجوعی
              </span>
            </div>

            {/* Customer Search Box */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                جستجو یا انتخاب مشتری:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={returnCustomerSearch}
                  onChange={(e) => setReturnCustomerSearch(e.target.value)}
                  placeholder="🔍 جستجو یا انتخاب مشتری (نام، شماره تماس یا شماره فاکتور...)"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              {/* Customer Quick Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerFilterId('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                    selectedCustomerFilterId === 'all'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  همه مشتریان
                </button>
                {customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCustomerFilterId(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                      selectedCustomerFilterId === c.id
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Recent Invoices */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 dark:text-slate-200">
                <span>▼ فاکتورهای اخیر این مشتری ({toPersianDigits(filteredOriginalInvoices.length)} فاکتور):</span>
                {selectedCustomerFilterId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerFilterId('all')}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    مشاهده همه
                  </button>
                )}
              </div>

              {filteredOriginalInvoices.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    فاکتوری با این مشخصات یافت نشد
                  </p>
                  <p className="text-[11px] text-slate-400">
                    می‌توانید عبارت جستجو را پاک کنید یا برگشت کالا را بدون فاکتور قبلی ثبت نمایید.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOriginalInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-rose-400/80 rounded-2xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-slate-400 text-xs">·</span>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {inv.date} ({inv.time})
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            مشتری: {inv.customerName || inv.supplierName || 'فروشگاه'}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {toPersianDigits(inv.items.length)} قلم کالا
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">
                          اقلام: {inv.items.map((i) => i.productName).join('، ')}
                        </div>

                        <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 pt-0.5">
                          مبلغ کل فاکتور: <span className="text-rose-600 dark:text-rose-400 tabular-nums">{formatToman(inv.finalTotal)}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end sm:justify-center">
                        <button
                          type="button"
                          onClick={() => handleSelectOriginalInvoice(inv)}
                          className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all"
                        >
                          <span>انتخاب فاکتور</span>
                          <ChevronLeft className="w-4 h-4 rotate-180" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Direct manual return bypass */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setOriginalInvoiceId('');
                  setSelectedOriginalInvoice(null);
                  setReturnStep(2);
                }}
                className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 flex items-center gap-1.5 py-1 transition-colors"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>ثبت مرجوعی بدون فاکتور قبلی (ثبت دستی اقلام)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                انصراف
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* FORM BODY (STANDARD INVOICE OR STEP 2 OF RETURN INVOICE)       */
          /* ============================================================== */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {lossRows && (
            <LossWarningModal
              rows={lossRows}
              onCancel={() => setLossRows(null)}
              onProceed={() => {
                lossDecided.current = true;
                setLossRows(null);
                handleSubmit({ preventDefault: () => undefined } as unknown as React.FormEvent);
                lossDecided.current = false;
              }}
            />
          )}
          {conflictRows && (
            <BuyPriceConflictModal
              rows={conflictRows}
              onCancel={() => setConflictRows(null)}
              onConfirm={(d) => {
                conflictApply.current = d;
                conflictDecided.current = true;
                setConflictRows(null);
                handleSubmit({ preventDefault: () => undefined } as unknown as React.FormEvent);
                conflictDecided.current = false;
              }}
            />
          )}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {type === 'purchase' || type === 'sales_return' ? 'به مکان انبار' : 'از مکان انبار'}
              </label>
              <select
                value={invLocation}
                onChange={(e) => setInvLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              >
                {InvStorage.getLocationOptions().map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PART 8: STEP 2 TOP SUMMARY BANNER FOR SALES/PURCHASE RETURN */}
            {isReturn && selectedOriginalInvoice && (
              <div className="p-4 rounded-2xl bg-gradient-to-l from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-850 border border-rose-200 dark:border-rose-900/60 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-rose-900 dark:text-rose-200">
                      فاکتور اصلی: {selectedOriginalInvoice.invoiceNumber}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">({selectedOriginalInvoice.date})</span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                    طرف حساب: {selectedOriginalInvoice.customerName || selectedOriginalInvoice.supplierName || 'مشتری فروشگاه'}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    مبلغ اصلی فاکتور: <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatToman(selectedOriginalInvoice.finalTotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReturnStep(1)}
                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/50 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-bold transition-colors"
                >
                  تغییر فاکتور مرجع
                </button>
              </div>
            )}

            {/* Section 1: Meta (Invoice No, Date, Time) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  شماره فاکتور (سیستمی):
                </label>
                <div className="px-3 py-2 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-300/60 dark:border-slate-700">
                  {invoicePrefix}-۱۴۰۳-خودکار
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>تاریخ فاکتور:</span>
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 ltr text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>ساعت ثبت:</span>
                </label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 ltr text-center"
                />
              </div>
            </div>

            {/* Section 2: Customer / Supplier Selector */}
            {type === 'sales' || type === 'sales_return' ? (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  طرف حساب / مشتری <span className="text-rose-500">* (الزامی)</span>
                </label>
                {selectedCustomer ? (
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300/70 dark:border-emerald-800/60 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                        {selectedCustomer.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {selectedCustomer.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          تلفن: <span className="font-mono">{selectedCustomer.phone}</span> · وضعیت حساب:{' '}
                          <span className="font-bold tabular-nums">
                            {selectedCustomer.debt > 0
                              ? `بدهی: ${formatToman(selectedCustomer.debt)}`
                              : 'تصفیه / بستانکار'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors"
                    >
                      تغییر مشتری
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="w-full py-3 px-4 border-2 border-dashed border-amber-400 hover:border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2 transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>انتخاب مشتری (با جستجوی زنده)</span>
                  </button>
                )}
              </div>
            ) : type === 'purchase' || type === 'purchase_return' ? (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-blue-500" />
                    <span>نام تأمین‌کننده / شرکت مبدأ:</span>
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="مثال: شرکت ابزار رونیکس (دفتر پخش)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    تلفن تماس تأمین‌کننده (اختیاری):
                  </label>
                  <input
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="۰۲۱۶۶۷۰..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ltr text-left"
                  />
                </div>
              </div>
            ) : null}

            {/* Section 2.5: Reason & Settlement Type for Returns */}
            {isReturn && (
              <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-3">
                {type === 'sales_return' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      نوع تسویه استرداد:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      {(
                        [
                          ['refund', 'بازپرداخت نقدی'],
                          ['credit', 'اعتبار / کسر از بدهی'],
                          ['exchange', 'تعویض کالا'],
                        ] as const
                      ).map(([rt, label]) => (
                        <button
                          key={rt}
                          type="button"
                          onClick={() => setReturnType(rt)}
                          className={`py-2 rounded-lg font-bold transition-colors ${
                            returnType === rt
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    علت مرجوعی کالا <span className="text-rose-500">* (الزامی)</span>:
                  </label>
                  {/* Quick reason chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'خرابی فنی و نقص کارکرد',
                      'انصراف و عدم نیاز مشتری',
                      'اشتباه در انتخاب مدل/سایز',
                      'مغایرت با سفارش ثبت‌شده',
                      'آسیب‌دیدگی حین حمل',
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setReturnReason(reason)}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="علت مرجوعی را وارد یا از گزینه‌های بالا انتخاب کنید..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>
              </div>
            )}

            {/* Section 3: Items Table & Cards (PART 8: Return Items UI) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  <span>
                    {isReturn
                      ? `📦 اقلام قابل برگشت (${toPersianDigits(effectiveItems.length)} از ${toPersianDigits(items.length)} قلم)`
                      : `📦 اقلام و ردیف‌های فاکتور (${toPersianDigits(items.length)} قلم)`}
                  </span>
                </h3>

                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ افزودن محصول دیگر</span>
                </button>
              </div>

              {items.length === 0 ? (
                <div
                  onClick={() => setIsProductModalOpen(true)}
                  className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 cursor-pointer hover:border-amber-400 transition-colors space-y-1.5"
                >
                  <Plus className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    هنوز کالایی به این فاکتور اضافه نشده است
                  </p>
                  <p className="text-[11px] text-slate-400">
                    برای شروع، روی «+ افزودن محصول» کلیک نمایید.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const isIncluded = isReturn ? includedReturnItemIds[item.id] !== false : true;
                    const maxQty = originalMaxQuantities[item.id];

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl bg-white dark:bg-slate-850 border shadow-xs space-y-2.5 transition-all ${
                          isIncluded
                            ? 'border-slate-200 dark:border-slate-800'
                            : 'border-slate-200 dark:border-slate-800/60 opacity-60 bg-slate-50/50'
                        }`}
                      >
                        {/* Row Title & Return Inclusion Checkbox */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            {isReturn && (
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => toggleIncludeItem(item.id)}
                                className="w-4 h-4 text-rose-600 rounded-md focus:ring-0 cursor-pointer"
                                title="مرجوع کردن این قلم"
                              />
                            )}
                            <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs flex items-center justify-center">
                              {toPersianDigits(index + 1)}
                            </span>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                              {item.productName}
                            </h4>
                            <span className="font-mono text-[10px] text-slate-400">
                              ({item.productCode})
                            </span>
                            {/* Deduction Status Badge & Per-item toggle */}
                            {(type === 'sales' || type === 'retail') && (
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { deductFromStock: item.deductFromStock === false ? true : false })}
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold transition-colors ${
                                  item.deductFromStock === false
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                }`}
                                title="کلیک برای تغییر وضعیت کسر از انبار این قلم"
                              >
                                {item.deductFromStock === false ? 'عدم کسر موجودی' : 'کسر از انبار'}
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-lg"
                            title="حذف این ردیف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quantity & Unit Price */}
                        {/* قلم به‌صورت درختی: ردیف اصلی = کالا، شاخه‌ها = مکان/بچ/انقضا */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.locationSplits && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedItems((e) => ({ ...e, [item.id]: !rowOpen(item.id) }))}
                                  className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0"
                                  aria-label="باز یا بسته کردن شاخه‌ها"
                                >
                                  {rowOpen(item.id) ? <InvChevDown className="w-3.5 h-3.5" /> : <InvChevLeft className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  item.locationSplits
                                    ? updateItem(item.id, { locationSplits: undefined })
                                    : (updateItem(item.id, {
                                        locationSplits: [{ locationId: item.locationId || invLocation, quantity: item.quantity, batchId: item.batchId || null }],
                                      }), setExpandedItems((e) => ({ ...e, [item.id]: true })))
                                }
                                className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-900 font-bold"
                              >
                                {item.locationSplits ? 'یک‌جا (بدون شاخه)' : 'تقسیم به شاخه‌ها'}
                              </button>
                            </div>
                            {item.locationSplits && (
                              <span className={`font-bold shrink-0 ${(item.locationSplits.reduce((s2, x) => s2 + (x.quantity || 0), 0)) === item.quantity ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {toPersianDigits(item.locationSplits.length)} شاخه · جمع {toPersianDigits(item.locationSplits.reduce((s2, x) => s2 + (x.quantity || 0), 0))} از {toPersianDigits(item.quantity)}
                              </span>
                            )}
                          </div>

                          {item.locationSplits && rowOpen(item.id) && (
                            <div className="mr-3 pr-3 border-r-2 border-violet-200 dark:border-violet-900 space-y-2">
                              {item.locationSplits.map((sp, si) => (
                                <div key={si} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-slate-400 font-mono shrink-0">├─</span>
                                    <select
                                      value={sp.locationId}
                                      onChange={(e) => setSplit(item, si, { locationId: e.target.value, batchId: null })}
                                      className="flex-1 min-w-0 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    >
                                      {InvStorage.getLocationOptions().map((o) => (
                                        <option key={o.id} value={o.id}>{o.label}</option>
                                      ))}
                                    </select>
                                    <input
                                      inputMode="numeric"
                                      value={sp.quantity || ''}
                                      onChange={(e) => setSplit(item, si, { quantity: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                      className="w-16 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    />
                                    <button type="button" onClick={() => removeSplit(item, si)} className="text-rose-600 font-bold shrink-0 px-1">✕</button>
                                  </div>

                                  {type === 'purchase' && (
                                    <div className="flex items-center gap-1.5 text-xs pr-5">
                                      <span className="text-slate-500 shrink-0">انقضا:</span>
                                      <input
                                        type="date"
                                        value={sp.expiryDate ? sp.expiryDate.split('T')[0] : ''}
                                        onChange={(e) => setSplit(item, si, { expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                        className="flex-1 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                      />
                                    </div>
                                  )}

                                  {(type === 'sales' || type === 'retail') && (
                                    <div className="flex items-center gap-1.5 text-xs pr-5">
                                      <span className="text-slate-500 shrink-0">بچ:</span>
                                      <select
                                        value={sp.batchId || ''}
                                        onChange={(e) => setSplit(item, si, { batchId: e.target.value || null })}
                                        className="flex-1 min-w-0 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                      >
                                        <option value="">بدون بچ</option>
                                        {InvStorage.getStockBatches()
                                          .filter((bt) => bt.productId === item.productId && bt.remainingQuantity > 0 && (bt.locationId || INV_DEFAULT_LOC) === sp.locationId)
                                          .map((bt) => (
                                            <option key={bt.id} value={bt.id}>{bt.batchNumber || 'بدون شماره'} · مانده {toPersianDigits(bt.remainingQuantity)}</option>
                                          ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addSplit(item)}
                                className="text-[11px] font-bold text-amber-700 dark:text-amber-300"
                              >
                                + افزودن شاخه
                              </button>
                            </div>
                          )}
                        </div>

                        {!item.locationSplits && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">مکان این قلم:</label>
                            <select
                              value={item.locationId || invLocation}
                              onChange={(e) => updateItem(item.id, { locationId: e.target.value, batchId: null })}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            >
                              {InvStorage.getLocationOptions().map((o) => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                          {type === 'purchase' && (
                            <div>
                              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">تاریخ انقضا (اختیاری):</label>
                              <input
                                type="date"
                                value={item.expiryDate ? item.expiryDate.split('T')[0] : ''}
                                onChange={(e) => updateItem(item.id, { expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                          )}
                          {(type === 'sales' || type === 'retail') && (
                            <div>
                              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">بچ (انقضا):</label>
                              <select
                                value={item.batchId || ''}
                                onChange={(e) => updateItem(item.id, { batchId: e.target.value || null })}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              >
                                <option value="">بدون بچ</option>
                                {InvStorage.getStockBatches()
                                  .filter(
                                    (b) =>
                                      b.productId === item.productId &&
                                      b.remainingQuantity > 0 &&
                                      (b.locationId || INV_DEFAULT_LOC) === (item.locationId || invLocation)
                                  )
                                  .map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {b.batchNumber || 'بدون شماره'} · انقضا {new Date(b.expiryDate).toLocaleDateString('fa-IR')} · مانده {toPersianDigits(b.remainingQuantity)}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </div>

                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          {/* Quantity */}
                          <div>
                            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                              تعداد ({item.unit}) {maxQty ? `(سقف: ${toPersianDigits(maxQty)})` : ''}:
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-sm"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={maxQty || undefined}
                                value={item.quantity}
                                onChange={(e) => {
                                  const raw = parseInt(e.target.value, 10) || 1;
                                  const bounded = maxQty ? Math.min(maxQty, Math.max(1, raw)) : Math.max(1, raw);
                                  updateItem(item.id, { quantity: bounded });
                                }}
                                className="w-14 text-center py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newQ = item.quantity + 1;
                                  if (maxQty && newQ > maxQty) return;
                                  updateItem(item.id, { quantity: newQ });
                                }}
                                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-sm"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Unit Price */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                              {typeConfig.priceLabel} (تومان):
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.unitPrice.toLocaleString('en-US')}
                              onChange={(e) => {
                                const clean = parseInt(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''), 10) || 0;
                                updateItem(item.id, { unitPrice: clean });
                              }}
                              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 text-left ltr tabular-nums"
                            />
                          </div>
                        </div>

                        {/* Stock impact warning banner (Part 8: Warn before low/critical stock) */}
                        {(() => {
                          if (type !== 'sales' && type !== 'retail') return null;
                          if (item.deductFromStock === false) return null;
                          const productRef = products.find((p) => p.id === item.productId);
                          if (!productRef) return null;

                          const projectedStock = productRef.stock - item.quantity;
                          const minStock = productRef.minStock !== undefined ? productRef.minStock : 5;
                          const criticalStock = productRef.criticalStock !== undefined ? productRef.criticalStock : 0;

                          if (projectedStock < 0) {
                            return (
                              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 flex items-center gap-1.5 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>
                                  هشدار: موجودی انبار کافی نیست! موجودی فعلی: <strong>{toPersianDigits(productRef.stock)}</strong> {productRef.unit} (کسری: {toPersianDigits(Math.abs(projectedStock))})
                                </span>
                              </div>
                            );
                          } else if (projectedStock <= criticalStock) {
                            return (
                              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 flex items-center gap-1.5 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>
                                  🔴 با صدور این فاکتور، موجودی به سطح بحرانی ({toPersianDigits(projectedStock)} {productRef.unit}) می‌رسد! (آستانه بحرانی: {toPersianDigits(criticalStock)})
                                </span>
                              </div>
                            );
                          } else if (projectedStock <= minStock) {
                            return (
                              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>
                                  ⚠️ توجه: پس از ثبت فاکتور، موجودی به وضعیت کمبود ({toPersianDigits(projectedStock)} {productRef.unit}) خواهد رسید (حداقل: {toPersianDigits(minStock)}).
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Item Discount Controls (non-returns only) */}
                        {!isReturn && (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 text-xs space-y-1.5">
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                              تخفیف این قلم:
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                                <input
                                  type="radio"
                                  name={`disc_type_${item.id}`}
                                  checked={item.discountType === 'none'}
                                  onChange={() => updateItem(item.id, { discountType: 'none', discountValue: 0 })}
                                  className="text-amber-600 focus:ring-0"
                                />
                                <span>بدون تخفیف</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                                <input
                                  type="radio"
                                  name={`disc_type_${item.id}`}
                                  checked={item.discountType === 'amount'}
                                  onChange={() => updateItem(item.id, { discountType: 'amount' })}
                                  className="text-amber-600 focus:ring-0"
                                />
                                <span>مبلغی (تومان)</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                                <input
                                  type="radio"
                                  name={`disc_type_${item.id}`}
                                  checked={item.discountType === 'percent'}
                                  onChange={() => updateItem(item.id, { discountType: 'percent' })}
                                  className="text-amber-600 focus:ring-0"
                                />
                                <span>درصدی (٪)</span>
                              </label>

                              {item.discountType !== 'none' && (
                                <input
                                  type="number"
                                  min={0}
                                  max={item.discountType === 'percent' ? 100 : undefined}
                                  value={item.discountValue || ''}
                                  onChange={(e) => updateItem(item.id, { discountValue: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                  placeholder={item.discountType === 'percent' ? 'درصد' : 'مبلغ تومان'}
                                  className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center ltr mr-auto"
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Line Total & Profit */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            {isReturn ? 'مبلغ استرداد این قلم:' : 'مبلغ کل ردیف:'}
                          </span>
                          <span className="font-bold text-slate-950 dark:text-slate-50 tabular-nums">
                            {formatToman(item.totalPrice)}
                          </span>
                        </div>

                        {/* Profit Badge for Sales */}
                        {(type === 'sales' || type === 'retail') && renderProfitBadge(item.profit, item.profitPercent)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 4: Subtotal, Discount & Final Total */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">جمع کل اقلام:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatToman(subtotal)}
                </span>
              </div>

              {/* Invoice Discount (non-returns) */}
              {!isReturn && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">تخفیف کلی روی فاکتور:</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={invoiceDiscountType}
                        onChange={(e) => setInvoiceDiscountType(e.target.value as DiscountType)}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      >
                        <option value="none">بدون تخفیف</option>
                        <option value="amount">مبلغی (تومان)</option>
                        <option value="percent">درصدی (٪)</option>
                      </select>
                    </div>
                  </div>

                  {invoiceDiscountType !== 'none' && (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={invoiceDiscountValue}
                      onChange={(e) => setInvoiceDiscountValue(toEnglishDigits(e.target.value))}
                      placeholder="مقدار تخفیف"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-left ltr"
                    />
                  )}
                </div>
              )}

              {/* Tax */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">مالیات / ارزش افزوده:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={taxValue}
                    onChange={(e) => setTaxValue(toEnglishDigits(e.target.value))}
                    placeholder="0"
                    className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center ltr"
                  />
                  <span className="text-[10px] text-slate-400">تومان</span>
                </div>
              </div>

              {/* Final Total Banner */}
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between text-slate-900 dark:text-slate-100">
                <div>
                  <span className="text-xs font-bold block">
                    {isReturn ? 'مبلغ کل استرداد:' : 'مبلغ نهایی فاکتور:'}
                  </span>
                  {totalProfit !== undefined && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      کل سود تخمینی: +{formatToman(totalProfit)}
                    </span>
                  )}
                </div>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatToman(finalTotal)}
                </span>
              </div>
            </div>

            {/* Section 5: Payment Status & Method */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>وضعیت و روش پرداخت</span>
              </h4>

              {type !== 'retail' && !isReturn ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {(
                      [
                        ['full', 'پرداخت کامل'],
                        ['partial', 'پرداخت جزئی'],
                        ['credit', 'نسیه (دفتری)'],
                      ] as const
                    ).map(([st, label]) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setPaymentStatus(st)}
                        className={`py-2 px-2 rounded-xl font-bold border transition-colors ${
                          paymentStatus === st
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        مبلغ پرداختی (تومان):
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={paidAmountInput ? parseInt(toEnglishDigits(paidAmountInput), 10).toLocaleString('en-US') : ''}
                        onChange={(e) => setPaidAmountInput(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs ltr text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        مانده بدهی فاکتور:
                      </label>
                      <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-xs text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatToman(remainingAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : isReturn ? (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-xs font-semibold text-rose-800 dark:text-rose-300">
                  تسویه مبلغ مرجوعی بر اساس نوع تسویه انتخابی ({returnType === 'refund' ? 'بازپرداخت نقدی' : returnType === 'credit' ? 'کسر از بدهی مشتری' : 'تعویض کالا'}) اعمال می‌گردد.
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  فروش خرده‌فروشی به‌صورت نقدی تسویه کامل ثبت می‌شود.
                </div>
              )}

              {/* Payment Method */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  روش پرداخت وجه:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
                  {(
                    [
                      ['cash', 'نقدی'],
                      ['pos', 'دستگاه کارتخوان'],
                      ['card_transfer', 'کارت به کارت'],
                      ['cheque', 'چک صیادی'],
                      ['credit', 'حساب دفتری'],
                    ] as const
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                        paymentMethod === m
                          ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 border-transparent shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 6: Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                یادداشت و توضیحات تکمیلی (اختیاری):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تحویل به انباردار، با هماهنگی تلفنی، مهلت تسویه ۱۰ روز..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-3 flex gap-2 border-t border-slate-100 dark:border-slate-800">
              {isReturn ? (
                <button
                  type="button"
                  onClick={() => setReturnStep(1)}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>مرحله قبل</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  لغو
                </button>
              )}

              {onPreviewInvoice && effectiveItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onPreviewInvoice({
                      id: 'preview',
                      invoiceNumber: `${invoicePrefix}-۱۴۰۳-پیش‌نمایش`,
                      type,
                      date,
                      time,
                      customerId: selectedCustomer?.id,
                      customerName: selectedCustomer?.name,
                      customerPhone: selectedCustomer?.mobile || selectedCustomer?.phone || undefined,
                      supplierName,
                      supplierPhone,
                      items: effectiveItems,
                      subtotal,
                      discountType: invoiceDiscountType,
                      discountValue: parseInt(toEnglishDigits(invoiceDiscountValue).replace(/[^0-9]/g, ''), 10) || 0,
                      totalDiscount,
                      tax,
                      finalTotal,
                      totalProfit,
                      paymentStatus,
                      paidAmount,
                      remainingAmount,
                      paymentMethod,
                      notes,
                      createdBy: currentUser.id,
                      createdByName: currentUser.name,
                      createdAt: new Date().toISOString(),
                    });
                  }}
                  className="py-2.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>پیش‌نمایش چاپ</span>
                </button>
              )}

              <button
                type="submit"
                className={`flex-1 py-2.5 px-4 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                  isReturn
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{isReturn ? 'ثبت نهایی برگشت از فروش' : 'ثبت نهایی فاکتور'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Customer Selection Modal */}
      {isCustomerModalOpen && (
        <CustomerSelectModal
          customers={customers}
          selectedCustomerId={selectedCustomer?.id}
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSelectCustomer={(c) => setSelectedCustomer(c)}
          onAddCustomer={onAddCustomer}
        />
      )}

      {/* Product Selection Modal */}
      {isProductModalOpen && (
        <ProductSelectModal
          products={products}
          invoiceType={type}
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSelectProduct={handleAddProduct}
        />
      )}
    </div>
  );
};

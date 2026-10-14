import React, { useEffect, useRef, useState } from 'react';
import { Product, ProductUnit, User, Category, PriceSourceType, BuyPriceSource, ProfitType, AbzarrezaSearchResult } from '../types';
import { StorageService } from '../services/storageService';
import { AbzarrezaService } from '../services/abzarrezaService';
import { toEnglishDigits, formatNumberWithCommas, toPersianDigits, formatToman } from '../utils/jalali';
import { findDuplicateProduct } from '../utils/uniquenessUtils';
import { DuplicateWarningModal } from './DuplicateWarningModal';
import { BarcodeLabelModal } from './BarcodeLabelModal';
import { TagPicker } from './TagPicker';
import { BuyPriceConflictModal, ConflictRow } from './BuyPriceConflictModal';
import { LossWarningModal, LossRow } from './LossWarningModal';
import { flattenLabels } from '../utils/treeUtils';
import { isValidEan13 } from '../utils/barcodeUtils';
import {
  X,
  Check,
  Camera,
  Image,
  Tag,
  Barcode,
  DollarSign,
  Layers,
  Plus,
  PackageCheck,
  AlertCircle,
  Bell,
  BellOff,
  AlertTriangle,
  Search,
  ExternalLink,
  RefreshCw,
  Lock,
  Unlock,
  Radio,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  initialProduct?: Product | null;
  categories: Category[];
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Partial<Product> & {
    name: string;
    price: number;
    stock: number;
    unit: ProductUnit;
    deductFromStock?: boolean;
    minStock?: number;
    criticalStock?: number;
    alertEnabled?: boolean;
  }) => void;
  onQuickAddCategory?: (name: string) => void;
}

const UNITS: ProductUnit[] = ['عدد', 'دست', 'بسته', 'متر', 'کیلو'];

export const ProductFormModal: React.FC<Props> = ({
  initialProduct,
  categories,
  currentUser,
  isOpen,
  onClose,
  onSave,
  onQuickAddCategory,
}) => {
  const isEditing = !!initialProduct;

  const [name, setName] = useState(initialProduct?.name || '');
  const [code, setCode] = useState<string>(() => initialProduct?.code || StorageService.getNextInternalBarcode());
  const [showBarcodeLabel, setShowBarcodeLabel] = useState(false);
  const [category, setCategory] = useState<string>(
    initialProduct?.category || (categories[0]?.name || 'ابزار دستی')
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(
    initialProduct?.categoryId || categories[0]?.id
  );
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Auto-pricing & Abzarreza state (Part 2, 7)
  const [priceSourceType, setPriceSourceType] = useState<PriceSourceType>(
    initialProduct?.priceSourceType || 'manual'
  );
  const [abzarrezaSearchName, setAbzarrezaSearchName] = useState<string>(
    initialProduct?.abzarrezaSearchName || initialProduct?.name || ''
  );
  const [abzarrezaSearchCode, setAbzarrezaSearchCode] = useState<string>(
    initialProduct?.abzarrezaSearchCode || initialProduct?.code || ''
  );
  const [useCodeForSearch, setUseCodeForSearch] = useState<boolean>(
    initialProduct?.useCodeForSearch !== undefined ? initialProduct.useCodeForSearch : true
  );
  const [supplierRetailPrice, setSupplierRetailPrice] = useState<number | null>(
    initialProduct?.supplierRetailPrice || null
  );
  const [supplierWholesalePrice, setSupplierWholesalePrice] = useState<number | null>(
    initialProduct?.supplierWholesalePrice || null
  );
  const [supplierProductUrl, setSupplierProductUrl] = useState<string | null>(
    initialProduct?.supplierProductUrl || null
  );
  const [buyPriceSource, setBuyPriceSource] = useState<BuyPriceSource>(
    initialProduct?.buyPriceSource || 'wholesale'
  );
  const [profitType, setProfitType] = useState<ProfitType>(
    initialProduct?.profitType || 'percent'
  );
  const [profitIsCustom, setProfitIsCustom] = useState<boolean>(initialProduct?.profitValue !== undefined);
  const [profitValue, setProfitValue] = useState<number>(
    initialProduct?.profitValue !== undefined ? initialProduct.profitValue : 25
  );
  const [sellPriceRounded, setSellPriceRounded] = useState<boolean>(
    initialProduct?.sellPriceRounded !== undefined ? initialProduct.sellPriceRounded : true
  );
  const [buyPriceLocked, setBuyPriceLocked] = useState<boolean>(
    initialProduct?.buyPriceLocked ?? false
  );
  const [sellPriceLocked, setSellPriceLocked] = useState<boolean>(
    initialProduct?.sellPriceLocked ?? false
  );
  const [isSearchingAbzarreza, setIsSearchingAbzarreza] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<{
    found: boolean;
    result?: AbzarrezaSearchResult;
    message?: string;
  } | null>(() => {
    if (initialProduct?.supplierProductUrl && (initialProduct.supplierRetailPrice || initialProduct.supplierWholesalePrice)) {
      return {
        found: true,
        result: {
          title: initialProduct.name,
          url: initialProduct.supplierProductUrl,
          code: initialProduct.abzarrezaSearchCode || initialProduct.code,
          retailPrice: initialProduct.supplierRetailPrice,
          wholesalePrice: initialProduct.supplierWholesalePrice,
          matchedBy: 'code',
        },
      };
    }
    return null;
  });

  const [price, setPrice] = useState(initialProduct ? initialProduct.price.toString() : '');
  const [buyPrice, setBuyPrice] = useState(initialProduct?.buyPrice ? initialProduct.buyPrice.toString() : '');
  const [stock, setStock] = useState(initialProduct ? initialProduct.stock.toString() : '1');
  const [packUnit, setPackUnit] = useState<string>(initialProduct?.packUnit || '');
  const [packSize, setPackSize] = useState<string>(initialProduct?.packSize ? String(initialProduct.packSize) : '');
  const [maxStock, setMaxStock] = useState<string>(initialProduct?.maxStock ? String(initialProduct.maxStock) : '');
  const [tagIds, setTagIds] = useState<string[]>(initialProduct?.tagIds || []);
  const [conflictRows, setConflictRows] = useState<ConflictRow[] | null>(null);
  const conflictDecided = useRef(false);
  const [lossRows, setLossRows] = useState<LossRow[] | null>(null);
  const lossDecided = useRef(false);
  const conflictApply = useRef(false);
  const [unit, setUnit] = useState<ProductUnit>(initialProduct?.unit || 'عدد');
  const [deductFromStock, setDeductFromStock] = useState<boolean>(
    initialProduct?.deductFromStock !== undefined ? initialProduct.deductFromStock : true
  );
  const [minStock, setMinStock] = useState(
    initialProduct?.minStock !== undefined ? initialProduct.minStock.toString() : '5'
  );
  const [criticalStock, setCriticalStock] = useState(
    initialProduct?.criticalStock !== undefined ? initialProduct.criticalStock.toString() : '0'
  );
  const [alertEnabled, setAlertEnabled] = useState<boolean>(
    initialProduct?.alertEnabled !== undefined ? initialProduct.alertEnabled : true
  );

  const expirySettings = StorageService.getDefaultExpirySettings();
  const [hasExpiry, setHasExpiry] = useState<boolean>(initialProduct?.hasExpiry ?? false);
  const [expiryWarningDays, setExpiryWarningDays] = useState<number>(
    initialProduct?.expiryWarningDays !== undefined ? initialProduct.expiryWarningDays : expirySettings.defaultExpiryWarningDays
  );
  const [expiryCriticalDays, setExpiryCriticalDays] = useState<number>(
    initialProduct?.expiryCriticalDays !== undefined ? initialProduct.expiryCriticalDays : expirySettings.defaultExpiryCriticalDays
  );
  const [expiryNotificationEnabled, setExpiryNotificationEnabled] = useState<boolean>(
    initialProduct?.expiryNotificationEnabled ?? expirySettings.defaultExpiryNotificationEnabled
  );

  const [useGlobalUniqueness, setUseGlobalUniqueness] = useState<boolean>(
    initialProduct?.allowDuplicateName === undefined || initialProduct?.allowDuplicateName === null
  );
  const [allowDuplicateName, setAllowDuplicateName] = useState<boolean>(
    initialProduct?.allowDuplicateName ?? false
  );
  const [nameCaseSensitivity, setNameCaseSensitivity] = useState<'case_insensitive' | 'case_sensitive' | null>(
    initialProduct?.nameCaseSensitivity ?? null
  );
  const [nameSpaceSensitivity, setNameSpaceSensitivity] = useState<'space_sensitive' | 'space_insensitive' | null>(
    initialProduct?.nameSpaceSensitivity ?? null
  );
  const [conflictingProduct, setConflictingProduct] = useState<Product | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [imageUrl, setImageUrl] = useState(initialProduct?.imageUrl || '');
  const [productionDate, setProductionDate] = useState(initialProduct?.productionDate || '');
  const [expiryDate, setExpiryDate] = useState(initialProduct?.expiryDate || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelectCategory = (val: string) => {
    if (val === '__ADD_NEW__') {
      setIsAddingNewCategory(true);
      return;
    }
    const found = categories.find((c) => c.id === val || c.name === val);
    if (found) {
      setCategoryId(found.id);
      setCategory(found.name);
    } else {
      setCategory(val);
      setCategoryId(undefined);
    }
  };

  const handleConfirmNewCategory = () => {
    if (!newCategoryName.trim()) return;
    const created = StorageService.createCategory({ name: newCategoryName.trim() });
    setCategory(created.name);
    setCategoryId(created.id);
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    if (onQuickAddCategory) {
      onQuickAddCategory(created.name);
    }
  };

  const handleSearchAbzarreza = async () => {
    setIsSearchingAbzarreza(true);
    setSearchFeedback(null);
    setError('');

    const targetCode = (abzarrezaSearchCode || code).trim();
    const targetName = (abzarrezaSearchName || name).trim();

    try {
      const res = await AbzarrezaService.searchProduct({
        code: targetCode,
        name: targetName,
        useCodeForSearch,
      });

      if (res && (res.retailPrice || res.wholesalePrice)) {
        setSearchFeedback({ found: true, result: res });
        setSupplierRetailPrice(res.retailPrice || null);
        setSupplierWholesalePrice(res.wholesalePrice || null);
        setSupplierProductUrl(res.url);

        const chosenBuy = buyPriceSource === 'retail'
          ? (res.retailPrice || res.wholesalePrice || 0)
          : (res.wholesalePrice || res.retailPrice || 0);

        if (!buyPriceLocked && chosenBuy > 0) {
          setBuyPrice(chosenBuy.toString());
          if (!sellPriceLocked) {
            const calculatedSell = AbzarrezaService.calculateSellPrice(
              chosenBuy,
              profitType,
              profitValue,
              1000,
              sellPriceRounded
            );
            setPrice(calculatedSell.toString());
          }
        }
      } else {
        setSearchFeedback({
          found: false,
          message: '⚠️ پیدا نشد. لطفاً نام دقیق را وارد کنید',
        });
      }
    } catch {
      setSearchFeedback({
        found: false,
        message: '⚠️ خطا در برقراری ارتباط با وب‌سایت ابزار رضا',
      });
    } finally {
      setIsSearchingAbzarreza(false);
    }
  };

  const handleSelectPriceSource = (source: BuyPriceSource) => {
    setBuyPriceSource(source);
    if (!buyPriceLocked && searchFeedback?.result) {
      const p = source === 'retail'
        ? (searchFeedback.result.retailPrice || searchFeedback.result.wholesalePrice || 0)
        : (searchFeedback.result.wholesalePrice || searchFeedback.result.retailPrice || 0);
      if (p > 0) {
        setBuyPrice(p.toString());
        if (!sellPriceLocked) {
          const calculatedSell = AbzarrezaService.calculateSellPrice(
            p,
            profitType,
            profitValue,
            1000,
            sellPriceRounded
          );
          setPrice(calculatedSell.toString());
        }
      }
    }
  };

  // اگر سود اختصاصی کالا تعریف نشده، قیمت فروش پیشنهادی از سود تگ یا بازه‌ی قیمت خرید پر می‌شود
  const lastSuggestion = useRef<string>('');
  useEffect(() => {
    if (profitIsCustom) return;
    const buy = Number(toEnglishDigits(buyPrice || '0').replace(/[^0-9]/g, '')) || 0;
    const base = (initialProduct || {}) as Product;
    const prof = StorageService.effectiveProfit({ ...base, tagIds, buyPrice: buy, profitType: undefined, profitValue: undefined } as Product);
    if (!prof || buy <= 0) return;
    const sug = String(StorageService.calcNewPrice(buy, prof.type, prof.value, sellPriceRounded ? 1000 : 1));
    if (price === '' || price === lastSuggestion.current) {
      setPrice(sug);
      lastSuggestion.current = sug;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyPrice, tagIds, profitIsCustom, sellPriceRounded]);

  const handleProfitChange = (newType: ProfitType, newVal: number, rounded: boolean = sellPriceRounded) => {
    setProfitIsCustom(true);
    setProfitType(newType);
    setProfitValue(newVal);
    setSellPriceRounded(rounded);

    const numBuy = parseInt(toEnglishDigits(buyPrice).replace(/[^0-9]/g, ''), 10);
    if (numBuy > 0 && !sellPriceLocked) {
      const calculatedSell = AbzarrezaService.calculateSellPrice(
        numBuy,
        newType,
        newVal,
        1000,
        rounded
      );
      setPrice(calculatedSell.toString());
    }
  };

  const executeSave = (forceAllowDuplicate: boolean) => {
    const cleanPrice = parseInt(toEnglishDigits(price).replace(/[^0-9]/g, ''), 10);
    const cleanStock = parseInt(toEnglishDigits(stock).replace(/[^0-9]/g, ''), 10);
    const cleanBuyPrice = buyPrice ? parseInt(toEnglishDigits(buyPrice).replace(/[^0-9]/g, ''), 10) : undefined;
    const cleanMinStock = parseInt(toEnglishDigits(minStock).replace(/[^0-9]/g, ''), 10);
    const cleanCriticalStock = parseInt(toEnglishDigits(criticalStock).replace(/[^0-9]/g, ''), 10);

    // قیمت فروش کمتر از قیمت خرید: هشدار زیان
    if (!lossDecided.current) {
      const sellN = Number(toEnglishDigits(price).replace(/[^0-9]/g, '')) || 0;
      const buyN = Number(toEnglishDigits(buyPrice || '0').replace(/[^0-9]/g, '')) || 0;
      if (buyN > 0 && sellN > 0 && sellN < buyN) {
        setLossRows([{ key: 'self', name: name.trim() || 'کالا', sell: sellN, buy: buyN }]);
        return;
      }
    }

    // قیمت خرید عوض شده و قیمت فروش دستی تغییر نکرده: اگر سود کمتر شد، بپرس
    if (initialProduct && !conflictDecided.current) {
      const newBuy = Number(toEnglishDigits(buyPrice || '0').replace(/[^0-9]/g, '')) || 0;
      const sellUnchanged = Number(toEnglishDigits(price).replace(/[^0-9]/g, '')) === initialProduct.price;
      const buyChanged = newBuy !== (initialProduct.buyPrice || 0);
      const c = sellUnchanged && buyChanged ? StorageService.buyPriceConflict(initialProduct, newBuy) : null;
      if (c) {
        setConflictRows([{ key: 'self', name: initialProduct.name, newBuy, current: c.current, target: c.target }]);
        return;
      }
    }

    const trimmedCode = code.trim();
    if (trimmedCode) {
      const dup = StorageService.getProducts().find(
        (p) => !p.deleted && p.code === trimmedCode && p.id !== initialProduct?.id
      );
      if (dup) {
        setError(`این کد/بارکد قبلاً برای «${dup.name}» ثبت شده است.`);
        return;
      }
    }

    onSave({
      ...(initialProduct ? { id: initialProduct.id } : {}),
      applyProfit: conflictApply.current,
      name: name.trim(),
      code: code.trim(),
      category: category.trim(),
      categoryId,
      price: cleanPrice,
      buyPrice: cleanBuyPrice,
      stock: isNaN(cleanStock) ? 0 : cleanStock,
      packUnit: packUnit.trim() || undefined,
      packSize: Number(toEnglishDigits(packSize).replace(/[^0-9]/g, '')) || undefined,
      maxStock: Number(toEnglishDigits(maxStock).replace(/[^0-9]/g, '')) || undefined,
      tagIds,
      unit,
      deductFromStock,
      minStock: isNaN(cleanMinStock) ? 5 : cleanMinStock,
      criticalStock: isNaN(cleanCriticalStock) ? 0 : cleanCriticalStock,
      alertEnabled,
      // Auto-pricing fields (Part 2)
      priceSourceType,
      abzarrezaSearchName: priceSourceType === 'abzarreza' ? (abzarrezaSearchName || name).trim() : null,
      abzarrezaSearchCode: priceSourceType === 'abzarreza' ? (abzarrezaSearchCode || code).trim() : null,
      useCodeForSearch,
      supplierRetailPrice,
      supplierWholesalePrice,
      supplierProductUrl,
      supplierPricesUpdatedAt: supplierProductUrl ? (initialProduct?.supplierPricesUpdatedAt || new Date().toISOString()) : null,
      buyPriceSource,
      profitType: profitIsCustom ? profitType : undefined,
      profitValue: profitIsCustom ? profitValue : undefined,
      sellPrice: cleanPrice,
      sellPriceRounded,
      buyPriceLocked,
      sellPriceLocked,
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      productionDate: productionDate.trim() || undefined,
      expiryDate: expiryDate.trim() || undefined,
      hasExpiry,
      expiryWarningDays,
      expiryCriticalDays,
      expiryNotificationEnabled,
      allowDuplicateName: useGlobalUniqueness ? null : forceAllowDuplicate,
      nameCaseSensitivity: useGlobalUniqueness ? null : nameCaseSensitivity,
      nameSpaceSensitivity: useGlobalUniqueness ? null : nameSpaceSensitivity,
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('لطفاً نام ابزار را وارد نمایید');
      return;
    }
    const cleanPrice = parseInt(toEnglishDigits(price).replace(/[^0-9]/g, ''), 10);
    if (!cleanPrice || cleanPrice <= 0) {
      setError('لطفاً مبلغ معتبر برای قیمت فروش وارد نمایید');
      return;
    }

    const uniquenessSettings = StorageService.getNameUniquenessSettings();
    const existingProducts = StorageService.getProducts();
    const override = useGlobalUniqueness ? undefined : {
      allowDuplicateName,
      nameCaseSensitivity,
      nameSpaceSensitivity,
    };

    if (!allowDuplicateName) {
      const duplicate = findDuplicateProduct(name.trim(), existingProducts, uniquenessSettings, initialProduct?.id, override);
      if (duplicate) {
        setConflictingProduct(duplicate);
        setIsDuplicateModalOpen(true);
        return;
      }
    }

    executeSave(allowDuplicateName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? 'ویرایش مشخصات کالا' : 'افزودن ابزار جدید به انبار'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
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
                conflictApply.current = !!d['self'];
                conflictDecided.current = true;
                setConflictRows(null);
                handleSubmit({ preventDefault: () => undefined } as unknown as React.FormEvent);
                conflictDecided.current = false;
              }}
            />
          )}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نام کالا یا ابزار <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="مثال: دریل بتن‌کن ۳ کاره ۱۲۰۰ وات"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Tags (فقط وقتی تگ و قیمت پیشرفته روشن است) */}
          {StorageService.advancedPricingEnabled() && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تگ‌ها</label>
              <TagPicker tags={StorageService.getTags()} value={tagIds} onChange={setTagIds} />
            </div>
          )}

          {/* Pack & max stock */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">واحد بسته (مثلاً کارتن)</label>
              <input
                type="text"
                value={packUnit}
                onChange={(e) => setPackUnit(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">تعداد در بسته</label>
              <input
                type="text"
                inputMode="numeric"
                value={toEnglishDigits(packSize)}
                onChange={(e) => setPackSize(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">حداکثر موجودی</label>
              <input
                type="text"
                inputMode="numeric"
                value={toEnglishDigits(maxStock)}
                onChange={(e) => setMaxStock(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Code & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-slate-400" />
                <span>کد انبار / بارکد</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(toEnglishDigits(e.target.value).trim())}
                placeholder="HA-101"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <div className="flex gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setCode(StorageService.getNextInternalBarcode())}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 dark:border-amber-900"
                >
                  تولید بارکد جدید
                </button>
                {isValidEan13(code) && (
                  <button
                    type="button"
                    onClick={() => setShowBarcodeLabel(true)}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    چاپ برچسب
                  </button>
                )}
              </div>
              {/^\d+$/.test(code) && !isValidEan13(code) && (
                <p className="text-[10px] text-rose-600 mt-1">بارکد عددی باید ۱۳ رقم و رقم کنترلی درست داشته باشد.</p>
              )}
              <BarcodeLabelModal
                open={showBarcodeLabel}
                name={name}
                code={code}
                price={Number(toEnglishDigits(price).replace(/[^0-9]/g, '')) || 0}
                onClose={() => setShowBarcodeLabel(false)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>دسته‌بندی</span>
                </span>
                {!isAddingNewCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCategory(true)}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>دسته جدید</span>
                  </button>
                )}
              </label>

              {!isAddingNewCategory ? (
                <select
                  value={categoryId || category}
                  onChange={(e) => handleSelectCategory(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {flattenLabels(categories).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                  <option value="__ADD_NEW__">+ افزودن دسته‌بندی جدید...</option>
                </select>
              ) : (
                <div className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="نام دسته‌بندی جدید..."
                    className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-400 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleConfirmNewCategory}
                    className="p-2 bg-amber-600 text-white rounded-xl hover:bg-amber-500"
                    title="تأیید دسته"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCategory(false)}
                    className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl"
                    title="انصراف"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* Section: 💰 قیمت‌گذاری (Part 7) */}
          {/* ======================================================== */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span>💰 روش قیمت‌گذاری</span>
              </label>
              <span className="text-[10px] text-slate-400">منبع استعلام قیمت کالا</span>
            </div>

            {/* Type selector: از ابزار رضا | دستی | خارجی */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPriceSourceType('abzarreza')}
                className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  priceSourceType === 'abzarreza'
                    ? 'bg-amber-600 text-white border-transparent shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${priceSourceType === 'abzarreza' ? 'bg-white' : 'bg-amber-500'}`} />
                  <span>از ابزار رضا</span>
                </span>
                <span className="text-[9px] font-normal opacity-85">استعلام خودکار</span>
              </button>

              <button
                type="button"
                onClick={() => setPriceSourceType('manual')}
                className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  priceSourceType === 'manual'
                    ? 'bg-amber-600 text-white border-transparent shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${priceSourceType === 'manual' ? 'bg-white' : 'bg-slate-400'}`} />
                  <span>دستی</span>
                </span>
                <span className="text-[9px] font-normal opacity-85">ورود دلخواه</span>
              </button>

              <button
                type="button"
                onClick={() => setPriceSourceType('foreign')}
                className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  priceSourceType === 'foreign'
                    ? 'bg-amber-600 text-white border-transparent shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${priceSourceType === 'foreign' ? 'bg-white' : 'bg-slate-400'}`} />
                  <span>خارجی</span>
                </span>
                <span className="text-[9px] font-normal opacity-85">ارز (آتی)</span>
              </button>
            </div>

            {/* If "از ابزار رضا" */}
            {priceSourceType === 'abzarreza' && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>استعلام قیمت خودکار از abzarreza.com:</strong>
                    <p className="opacity-90 mt-0.5">
                      نام یا کد کالا را وارد کرده و دکمه جستجو را بزنید؛ قیمت‌های تک و عمده به‌صورت خودکار استخراج می‌شوند.
                    </p>
                  </div>
                </div>

                {/* Search name & code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        نام کالا در ابزار رضا:
                      </label>
                      <button
                        type="button"
                        onClick={() => setAbzarrezaSearchName(name)}
                        className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                        title="همگام با نام اصلی کالا"
                      >
                        همگام با نام
                      </button>
                    </div>
                    <input
                      type="text"
                      value={abzarrezaSearchName}
                      onChange={(e) => setAbzarrezaSearchName(e.target.value)}
                      placeholder={name || 'نام کالا جهت جستجو'}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        کد کالا در ابزار رضا:
                      </label>
                      <button
                        type="button"
                        onClick={() => setAbzarrezaSearchCode(code)}
                        className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                        title="همگام با کد اصلی کالا"
                      >
                        همگام با کد
                      </button>
                    </div>
                    <input
                      type="text"
                      value={abzarrezaSearchCode}
                      onChange={(e) => setAbzarrezaSearchCode(e.target.value)}
                      placeholder={code || 'مثال: DR-18V'}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Preference toggle & search button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={useCodeForSearch}
                      onChange={(e) => setUseCodeForSearch(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span>استفاده از کد برای جستجو (اگر خالی باشد نام جستجو می‌شود)</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSearchAbzarreza}
                    disabled={isSearchingAbzarreza}
                    className="min-h-[38px] px-4 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-amber-600/20 disabled:opacity-60 transition-colors shrink-0"
                  >
                    {isSearchingAbzarreza ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>در حال استعلام...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>🔍 جستجو در ابزار رضا</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Search Feedback: Found or Not Found */}
                {searchFeedback && (
                  <div className="mt-2">
                    {searchFeedback.found && searchFeedback.result ? (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>✅ پیدا شد: {searchFeedback.result.title}</span>
                          </div>
                          {searchFeedback.result.url && (
                            <a
                              href={searchFeedback.result.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 shrink-0"
                            >
                              <span>مشاهده صفحه</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Choose which price */}
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                            انتخاب قیمت پایه خرید:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectPriceSource('wholesale')}
                              className={`p-2 rounded-lg border text-right transition-colors ${
                                buyPriceSource === 'wholesale'
                                  ? 'bg-emerald-600 text-white border-transparent font-bold'
                                  : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="text-[10px] opacity-80">قیمت عمده:</div>
                              <div className="text-xs font-extrabold tabular-nums">
                                {formatToman(searchFeedback.result.wholesalePrice || 0)} تومان
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectPriceSource('retail')}
                              className={`p-2 rounded-lg border text-right transition-colors ${
                                buyPriceSource === 'retail'
                                  ? 'bg-emerald-600 text-white border-transparent font-bold'
                                  : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="text-[10px] opacity-80">قیمت تک:</div>
                              <div className="text-xs font-extrabold tabular-nums">
                                {formatToman(searchFeedback.result.retailPrice || 0)} تومان
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{searchFeedback.message || '⚠️ پیدا نشد. لطفاً نام دقیق را وارد کنید'}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Profit source hint */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  منبع سود: {StorageService.profitSourceOf({ ...((initialProduct || {}) as Product), tagIds, buyPrice: Number(toEnglishDigits(buyPrice || '0').replace(/[^0-9]/g, '')) || 0, profitType: profitIsCustom ? profitType : undefined, profitValue: profitIsCustom ? profitValue : undefined } as Product)}
                </p>

                {/* Profit calculation config */}
                <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span>محاسبه سود و قیمت فروش:</span>
                    <label className="flex items-center gap-1.5 text-[11px] font-normal text-slate-500 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sellPriceRounded}
                        onChange={(e) => handleProfitChange(profitType, profitValue, e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                      />
                      <span>گرد کردن به ۱۰۰۰</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        نوع سود:
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => handleProfitChange('percent', profitValue)}
                          className={`py-1.5 rounded-lg border text-xs font-semibold ${
                            profitType === 'percent'
                              ? 'bg-amber-600 text-white border-transparent'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          درصدی (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProfitChange('amount', profitValue)}
                          className={`py-1.5 rounded-lg border text-xs font-semibold ${
                            profitType === 'amount'
                              ? 'bg-amber-600 text-white border-transparent'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          مقداری (تومان)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        مقدار سود {profitType === 'percent' ? '(درصد)' : '(تومان)'}:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={profitValue}
                        onChange={(e) => handleProfitChange(profitType, Number(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Buy Price and Sell Price display & locks */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          قیمت خرید (تومان):
                        </span>
                        <label
                          className={`flex items-center gap-1 text-[10px] cursor-pointer ${
                            buyPriceLocked ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'
                          }`}
                          title="قفل قیمت خرید جهت جلوگیری از تغییر خودکار"
                        >
                          <input
                            type="checkbox"
                            checked={buyPriceLocked}
                            onChange={(e) => setBuyPriceLocked(e.target.checked)}
                            className="sr-only"
                          />
                          {buyPriceLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          <span>{buyPriceLocked ? 'قفل' : 'آزاد'}</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithCommas(buyPrice)}
                        onChange={(e) => {
                          const val = toEnglishDigits(e.target.value).replace(/[^0-9]/g, '');
                          setBuyPrice(val);
                          const num = parseInt(val, 10);
                          if (num > 0 && !sellPriceLocked) {
                            const p = AbzarrezaService.calculateSellPrice(
                              num,
                              profitType,
                              profitValue,
                              1000,
                              sellPriceRounded
                            );
                            setPrice(p.toString());
                          }
                        }}
                        disabled={buyPriceLocked}
                        placeholder="۲,۸۰۰,۰۰۰"
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          قیمت فروش (تومان):
                        </span>
                        <label
                          className={`flex items-center gap-1 text-[10px] cursor-pointer ${
                            sellPriceLocked ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'
                          }`}
                          title="قفل قیمت فروش جهت جلوگیری از تغییر با قیمت خرید"
                        >
                          <input
                            type="checkbox"
                            checked={sellPriceLocked}
                            onChange={(e) => setSellPriceLocked(e.target.checked)}
                            className="sr-only"
                          />
                          {sellPriceLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          <span>{sellPriceLocked ? 'قفل' : 'آزاد'}</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={formatNumberWithCommas(price)}
                        onChange={(e) => {
                          setPrice(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''));
                          setError('');
                        }}
                        placeholder="۳,۵۰۰,۰۰۰"
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-extrabold text-amber-600 dark:text-amber-400 tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* If "دستی" (Manual) */}
            {priceSourceType === 'manual' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                    <span>قیمت فروش (تومان) <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formatNumberWithCommas(price)}
                    onChange={(e) => {
                      setPrice(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''));
                      setError('');
                    }}
                    placeholder="۳,۵۰۰,۰۰۰"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    قیمت خرید (تومان) - اختیاری
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberWithCommas(buyPrice)}
                    onChange={(e) => setBuyPrice(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                    placeholder="۲,۸۰۰,۰۰۰"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 tabular-nums"
                  />
                </div>
              </div>
            )}

            {/* If "خارجی" (Foreign - Future) */}
            {priceSourceType === 'foreign' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs space-y-2">
                <p className="text-blue-800 dark:text-blue-300 font-semibold">
                  🌐 اتصال به منابع ارزی و تأمین‌کنندگان خارجی:
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
                  این قابلیت در به‌روزرسانی آتی (Multi-source + Foreign) فعال خواهد شد. هم‌اکنون می‌توانید قیمت‌ها را به‌صورت دستی وارد فرمایید.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      قیمت فروش (تومان):
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={formatNumberWithCommas(price)}
                      onChange={(e) => setPrice(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      قیمت خرید (تومان):
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberWithCommas(buyPrice)}
                      onChange={(e) => setBuyPrice(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stock & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>موجودی اولیه</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={toEnglishDigits(stock)}
                onChange={(e) => setStock(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                placeholder="10"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                موجودی به تفکیک مکان
              </label>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {initialProduct?.locationStock && Object.keys(initialProduct.locationStock).length > 0
                  ? Object.entries<number>(initialProduct.locationStock)
                      .map(([id, q]) => `${StorageService.getLocationPath(id)}: ${toPersianDigits(q)}`)
                      .join(' · ')
                  : 'از تب «ورود کالا» و «انتقال» مکان کالا را تنظیم کنید.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                واحد سنجش
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 📦 Stock Deduction Control (Part 11) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    کسر از موجودی انبار در فاکتور فروش
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {deductFromStock
                      ? 'با صدور فاکتور فروش، از موجودی این کالا کسر خواهد شد (عادی)'
                      : 'کسر از موجودی غیرفعال است (مناسب خدمات، کرایه یا کالاهای سفارشی)'}
                  </span>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => setDeductFromStock(!deductFromStock)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                  deductFromStock ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    deductFromStock ? '-translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 🔔 تنظیمات هشدار موجودی (Part 4) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    تنظیمات هشدار موجودی
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    کنترل آستانه و دریافت نوتیفیکیشن کاهش موجودی
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={alertEnabled}
                  onChange={(e) => setAlertEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
                <span>فعال بودن هشدار</span>
              </label>
            </div>

            {alertEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      حداقل موجودی (هشدار زرد)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={toEnglishDigits(minStock)}
                        onChange={(e) => setMinStock(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                        placeholder="5"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 tabular-nums"
                      />
                      <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 pointer-events-none">
                        {unit}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block leading-tight">
                      💡 وقتی موجودی ≤ این عدد باشد، هشدار زرد دریافت می‌کنید.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      موجودی بحرانی (هشدار قرمز)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={toEnglishDigits(criticalStock)}
                        onChange={(e) => setCriticalStock(toEnglishDigits(e.target.value).replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 tabular-nums"
                      />
                      <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 pointer-events-none">
                        {unit}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block leading-tight">
                      💡 موجودی کمتر از این عدد، هشدار قرمز (بحرانی) است.
                    </span>
                  </div>
                </div>

                {/* 📊 پیش‌نمایش سطوح هشدار */}
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                  <span className="font-bold text-amber-800 dark:text-amber-300 block">
                    📊 پیش‌نمایش وضعیت‌ها:
                  </span>
                  <div className="flex flex-col gap-0.5 text-[11px]">
                    <span>• موجودی &gt; {toPersianDigits(minStock || 5)}: <strong className="text-emerald-600">عادی ✅</strong></span>
                    <span>• موجودی ≤ {toPersianDigits(minStock || 5)}: <strong className="text-amber-600">هشدار زرد (کم) ⚠️</strong></span>
                    <span>• موجودی ≤ {toPersianDigits(criticalStock || 0)}: <strong className="text-rose-600">هشدار قرمز (بحرانی یا ناموجود) 🔴</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ⏰ تاریخ انقضا (Expiry Section - Part 5) */}
          <div className="p-3.5 bg-orange-50/40 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 rounded-2xl space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasExpiry}
                onChange={(e) => setHasExpiry(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">⏰ این کالا تاریخ انقضا دارد</span>
            </label>

            {hasExpiry && (
              <div className="space-y-3 pt-2 border-t border-orange-200/40 dark:border-orange-900/30 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-slate-700 dark:text-slate-300 font-medium">⏰ هشدار قبل از انقضا:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={expiryWarningDays}
                      onChange={(e) => setExpiryWarningDays(Number(e.target.value) || 30)}
                      className="w-24 px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-bold"
                    />
                    <span>روز قبل</span>
                  </div>
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    <span className="text-[11px] text-slate-400">انتخاب سریع:</span>
                    {[7, 14, 30, 60, 90].map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setExpiryWarningDays(d)}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:bg-amber-50 transition-colors"
                      >
                        {toPersianDigits(d)} روز
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-medium">🔴 هشدار بحرانی:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={expiryCriticalDays}
                      onChange={(e) => setExpiryCriticalDays(Number(e.target.value) || 7)}
                      className="w-24 px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-bold"
                    />
                    <span>روز قبل</span>
                  </div>
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    <span className="text-[11px] text-slate-400">انتخاب سریع:</span>
                    {[1, 3, 5, 7, 14].map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setExpiryCriticalDays(d)}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:bg-amber-50 transition-colors"
                      >
                        {toPersianDigits(d)} روز
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={expiryNotificationEnabled}
                    onChange={(e) => setExpiryNotificationEnabled(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>🔔 دریافت نوتیفیکیشن</span>
                </label>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                  <span className="font-bold block">📊 پیش‌نمایش:</span>
                  <p>اگر انقضا تا {toPersianDigits(expiryWarningDays)} روز دیگر باشد: هشدار زرد (نزدیک به انقضا)</p>
                  <p>اگر انقضا تا {toPersianDigits(expiryCriticalDays)} روز دیگر باشد: هشدار قرمز (بحرانی)</p>
                </div>
              </div>
            )}
          </div>

          {/* Image selection or upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Image className="w-3.5 h-3.5 text-slate-400" />
              <span>تصویر ابزار (اختیاری)</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="آدرس تصویر یا انتخاب نمونه"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ltr text-left"
              />
              <button
                type="button"
                onClick={() => setImageUrl('/src/assets/images/tool_cordless_drill_1791378788584.jpg')}
                className="min-h-[38px] px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap"
              >
                نمونه تصویر
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                تاریخ تولید (اختیاری)
              </label>
              <input
                type="date"
                value={productionDate ? new Date(productionDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setProductionDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                تاریخ انقضا (اختیاری)
              </label>
              <input
                type="date"
                value={expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setExpiryDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              توضیحات و مشخصات فنی (اختیاری)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: ساخت تایوان، دارای گارانتی ۱۲ ماهه طلایی، متعلقات کامل..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
            />
          </div>

          {/* Footer inside form */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="min-h-[46px] flex-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'ذخیره تغییرات' : 'افزودن به لیست ابزارها'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

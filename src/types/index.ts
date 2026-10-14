export type UserRole = 'admin' | 'seller';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatarColor: string;
  title: string; // e.g., 'پدر (مدیر کل)' or 'پسر (مدیر فروش)'
  createdAt: string;
}

export type ProductUnit = 'عدد' | 'متر' | 'کیلو' | 'دست' | 'بسته';

export interface Category {
  id: string;
  name: string; // نام دسته‌بندی
  description?: string; // توضیحات
  color?: string; // hex color e.g. #3B82F6
  icon?: string; // icon name or emoji
  parentId: string | null; // null for main categories, parent id for subcategories
  displayOrder: number;
  productCount: number; // auto-calculated, cached
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deleted?: boolean; // soft delete
}

export interface StockHistoryItem {
  id: string;
  productId: string;
  changeType: 'invoice_sales' | 'invoice_purchase' | 'invoice_return' | 'manual_adjust' | 'initial';
  quantityChange: number; // e.g. -2, +5
  previousStock: number;
  newStock: number;
  referenceId?: string; // e.g. invoice id
  referenceNumber?: string; // e.g. ف-۱۴۰۳-۰۰۴۲
  date: string;
  userId: string;
  userName: string;
  note?: string;
}

// ============================================
// Warehouse Management System Models (Parts 2, 5, 7, 8)
// ============================================

export type StockMovementType =
  | 'transfer'
  | 'purchase'
  | 'sale'
  | 'retail_sale'
  | 'return_from_customer'
  | 'return_to_supplier'
  | 'damage'
  | 'adjustment'
  | 'stocktake'
  | 'initial';

export interface StockMovement {
  locationId?: string | null;
  locationName?: string | null;
  id: string;
  productId: string;
  productName: string;
  movementType: StockMovementType;
  quantityChange: number; // + for increase, - for decrease
  quantityBefore: number;
  quantityAfter: number;
  unitPrice?: number | null;
  totalValue?: number | null;
  referenceType?: string | null; // e.g. "invoice", "stocktake", "damage", "return", "manual"
  referenceId?: string | null;
  referenceNumber?: string | null;
  reason?: string | null;
  performedBy: string;
  performedByName: string;
  performedAt: string; // ISO string
  notes?: string | null;
}

export type StocktakeStatus = 'in_progress' | 'completed' | 'cancelled';

export interface Stocktake {
  locationId?: string | null; // اگر خالی باشد، شمارش روی کل موجودی است
  id: string;
  stocktakeNumber: string; // e.g. "ش-۱۴۰۴-۰۰۱"
  title: string;
  startDate: string; // ISO string
  endDate?: string | null;
  status: StocktakeStatus;
  filterCategory?: string | null;
  createdBy: string;
  createdByName: string;
  completedBy?: string | null;
  completedByName?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  totalItemsCounted: number;
  totalDifferences: number;
  totalDifferenceValue: number;
}

export interface StocktakeItem {
  id: string;
  stocktakeId: string;
  productId: string;
  productName: string;
  productCode: string;
  systemQuantity: number;
  countedQuantity: number;
  difference: number; // countedQuantity - systemQuantity
  differenceValue: number; // difference * unitPrice
  reason?: string | null;
  countedBy: string;
  countedAt: string;
  notes?: string | null;
}

export type DamageReason = 'breakage' | 'expired' | 'defective' | 'lost' | 'theft' | 'other';
export type DamageStatus = 'pending' | 'approved' | 'rejected';

export interface Damage {
  locationId?: string | null; // مکانی که ضایعات از آن کسر شده
  id: string;
  damageNumber: string; // e.g. "ض-۱۴۰۴-۰۰۱"
  productId: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  reason: DamageReason;
  reasonNote?: string | null;
  images: string[];
  status: DamageStatus;
  reportedBy: string;
  reportedByName: string;
  reportedAt: string; // ISO string
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
}

export type ReturnReason = 'defective' | 'wrong_item' | 'not_satisfied' | 'expired' | 'other';

export interface ReturnCustomerItem {
  productId: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReturnFromCustomer {
  id: string;
  returnNumber: string; // e.g. "م-۱۴۰۴-۰۰۱"
  originalInvoiceId?: string | null;
  originalInvoiceNumber?: string | null;
  customerId?: string | null;
  customerName: string;
  items: ReturnCustomerItem[];
  reason: ReturnReason;
  reasonNote?: string | null;
  totalRefund: number;
  returnToStock: boolean;
  status: 'completed' | 'pending';
  reportedBy: string;
  reportedByName: string;
  reportedAt: string; // ISO string
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
}

export interface ReturnSupplierItem {
  productId: string;
  productName: string;
  productCode?: string;
  quantity: number;
  buyPrice: number;
  total: number;
}

export interface ReturnToSupplier {
  id: string;
  returnNumber: string; // e.g. "م-ت-۱۴۰۴-۰۰۱"
  supplierName: string;
  items: ReturnSupplierItem[];
  reason: ReturnReason;
  reasonNote?: string | null;
  expectedRefund: number;
  status: 'completed' | 'pending';
  reportedBy: string;
  reportedByName: string;
  reportedAt: string; // ISO string
}

export type StockStatusLevel = 'normal' | 'low' | 'critical' | 'out_of_stock';

export interface StockAlertSettings {
  receiveLowStockAlert: boolean;
  receiveCriticalAlert: boolean;
  receiveOutOfStockAlert: boolean;
  receiveRecoveryAlert: boolean;
  notifyAllUsers: boolean;
  sendAsPushNotification: boolean;
  soundLowStock: boolean;
  soundCritical: boolean;
  soundOutOfStock: boolean;
  vibrate: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "23:00"
  quietHoursEnd: string; // "07:00"
}

export interface ExpirySettings {
  expiryEnabled: boolean; // فعال بودن هشدارهای انقضا
  dailyCheckTime: string; // زمان بررسی روزانه: "08:00"
  defaultExpiryWarningDays: number; // هشدار پیش‌فرض: ۳۰
  defaultExpiryCriticalDays: number; // بحرانی پیش‌فرض: ۷
  defaultExpiryNotificationEnabled: boolean; // نوتیفیکیشن پیش‌فرض: true
  sendPushNotification: boolean;
  sendInAppNotification: boolean;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "23:00"
  quietHoursEnd: string; // "07:00"
}

// مکان انبار: کاربر هر تعداد مکان و زیرمجموعه می‌سازد (درختی و بی‌حد)
// بازه‌ی قیمت خرید با سود پیش‌فرض (وقتی کالا و تگ سود ندارند). maxBuy=null یعنی بی‌نهایت
export interface ProfitBand {
  id: string;
  minBuy: number;
  maxBuy: number | null;
  profitType: ProfitType;
  profitValue: number;
}

// نوع تگ: کاربر خودش نوع می‌سازد (مثلاً تامین‌کننده، شهر). فقط نوع‌هایی که drivesProfit دارند روی سود اثر می‌گذارند
export interface TagType {
  id: string;
  name: string;
  drivesProfit: boolean;
}
export type TagKind = string; // شناسه‌ی TagType

export const DEFAULT_TAG_TYPES: TagType[] = [
  { id: 'profit', name: 'گروه سود', drivesProfit: true },
  { id: 'group', name: 'گروه', drivesProfit: false },
  { id: 'material', name: 'جنس', drivesProfit: false },
  { id: 'location', name: 'مکان', drivesProfit: false },
  { id: 'general', name: 'عمومی', drivesProfit: false },
];

// تگ کالا: کاربر تعریف می‌کند؛ درختی و بی‌حد. برای تغییر قیمت گروهی و دسته‌بندی دلخواه
export interface ProductTag {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  kind?: TagKind;            // نوع تگ
  profitType?: ProfitType;   // سود پیش‌فرض تگ (اگر کالا سود خودش را نداشته باشد)
  profitValue?: number;
}

export interface StockLocation {
  id: string;
  name: string;
  parentId: string | null; // null یعنی مکان اصلی (ریشه)
  createdAt: string;
}

export interface StockBatch {
  locationId?: string | null; // مکان نگهداری این بچ
  sourceInvoiceId?: string | null; // فاکتور خریدی که بچ از آن ساخته شده
  id: string;
  productId: string;
  productName: string;
  batchNumber?: string | null;
  quantity: number;
  remainingQuantity: number;
  productionDate?: string | null;
  expiryDate: string; // ISO timestamp
  supplierName?: string | null;
  receivedAt: string;
  receivedBy: string;
  receivedByName: string;
  buyPrice: number;
  notes?: string | null;
}

export type PriceSourceType = 'abzarreza' | 'manual' | 'foreign';
export type BuyPriceSource = 'retail' | 'wholesale' | 'manual';
export type ProfitType = 'percent' | 'amount';

export interface AutoPricingSettings {
  // Supplier
  defaultPriceSource: 'wholesale' | 'retail'; // عمده / تک
  searchMethod: 'code_first' | 'name_first' | 'only_code' | 'only_name'; // روش جستجو
  matchPriority: 'exact' | 'fuzzy'; // اولویت تطابق: دقیق‌ترین

  // Update
  autoCheckIntervalHours: number; // فاصله بررسی خودکار: هر ۶ ساعت
  autoUpdateEnabled: boolean; // بروزرسانی خودکار: ON
  instantUpdateOnView: boolean; // بروزرسانی لحظه‌ای هنگام مشاهده: ON
  minIntervalBetweenChecksSeconds: number; // حداقل فاصله بین دو بررسی: ۳۰ ثانیه

  // Profit
  defaultProfitType: 'percent' | 'amount'; // نوع سود پیش‌فرض: درصدی
  defaultProfitValue: number; // مقدار سود پیش‌فرض: ۲۵٪
  roundToNearest: number; // گرد کردن: نزدیک‌ترین ۱۰۰۰

  // Notification
  notifyOnPriceChange: boolean; // اطلاع از تغییرات قیمت: ON
  alertThresholdPercent: number; // آستانه هشدار: ۲٪
}

export interface NameUniquenessSettings {
  globalNameUniqueness: 'unique' | 'allow_duplicate';
  globalNameCaseSensitivity: 'case_insensitive' | 'case_sensitive';
  globalNameSpaceSensitivity: 'space_sensitive' | 'space_insensitive';
  globalNameHalfSpaceSensitivity: 'halfspace_insensitive' | 'halfspace_sensitive';
  globalNamePersianNormalization: boolean;
  globalNameNumberNormalization: boolean;

  globalCodeUniqueness: 'unique' | 'allow_duplicate';
  globalCodeCaseSensitivity: 'case_insensitive' | 'case_sensitive';
  globalCodeSpaceSensitivity: 'space_sensitive' | 'space_insensitive';
  globalCodeHalfSpaceSensitivity: 'halfspace_insensitive' | 'halfspace_sensitive';
  globalCodePersianNormalization: boolean;
  globalCodeNumberNormalization: boolean;
}

export interface AbzarrezaSearchResult {
  title: string;
  url: string;
  code?: string;
  retailPrice?: number | null; // قیمت تک
  wholesalePrice?: number | null; // قیمت عمده
  imageUrl?: string;
  availability?: string;
  matchedBy?: 'code' | 'name' | 'fuzzy';
  extractedAt?: string;
}

export interface RawProductCard {
  id?: string;
  title: string;
  url: string;
  priceText?: string;
  priceValue?: number | null;
  code?: string;
  imageUrl?: string;
  availability?: string;
  matchedBy?: 'code' | 'name' | 'fuzzy' | 'none';
  matchScore: number;
}

export interface ParserTraceItem {
  id: string;
  stage: string;
  target: string;
  foundRaw: string | null;
  parsedOutput: string | number | null;
  status: 'success' | 'partial' | 'fallback' | 'not_found' | 'failed';
  details?: string;
}

export interface AbzarrezaTestReport {
  query: string;
  searchType: 'auto' | 'code' | 'name';
  searchUrl: string;
  alternateUrl: string;
  source: 'live' | 'simulation' | 'custom_html';
  httpStatus: number;
  responseTimeMs: number;
  rawHtmlLength: number;
  rawHtml: string;
  productCards: RawProductCard[];
  bestMatchCard: RawProductCard | null;
  extractedProduct: AbzarrezaSearchResult | null;
  calculatedSellPrice?: number;
  profitAmount?: number;
  profitPercent?: number;
  traces: ParserTraceItem[];
  checklist: {
    cardsFound: boolean;
    titleExtracted: boolean;
    retailPriceExtracted: boolean;
    wholesalePriceExtracted: boolean;
    codeExtracted: boolean;
    availabilityExtracted: boolean;
    persianDigitsConverted: boolean;
    sellPriceCalculated: boolean;
  };
}

export interface Product {
  id: string;
  name: string;
  code: string;
  category: string; // User-defined category name or id
  categoryId?: string; // Optional direct reference to Category.id
  price: number; // Toman
  buyPrice?: number; // Toman (for profit calculation, visible to admin)
  stock: number;
  unit: ProductUnit;
  description?: string;
  imageUrl?: string;
  deductFromStock?: boolean; // true = deduct on sale (default), false = don't touch stock
  minStock: number; // حداقل موجودی (هشدار زرد) - پیش‌فرض: ۵
  criticalStock: number; // موجودی بحرانی (هشدار قرمز) - پیش‌فرض: ۰
  alertEnabled: boolean; // فعال بودن هشدار - پیش‌فرض: true
  lastAlertSent?: string | null; // ISO string to prevent spamming
  lastAlertStockLevel?: number | null; // detect stock changes
  lastAlertStatus?: StockStatusLevel | null; // previous status sent
  snoozedUntil?: string | null; // ISO string for snooze functionality
  leadTimeDays?: number; // زمان تأمین کالا به روز (پیش‌فرض: ۷)
  safetyFactor?: number; // ضریب اطمینان (پیش‌فرض: ۱.۵)
  analysisPeriodDays?: number; // دوره تحلیل مصرف به روز (پیش‌فرض: ۳۰)

  // Abzarreza & Auto-Pricing fields (Part 2)
  priceSourceType?: PriceSourceType; // "abzarreza" | "manual" | "foreign" (default: "manual")
  abzarrezaSearchName?: string | null; // exact name to search on abzarreza
  abzarrezaSearchCode?: string | null; // exact code to search on abzarreza
  useCodeForSearch?: boolean; // prefer code over name (default: true)
  supplierRetailPrice?: number | null; // قیمت تک ابزار رضا

  // Production & Expiry (Part 10)
  productionDate?: string;
  expiryDate?: string;
  supplierWholesalePrice?: number | null; // قیمت عمده ابزار رضا
  supplierProductUrl?: string | null; // URL found on abzarreza
  supplierPricesUpdatedAt?: string | null; // last price update ISO timestamp
  buyPriceSource?: BuyPriceSource; // "retail" | "wholesale" | "manual"
  profitType?: ProfitType; // "percent" | "amount"
  profitValue?: number; // e.g. 25
  sellPrice?: number; // sell price (synced with price)
  sellPriceRounded?: boolean; // default true
  buyPriceLocked?: boolean; // default false
  sellPriceLocked?: boolean; // default false
  lastPriceCheckAttempt?: string | null; // to throttle checks

  // موجودی به تفکیک مکان (کلید: شناسه‌ی مکان). جمع آن‌ها برابر stock است.
  locationStock?: Record<string, number>;
  packUnit?: string;   // واحد بسته‌بندی، مثلاً کارتن
  packSize?: number;   // تعداد عدد در هر بسته
  maxStock?: number;   // حداکثر موجودی مطلوب (برای پیشنهاد خرید)
  tagIds?: string[];   // تگ‌های دلخواه کالا
  supplierCode?: string; // کد کالا در لیست قیمت تامین‌کننده (ابزارِرزا)

  // Expiry Management fields (Part 2 & 13)
  hasExpiry?: boolean;
  expiryWarningDays?: number;
  expiryCriticalDays?: number;
  expiryNotificationEnabled?: boolean;

  // Uniqueness override fields (Part 4 & 12)
  allowDuplicateName?: boolean | null;
  nameCaseSensitivity?: 'case_insensitive' | 'case_sensitive' | null;
  nameSpaceSensitivity?: 'space_sensitive' | 'space_insensitive' | null;
  nameHalfSpaceSensitivity?: 'halfspace_insensitive' | 'halfspace_sensitive' | null;
  namePersianNormalization?: boolean | null;
  nameNumberNormalization?: boolean | null;

  updatedAt: string; // ISO string
  updatedBy: string; // user id
  updatedByName: string; // user display name
  deleted?: boolean; // soft delete
  version: number;
}

export type ChangeType =
  | 'price_update'
  | 'stock_update'
  | 'create_product'
  | 'edit_product'
  | 'delete_product'
  | 'restore_product'
  | 'abzarreza_price_update'
  | 'expiry_settings_update'
  | 'batch_add'
  | 'batch_sold'
  | 'batch_expired'
  | 'batch_discount';

export interface AuditLog {
  id: string;
  productId: string;
  productName: string;
  changeType: ChangeType;
  oldValue: string;
  newValue: string;
  diffAmount?: number; // e.g. +200,000 تومان or -2 عدد
  changedBy: string; // user id
  changedByName: string;
  changedAt: string; // ISO string
  synced: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'price_change' | 'stock_change' | 'inventory_alert' | 'system';
  read: boolean;
  createdAt: string;
  relatedLogId?: string;
  authorId?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingChangesCount: number;
}

export type InvoiceType =
  | 'purchase' // فاکتور خرید (آبی)
  | 'sales' // فاکتور فروش (سبز)
  | 'retail' // فاکتور خرده‌فروشی (نارنجی)
  | 'purchase_return' // برگشت از خرید (زرشکی/قرمز تیره)
  | 'sales_return'; // برگشت از فروش (قرمز)

export type DiscountType = 'none' | 'amount' | 'percent';

export type PaymentStatus = 'full' | 'credit' | 'partial';

export type PaymentMethod = 'cash' | 'pos' | 'card_transfer' | 'cheque' | 'credit';

export interface CustomerGroup {
  id: string;
  name: string; // e.g., "خرده‌فروش", "عمده‌فروش", "همکار", "مشتری ویژه", "مشکل‌دار"
  description?: string | null;
  color: string; // hex color or tailwind color
  icon: string; // icon name or emoji
  defaultPriceLevel?: string | null;
  defaultDiscountPercent: number; // default 0
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type LedgerEntryType =
  | 'invoice_sale'
  | 'invoice_retail'
  | 'invoice_sale_return'
  | 'payment_cash'
  | 'payment_card'
  | 'payment_transfer'
  | 'payment_cheque'
  | 'payment_credit'
  | 'adjustment'
  | 'initial_balance';

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  entryType: LedgerEntryType;
  referenceId?: string | null; // invoice/payment ID
  referenceNumber?: string | null; // invoice/payment number
  debit: number; // بدهکار - increases debt
  credit: number; // بستانکار - decreases debt
  balanceBefore: number;
  balanceAfter: number;
  date: string; // Persian date string e.g. ۱۴۰۴/۰۸/۱۵
  time: string; // e.g. ۱۴:۳۰
  timestamp: string; // ISO string
  description: string;
  performedBy: string;
  performedByName: string;
  notes?: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string; // required
  customerCode: string; // auto: مش-۱۴۰۳-۰۰۰۱
  mobile: string; // required
  phone?: string | null; // optional
  address?: string | null; // optional
  groupId?: string | null; // references CustomerGroup
  defaultPriceLevel?: string | null; // e.g., "همکار"
  defaultDiscountPercent: number; // default 0
  notes?: string | null;
  tags?: string[];
  totalDebt: number; // auto-calculated running balance
  debt: number; // backward compatibility alias for totalDebt
  totalPurchases: number; // auto-calculated
  totalPayments: number; // auto-calculated
  lastPurchaseDate?: string | null;
  lastPaymentDate?: string | null;
  isActive: boolean; // default true
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  deleted?: boolean; // default false
}

export interface InvoiceItem {
  locationId?: string | null; // مکان این قلم (اگر خالی باشد، مکان کل فاکتور)
  batchId?: string | null;    // بچی که فروشنده برای این قلم انتخاب کرده
  // تقسیم قلم بین چند مکان (جمع تعداد سهم‌ها برابر quantity است)
  locationSplits?: {
    locationId: string;
    quantity: number;
    batchId?: string | null;
    expiryDate?: string | null; // برای خرید: تاریخ انقضای این بخش (بچ جدا می‌سازد)
    batchNumber?: string | null;
  }[];
  expiryDate?: string | null;  // برای خرید بدون تقسیم: تاریخ انقضای این قلم
  applyProfit?: boolean;       // خرید: اگر true باشد، قیمت فروش با سود تعریف‌شده به‌روز می‌شود
  batchNumber?: string | null;
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  unit: ProductUnit;
  quantity: number;
  unitPrice: number; // Toman
  buyPrice?: number; // Toman (for profit calculation in sales)
  discountType: DiscountType;
  discountValue: number;
  totalPrice: number; // line total after item discount
  profit?: number;
  profitPercent?: number;
  deductFromStock?: boolean; // whether this item stock movement is requested
  stockAdjustmentStatus?: 'pending' | 'applied'; // persisted per-line one-time stock adjustment state
  notes?: string;
}

export interface Invoice {
  locationId?: string | null; // مکانی که موجودی از آن کم/به آن اضافه می‌شود
  id: string;
  invoiceNumber: string; // e.g. ف-۱۴۰۳-۰۰۰۱
  type: InvoiceType;
  date: string; // Shamsi date string e.g. ۱۴۰۳/۰۸/۱۵
  time: string; // e.g. ۱۴:۳۰
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  supplierName?: string;
  supplierPhone?: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  returnReason?: string;
  returnType?: 'refund' | 'exchange' | 'credit'; // بازپرداخت / تعویض / اعتبار
  items: InvoiceItem[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  totalDiscount: number;
  tax: number;
  finalTotal: number;
  totalProfit?: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  balanceBefore?: number; // customer running balance before invoice
  balanceAfter?: number; // customer running balance after invoice
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  deleted?: boolean; // soft delete
}

export type PrintTemplateId = 'simple' | 'official' | 'colorful' | 'classic' | 'thermal';

export interface InvoiceSettings {
  prefixes: {
    purchase: string;
    sales: string;
    retail: string;
    purchase_return: string;
    sales_return: string;
  };
  defaultTemplate: PrintTemplateId;
  allowEdit: boolean;
  editGracePeriodHours: number;
  logEditsInAudit: boolean;
  allowDelete: boolean;
  softDelete: boolean;
  showProfitInternal: boolean;
  showProfitCustomerPDF: boolean;
  showAccountBalance: boolean;
  showShopInfoInPDF: boolean;
  defaultTax: number;
  defaultPaymentMethod: PaymentMethod;
  warnLowProfit: boolean;
  lowProfitThreshold: number;
  warnLowStock: boolean;
}

export interface ShopInfo {
  name: string;
  phone: string;
  mobile: string;
  address: string;
  website: string;
  email: string;
  economicCode: string;
  logoUrl?: string;
}

export type InvoiceAuditAction =
  | 'create'
  | 'edit'
  | 'delete'
  | 'print'
  | 'export'
  | 'share'
  | 'payment'
  | 'stock_revert';

export interface InvoiceAuditDiff {
  field: string;
  oldVal: string;
  newVal: string;
}

export interface InvoiceAuditLog {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  action: InvoiceAuditAction;
  details: string;
  diffs?: InvoiceAuditDiff[];
  performedBy: string;
  performedByName: string;
  timestamp: string;
  date: string;
  time: string;
}

export type PaymentType = 'cash' | 'card' | 'transfer' | 'cheque' | 'credit';
export type PaymentRecordStatus = 'confirmed' | 'pending' | 'cancelled';
export type CardType = 'debit' | 'credit';
export type BankName = 'melli' | 'saderat' | 'mellat' | 'parsian' | 'pasargad' | 'tejarat' | 'refah' | 'sepah' | 'keshavarzi' | 'maskan' | 'saman' | 'other';
export type ChequeType = 'received' | 'issued';
export type ChequeStatus = 'pending' | 'cleared' | 'bounced' | 'cancelled';

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  paymentType: PaymentType;
  amount: number;
  paymentDate: string;
  paymentTime: string;
  paymentTimestamp: string;
  balanceBefore: number;
  balanceAfter: number;
  status: PaymentRecordStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  notes?: string;
  attachments?: string[];
  deleted: boolean;
  
  // Specific details
  cardType?: CardType;
  bankName?: BankName;
  cardNumberLast4?: string;
  posSerial?: string;
  referenceNumber?: string;
  terminalId?: string;
  
  accountHolderName?: string;
  destinationBank?: string;
  destinationAccount?: string;
  trackingNumber?: string;
  transferDate?: string;
  
  chequeNumber?: string;
  branchName?: string;
  issueDate?: string;
  dueDate?: string;
  chequeType?: ChequeType;
  chequeStatus?: ChequeStatus;
  imageUrl?: string;
  
  creditDays?: number;
}

// ============================================
// Sales Analytics & Smart Restock (Parts 1-17)
// ============================================

export type RestockUrgency = 'critical' | 'urgent' | 'soon' | 'sufficient';

export interface RestockSuggestion {
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  currentStock: number;
  unit: ProductUnit;
  price: number;
  buyPrice: number;
  avgDailySales: number; // ADS
  leadTimeDays: number; // زمان تأمین
  safetyFactor: number; // ضریب اطمینان
  safetyStock: number; // موجودی اطمینان
  reorderPoint: number; // نقطه سفارش مجدد
  suggestedQuantity: number; // مقدار پیشنهادی سفارش
  daysUntilStockout: number; // تخمین روز تا اتمام موجودی
  urgency: RestockUrgency; // بحرانی (🔴), نیاز فوری (🟠), به زودی (🟡), کافی (✅)
  estimatedOrderCost: number; // suggestedQuantity * buyPrice
  lastSoldDate?: string;
  daysSinceLastSale: number;
}

export interface ProductSalesMetric {
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  currentStock: number;
  unit: ProductUnit;
  price: number;
  buyPrice: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalProfit: number;
  profitMarginPercent: number;
  avgDailySales: number;
  avgWeeklySales: number;
  lastSaleDate: string | null;
  daysSinceLastSale: number;
  salesCount: number;
  salesVelocity: number;
  turnoverRate: number;
  daysOfInventory: number;
  peakDayOfWeek: string;
  peakHourRange: string;
  suggestedReorder: RestockSuggestion;
}

export interface DailySalesPoint {
  date: string;
  jalaliDate: string;
  dayName: string;
  revenue: number;
  profit: number;
  unitsSold: number;
  invoiceCount: number;
}

export interface CategorySalesSummary {
  categoryId?: string;
  categoryName: string;
  color?: string;
  revenue: number;
  unitsSold: number;
  profit: number;
  percentage: number;
}

export interface AnalyticsSummary {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayGrowthPercent: number;
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  weekGrowthPercent: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  monthGrowthPercent: number;
  thisMonthInvoiceCount: number;
  avgInvoiceValue: number;
  topSellingProductMonth: {
    productId: string;
    productName: string;
    unitsSold: number;
    revenue: number;
  } | null;
  totalProfitMonth: number;
  overallProfitMargin: number;
}



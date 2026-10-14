import {
  Product,
  AuditLog,
  AppNotification,
  User,
  SyncStatus,
  Invoice,
  InvoiceType,
  Customer,
  CustomerGroup,
  CustomerLedgerEntry,
  LedgerEntryType,
  ShopInfo,
  InvoiceSettings,
  InvoiceAuditLog,
  InvoiceAuditAction,
  InvoiceAuditDiff,
  Category,
  StockHistoryItem,
  StockAlertSettings,
  StockStatusLevel,
  AutoPricingSettings,
  ExpirySettings,
  StockBatch,
  NameUniquenessSettings,
  StockMovement,
  StockMovementType,
  Stocktake,
  StocktakeItem,
  Damage,
  DamageReason,
  ReturnFromCustomer,
  ReturnToSupplier,
  Payment,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_CUSTOMERS,
  DEFAULT_CUSTOMER_GROUPS,
  INITIAL_CUSTOMER_LEDGER,
  INITIAL_INVOICES,
  DEFAULT_SHOP_INFO,
  DEFAULT_INVOICE_SETTINGS,
  INITIAL_INVOICE_AUDIT_LOGS,
  INITIAL_CATEGORIES,
  DEFAULT_STOCK_ALERT_SETTINGS,
  DEFAULT_AUTO_PRICING_SETTINGS,
  DEFAULT_EXPIRY_SETTINGS,
  INITIAL_STOCK_BATCHES,
  DEFAULT_UNIQUENESS_SETTINGS,
} from '../data/initialData';
import { formatToman, toPersianDigits, gregorianToJalali } from '../utils/jalali';
import { soundManager } from '../utils/audio';
import { getProductStockStatus } from '../utils/stockAlertUtils';
import { buildInternalEan13 } from '../utils/barcodeUtils';
import type { StockLocation } from '../types';
import type { InvoiceItem, ProductTag, ProfitType, ProfitBand, TagKind, TagType } from '../types';
import { DEFAULT_TAG_TYPES } from '../types';
import { AbzarrezaService } from './abzarrezaService';

function getJalaliNow(d: Date = new Date()): { date: string; time: string } {
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const date = `${toPersianDigits(jy)}/${toPersianDigits(jm.toString().padStart(2, '0'))}/${toPersianDigits(jd.toString().padStart(2, '0'))}`;
  const time = `${toPersianDigits(hours)}:${toPersianDigits(minutes)}`;
  return { date, time };
}

const STORAGE_KEYS = {
  PRODUCTS: 'hami_tools_products_v1',
  USERS: 'hami_tools_users_v1',
  CURRENT_USER_ID: 'hami_tools_current_user_id',
  AUDIT_LOGS: 'hami_tools_audit_logs_v1',
  NOTIFICATIONS: 'hami_tools_notifications_v1',
  PENDING_SYNC: 'hami_tools_pending_sync_v1',
  LOCATIONS: 'hami_tools_locations_v1',
  TAGS: 'hami_tools_tags_v1',
  PROFIT_BANDS: 'hami_tools_profit_bands_v1',
  PROFIT_BANDS_CUSTOM: 'hami_tools_profit_bands_custom_v1',
  TAG_TYPES: 'hami_tools_tag_types_v1',
  PROFIT_PRIORITY: 'hami_tools_profit_priority_v1',
  ADVANCED_PRICING: 'hami_tools_advanced_pricing_v1',
  SIMULATED_OFFLINE: 'hami_tools_simulated_offline',
  LAST_SYNC: 'hami_tools_last_sync_timestamp',
  INVOICES: 'hami_tools_invoices_v1',
  CUSTOMERS: 'hami_tools_customers_v1',
  SHOP_INFO: 'hami_tools_shop_info_v1',
  INVOICE_SETTINGS: 'hami_tools_invoice_settings_v1',
  INVOICE_AUDIT_LOGS: 'hami_tools_invoice_audit_logs_v1',
  CATEGORIES: 'hami_tools_categories_v1',
  STOCK_HISTORY: 'hami_tools_stock_history_v1',
  STOCK_ALERT_SETTINGS: 'hami_tools_stock_alert_settings_v1',
  AUTO_PRICING_SETTINGS: 'hami_tools_auto_pricing_settings_v1',
  STOCK_MOVEMENTS: 'hami_tools_stock_movements_v1',
  STOCKTAKES: 'hami_tools_stocktakes_v1',
  STOCKTAKE_ITEMS: 'hami_tools_stocktake_items_v1',
  DAMAGES: 'hami_tools_damages_v1',
  RETURNS_CUSTOMER: 'hami_tools_returns_customer_v1',
  RETURNS_SUPPLIER: 'hami_tools_returns_supplier_v1',
  EXPIRY_SETTINGS: 'hami_tools_expiry_settings_v1',
  STOCK_BATCHES: 'hami_tools_stock_batches_v1',
  NAME_UNIQUENESS_SETTINGS: 'hami_tools_name_uniqueness_settings_v1',
  CUSTOMER_GROUPS: 'hami_tools_customer_groups_v1',
  CUSTOMER_LEDGER: 'hami_tools_customer_ledger_v1',
  PAYMENTS: 'hami_tools_payments_v1',
};


// Cross-tab broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('hami_tools_realtime_sync');
  }
} catch {
  // BroadcastChannel unavailable or blocked in sandbox
}

export type SyncMessage =
  | { type: 'DATA_UPDATED'; sourceUserId: string; log?: AuditLog; notification?: AppNotification; product?: Product }
  | { type: 'USER_SWITCHED'; userId: string }
  | { type: 'CLOUD_SYNCED'; timestamp: string };

type SyncListener = (msg: SyncMessage) => void;
const syncListeners: Set<SyncListener> = new Set();

if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    const msg = event.data as SyncMessage;
    syncListeners.forEach((listener) => listener(msg));
  };
}

export function subscribeToSync(listener: SyncListener) {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

function broadcast(msg: SyncMessage) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(msg);
    } catch {
      // Ignore
    }
  }
}

// بازه‌های پیش‌فرض سود (قابل ویرایش توسط کاربر)
const DEFAULT_PROFIT_BANDS: ProfitBand[] = [
  { id: 'band_1', minBuy: 1000, maxBuy: 10000, profitType: 'percent', profitValue: 50 },
  { id: 'band_2', minBuy: 10000, maxBuy: null, profitType: 'percent', profitValue: 30 },
];

export const DEFAULT_LOCATION_ID = 'loc_main';
const DEFAULT_LOCATION: StockLocation = {
  id: DEFAULT_LOCATION_ID,
  name: 'فروشگاه / انبار اصلی',
  parentId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const StorageService = {
  // Load initial or persisted products
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!data) {
        this.saveProducts(INITIAL_PRODUCTS);
        return INITIAL_PRODUCTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  /** پیدا کردن کالا با کد یا بارکد دقیق */
  findProductByCode(code: string): Product | undefined {
    const c = code.trim();
    if (!c) return undefined;
    return this.getProducts().find((p) => !p.deleted && p.code === c);
  },

  /** شماره‌ی بعدی بارکد داخلی که در انبار تکراری نیست */
  getNextInternalBarcode(): string {
    const products = this.getProducts();
    const used = new Set(products.map((p) => p.code));
    let max = 0;
    products.forEach((p) => {
      if (/^200\d{10}$/.test(p.code)) {
        const seq = Number(p.code.slice(3, 12));
        if (seq > max) max = seq;
      }
    });
    let next = max + 1;
    let code = buildInternalEan13(next);
    while (used.has(code)) {
      next++;
      code = buildInternalEan13(next);
    }
    return code;
  },

  /** اعمال تغییر موجودی روی یک مکان مشخص. کسری از سایر مکان‌ها برداشته می‌شود. */
  applyLocationDelta(dist: Record<string, number>, locId: string, delta: number): Record<string, number> {
    const out: Record<string, number> = { ...dist };
    if (delta === 0) return out;
    if (delta > 0) {
      out[locId] = (out[locId] || 0) + delta;
      return out;
    }
    let need = -delta;
    const order = [locId, ...Object.keys(out).filter((k) => k !== locId)];
    for (const k of order) {
      if (need <= 0) break;
      const take = Math.min(out[k] || 0, need);
      out[k] = (out[k] || 0) - take;
      need -= take;
      if (out[k] <= 0) delete out[k];
    }
    return out;
  },

  /**
   * تضمین می‌کند جمع موجودی مکان‌ها برابر موجودی کل باشد.
   * اگر موجودی زیاد شده باشد، به مکان اصلی اضافه می‌شود.
   * اگر کم شده باشد، اول از مکان اصلی و بعد از بقیه کم می‌شود.
   */
  normalizeLocationStock(p: Product, validIds: Set<string>): Product {
    const total = Math.max(0, p.stock ?? 0);
    const dist: Record<string, number> = {};
    Object.entries(p.locationStock || {}).forEach(([id, qty]) => {
      if (validIds.has(id) && qty > 0) dist[id] = qty;
    });
    const sum = Object.values(dist).reduce((a, b) => a + b, 0);
    if (sum < total) {
      dist[DEFAULT_LOCATION_ID] = (dist[DEFAULT_LOCATION_ID] || 0) + (total - sum);
    } else if (sum > total) {
      let excess = sum - total;
      const order = [DEFAULT_LOCATION_ID, ...Object.keys(dist).filter((k) => k !== DEFAULT_LOCATION_ID)];
      for (const k of order) {
        if (excess <= 0) break;
        const take = Math.min(dist[k] || 0, excess);
        dist[k] = (dist[k] || 0) - take;
        excess -= take;
        if (dist[k] <= 0) delete dist[k];
      }
    }
    return { ...p, stock: total, locationStock: dist };
  },

  getLocations(): StockLocation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify([DEFAULT_LOCATION]));
        return [DEFAULT_LOCATION];
      }
      const list = JSON.parse(data) as StockLocation[];
      return list.some((l) => l.id === DEFAULT_LOCATION_ID) ? list : [DEFAULT_LOCATION, ...list];
    } catch {
      return [DEFAULT_LOCATION];
    }
  },

  saveLocations(list: StockLocation[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(list));
    } catch {
      // Ignore
    }
  },

  addLocation(name: string, parentId: string | null): StockLocation {
    const list = this.getLocations();
    const loc: StockLocation = {
      id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      parentId,
      createdAt: new Date().toISOString(),
    };
    list.push(loc);
    this.saveLocations(list);
    return loc;
  },

  renameLocation(id: string, name: string): void {
    const list = this.getLocations().map((l) => (l.id === id ? { ...l, name: name.trim() } : l));
    this.saveLocations(list);
  },

  deleteLocation(id: string): { ok: boolean; reason?: string } {
    if (id === DEFAULT_LOCATION_ID) return { ok: false, reason: 'مکان اصلی قابل حذف نیست.' };
    const list = this.getLocations();
    if (list.some((l) => l.parentId === id)) {
      return { ok: false, reason: 'ابتدا زیرمجموعه‌های این مکان را حذف کنید.' };
    }
    if (this.getProducts().some((p) => (p.locationStock?.[id] ?? 0) > 0)) {
      return { ok: false, reason: 'روی این مکان کالا وجود دارد. ابتدا کالاها را منتقل کنید.' };
    }
    this.saveLocations(list.filter((l) => l.id !== id));
    return { ok: true };
  },

  /** مسیر کامل مکان، مثلاً «منزل ← اتاق علیرضا ← کمد» */
  getLocationPath(id: string): string {
    const list = this.getLocations();
    const parts: string[] = [];
    let cur: StockLocation | undefined = list.find((l) => l.id === id);
    let guard = 0;
    while (cur && guard++ < 100) {
      parts.unshift(cur.name);
      const parentId: string | null = cur.parentId;
      cur = parentId ? list.find((l) => l.id === parentId) : undefined;
    }
    return parts.join(' ← ') || '—';
  },

  /** لیست مکان‌ها به‌صورت درختی برای منوی انتخاب، با تورفتگی بر اساس عمق */
  getLocationOptions(): { id: string; label: string }[] {
    const list = this.getLocations();
    const out: { id: string; label: string }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      list
        .filter((l) => (l.parentId ?? null) === parentId)
        .forEach((l) => {
          out.push({ id: l.id, label: `${'\u00A0\u00A0'.repeat(depth)}${depth ? '↳ ' : ''}${l.name}` });
          walk(l.id, depth + 1);
        });
    };
    walk(null, 0);
    return out;
  },

  /** انتقال کالا بین دو مکان. جمع کل تغییری نمی‌کند. */
  transferStock(productId: string, fromId: string, toId: string, qty: number, currentUser: User): boolean {
    if (fromId === toId || qty <= 0) return false;
    const products = this.getProducts();
    const idx = products.findIndex((p) => p.id === productId);
    if (idx === -1) return false;
    const prod = products[idx];
    const dist: Record<string, number> = { ...(prod.locationStock || {}) };
    if ((dist[fromId] || 0) < qty) return false;

    dist[fromId] = (dist[fromId] || 0) - qty;
    if (dist[fromId] <= 0) delete dist[fromId];
    dist[toId] = (dist[toId] || 0) + qty;

    const nowIso = new Date().toISOString();
    products[idx] = {
      ...prod,
      locationStock: dist,
      updatedAt: nowIso,
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      version: (prod.version || 1) + 1,
    };
    this.saveProducts(products);

    this.addAuditLog({
      id: `log_${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      changeType: 'stock_update',
      oldValue: this.getLocationPath(fromId),
      newValue: `${qty} عدد به ${this.getLocationPath(toId)}`,
      changedBy: currentUser.id,
      changedByName: currentUser.name,
      changedAt: nowIso,
      synced: !this.isSimulatedOffline(),
    });
    this.recordStockMovement({
      productId: prod.id,
      productName: prod.name,
      movementType: 'transfer',
      quantityChange: 0,
      quantityBefore: prod.stock,
      quantityAfter: prod.stock,
      referenceType: 'transfer',
      reason: `انتقال از ${this.getLocationPath(fromId)} به ${this.getLocationPath(toId)}`,
      locationId: toId,
      locationName: this.getLocationPath(toId),
      performedBy: currentUser.id,
      performedByName: currentUser.name,
      notes: `${qty} عدد`,
    });
    this.addToPendingSync({ type: 'stock_transfer', id: prod.id, timestamp: nowIso });
    return true;
  },

  saveProducts(products: Product[]): void {
    try {
      const validIds = new Set(this.getLocations().map((l) => l.id));
      const normalized = products.map((p) => this.normalizeLocationStock(p, validIds));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(normalized));
    } catch {
      // Storage quota or private browsing
    }
  },

  // Users
  getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_USERS;
    }
  },

  getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'user_father';
    const found = users.find((u) => u.id === currentId);
    return found || users[0];
  },

  setCurrentUser(userId: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    broadcast({ type: 'USER_SWITCHED', userId });
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
        return INITIAL_AUDIT_LOGS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  },

  addAuditLog(log: AuditLog): void {
    const logs = this.getAuditLogs();
    const updated = [log, ...logs];
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  },

  // Notifications
  getNotifications(): AppNotification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
        return INITIAL_NOTIFICATIONS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  addNotification(notif: AppNotification): void {
    const notifications = this.getNotifications();
    const updated = [notif, ...notifications];
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
    } catch {
      // Ignore
    }

    // Attempt browser Push / Notification if allowed
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notif.title, {
          body: notif.body,
          icon: '/favicon.ico',
        });
      } catch {
        // Ignore in iframe if blocked
      }
    }
  },

  markNotificationsAsRead(): void {
    const notifications = this.getNotifications().map((n) => ({ ...n, read: true }));
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch {
      // Ignore
    }
  },

  clearNotifications(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    } catch {
      // Ignore
    }
  },

  // Offline Simulator & Pending Sync
  isSimulatedOffline(): boolean {
    return localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true';
  },

  setSimulatedOffline(val: boolean): void {
    localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, val ? 'true' : 'false');
  },

  getPendingSyncCount(): number {
    try {
      const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_SYNC) || '[]');
      return Array.isArray(queue) ? queue.length : 0;
    } catch {
      return 0;
    }
  },

  addToPendingSync(item: { type: string; id: string; timestamp: string }): void {
    try {
      const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_SYNC) || '[]');
      queue.push(item);
      localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(queue));
    } catch {
      // Ignore
    }
  },

  clearPendingSync(): void {
    localStorage.removeItem(STORAGE_KEYS.PENDING_SYNC);
  },

  getSyncStatus(): SyncStatus {
    const isOffline = this.isSimulatedOffline() || (typeof navigator !== 'undefined' && !navigator.onLine);
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || new Date().toISOString();
    return {
      isOnline: !isOffline,
      isSyncing: false,
      lastSyncedAt: lastSync,
      pendingChangesCount: this.getPendingSyncCount(),
    };
  },

  // Business Operations with Audit Log & Cross-User Notification
  quickUpdatePrice(
    productId: string,
    newPrice: number,
    currentUser: User
  ): { product: Product; log: AuditLog; notification: AppNotification } | null {
    const products = this.getProducts();
    const productIndex = products.findIndex((p) => p.id === productId);
    if (productIndex === -1) return null;

    const oldProduct = products[productIndex];
    const oldPriceStr = formatToman(oldProduct.price);
    const newPriceStr = formatToman(newPrice);
    const diff = newPrice - oldProduct.price;

    const updatedProduct: Product = {
      ...oldProduct,
      price: newPrice,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      version: (oldProduct.version || 1) + 1,
    };

    products[productIndex] = updatedProduct;
    this.saveProducts(products);

    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId,
      productName: updatedProduct.name,
      changeType: 'price_update',
      oldValue: oldPriceStr,
      newValue: newPriceStr,
      diffAmount: diff,
      changedBy: currentUser.id,
      changedByName: currentUser.name,
      changedAt: updatedProduct.updatedAt,
      synced: !this.isSimulatedOffline(),
    };
    this.addAuditLog(log);

    const diffText = diff > 0 ? `افزایش (+${formatToman(diff)})` : `کاهش (-${formatToman(Math.abs(diff))})`;
    const notification: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: `تغییر قیمت توسط ${currentUser.name}`,
      body: `${currentUser.name} قیمت «${updatedProduct.name}» را از ${oldPriceStr} به ${newPriceStr} تغییر داد (${diffText}).`,
      type: 'price_change',
      read: false,
      createdAt: updatedProduct.updatedAt,
      relatedLogId: log.id,
      authorId: currentUser.id,
    };
    this.addNotification(notification);

    if (this.isSimulatedOffline()) {
      this.addToPendingSync({ type: 'price_update', id: productId, timestamp: updatedProduct.updatedAt });
    }

    soundManager.playTapSound();
    broadcast({
      type: 'DATA_UPDATED',
      sourceUserId: currentUser.id,
      log,
      notification,
      product: updatedProduct,
    });

    return { product: updatedProduct, log, notification };
  },

  quickUpdateStock(
    productId: string,
    newStock: number,
    currentUser: User
  ): { product: Product; log: AuditLog; notification: AppNotification } | null {
    const products = this.getProducts();
    const productIndex = products.findIndex((p) => p.id === productId);
    if (productIndex === -1) return null;

    const oldProduct = products[productIndex];
    const oldStockStr = `${toPersianDigits(oldProduct.stock)} ${oldProduct.unit}`;
    const newStockStr = `${toPersianDigits(newStock)} ${oldProduct.unit}`;
    const diff = newStock - oldProduct.stock;

    const updatedProduct: Product = {
      ...oldProduct,
      stock: newStock,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id,
      updatedByName: currentUser.name,
      version: (oldProduct.version || 1) + 1,
    };

    products[productIndex] = updatedProduct;
    this.saveProducts(products);

    this.recordStockMovement({
      productId: updatedProduct.id,
      productName: updatedProduct.name,
      movementType: 'adjustment',
      quantityChange: diff,
      quantityBefore: oldProduct.stock,
      quantityAfter: newStock,
      unitPrice: updatedProduct.price,
      totalValue: Math.abs(diff) * updatedProduct.price,
      referenceType: 'adjustment',
      reason: 'تعدیل دستی موجودی انبار',
      performedBy: currentUser.id,
      performedByName: currentUser.name,
      notes: diff > 0 ? `افزایش (+${toPersianDigits(diff)} ${updatedProduct.unit})` : `کاهش (${toPersianDigits(diff)} ${updatedProduct.unit})`,
    });

    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId,
      productName: updatedProduct.name,
      changeType: 'stock_update',
      oldValue: oldStockStr,
      newValue: newStockStr,
      diffAmount: diff,
      changedBy: currentUser.id,
      changedByName: currentUser.name,
      changedAt: updatedProduct.updatedAt,
      synced: !this.isSimulatedOffline(),
    };
    this.addAuditLog(log);

    const diffText = diff > 0 ? `افزایش (+${toPersianDigits(diff)} ${updatedProduct.unit})` : `کاهش (${toPersianDigits(diff)} ${updatedProduct.unit})`;
    const notification: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: `تغییر موجودی انبار توسط ${currentUser.name}`,
      body: `${currentUser.name} موجودی «${updatedProduct.name}» را از ${oldStockStr} به ${newStockStr} به روز کرد (${diffText}).`,
      type: 'stock_change',
      read: false,
      createdAt: updatedProduct.updatedAt,
      relatedLogId: log.id,
      authorId: currentUser.id,
    };
    this.addNotification(notification);

    if (this.isSimulatedOffline()) {
      this.addToPendingSync({ type: 'stock_update', id: productId, timestamp: updatedProduct.updatedAt });
    }

    soundManager.playTapSound();
    this.checkAndTriggerStockAlert(updatedProduct, oldProduct.stock);
    broadcast({
      type: 'DATA_UPDATED',
      sourceUserId: currentUser.id,
      log,
      notification,
      product: updatedProduct,
    });

    return { product: updatedProduct, log, notification };
  },

  saveProductDetails(
    productData: Partial<Product> & { name: string; price: number; stock: number; unit: any; applyProfit?: boolean },
    currentUser: User
  ): Product {
    const products = this.getProducts();
    const isNew = !productData.id;
    let finalProduct: Product;

    if (isNew) {
      const generatedCode = productData.code || `HA-${Math.floor(100 + Math.random() * 900)}`;
      finalProduct = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: productData.name,
        code: generatedCode,
        category: productData.category || 'ابزار دستی',
        categoryId: productData.categoryId,
        price: productData.price,
        buyPrice: productData.buyPrice,
        stock: productData.stock,
        packUnit: productData.packUnit,
        packSize: productData.packSize,
        maxStock: productData.maxStock,
        tagIds: productData.tagIds || [],
        unit: productData.unit || 'عدد',
        description: productData.description || '',
        imageUrl: productData.imageUrl || '',
        deductFromStock: productData.deductFromStock !== undefined ? productData.deductFromStock : true,
        minStock: productData.minStock !== undefined ? productData.minStock : 5,
        criticalStock: productData.criticalStock !== undefined ? productData.criticalStock : 0,
        alertEnabled: productData.alertEnabled !== undefined ? productData.alertEnabled : true,
        productionDate: productData.productionDate || null,
        expiryDate: productData.expiryDate || null,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.id,
        updatedByName: currentUser.name,
        version: 1,
      };
      products.unshift(finalProduct);

      // Record initial stock in stock history if stock > 0
      if (finalProduct.stock > 0) {
        this.recordStockMovement({
          productId: finalProduct.id,
          productName: finalProduct.name,
          movementType: 'initial',
          quantityChange: finalProduct.stock,
          quantityBefore: 0,
          quantityAfter: finalProduct.stock,
          unitPrice: finalProduct.buyPrice || finalProduct.price,
          totalValue: finalProduct.stock * (finalProduct.buyPrice || finalProduct.price),
          referenceType: 'initial',
          reason: 'ثبت اولیه کالا در انبار',
          performedBy: currentUser.id,
          performedByName: currentUser.name,
        });
      }

      const log: AuditLog = {
        id: `log_${Date.now()}`,
        productId: finalProduct.id,
        productName: finalProduct.name,
        changeType: 'create_product',
        oldValue: '---',
        newValue: `${formatToman(finalProduct.price)} · موجودی: ${toPersianDigits(finalProduct.stock)} ${finalProduct.unit}`,
        changedBy: currentUser.id,
        changedByName: currentUser.name,
        changedAt: finalProduct.updatedAt,
        synced: !this.isSimulatedOffline(),
      };
      this.addAuditLog(log);

      const notif: AppNotification = {
        id: `notif_${Date.now()}`,
        title: `افزودن ابزار جدید توسط ${currentUser.name}`,
        body: `${currentUser.name} ابزار جدید «${finalProduct.name}» (کد ${finalProduct.code}) را با قیمت ${formatToman(finalProduct.price)} ثبت کرد.`,
        type: 'system',
        read: false,
        createdAt: finalProduct.updatedAt,
        authorId: currentUser.id,
      };
      this.addNotification(notif);

      broadcast({
        type: 'DATA_UPDATED',
        sourceUserId: currentUser.id,
        log,
        notification: notif,
        product: finalProduct,
      });
    } else {
      const index = products.findIndex((p) => p.id === productData.id);
      const existing = products[index];
      finalProduct = {
        ...existing,
        ...productData,
        productionDate: productData.productionDate !== undefined ? productData.productionDate : existing.productionDate,
        expiryDate: productData.expiryDate !== undefined ? productData.expiryDate : existing.expiryDate,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.id,
        updatedByName: currentUser.name,
        version: (existing.version || 1) + 1,
      };
      finalProduct = this.autoSellFromBuy(finalProduct, existing.buyPrice, existing.price, !!productData.applyProfit);
      products[index] = finalProduct;

      const log: AuditLog = {
        id: `log_${Date.now()}`,
        productId: finalProduct.id,
        productName: finalProduct.name,
        changeType: 'edit_product',
        oldValue: `قیمت: ${formatToman(existing.price)} · موجودی: ${toPersianDigits(existing.stock)}`,
        newValue: `قیمت: ${formatToman(finalProduct.price)} · موجودی: ${toPersianDigits(finalProduct.stock)}`,
        changedBy: currentUser.id,
        changedByName: currentUser.name,
        changedAt: finalProduct.updatedAt,
        synced: !this.isSimulatedOffline(),
      };
      this.addAuditLog(log);

      const notif: AppNotification = {
        id: `notif_${Date.now()}`,
        title: `ویرایش مشخصات توسط ${currentUser.name}`,
        body: `${currentUser.name} مشخصات «${finalProduct.name}» را ویرایش و به‌روزرسانی کرد.`,
        type: 'system',
        read: false,
        createdAt: finalProduct.updatedAt,
        authorId: currentUser.id,
      };
      this.addNotification(notif);

      broadcast({
        type: 'DATA_UPDATED',
        sourceUserId: currentUser.id,
        log,
        notification: notif,
        product: finalProduct,
      });
    }

    this.saveProducts(products);
    this.addToPendingSync({ type: 'product_save', id: finalProduct.id, timestamp: finalProduct.updatedAt });
    this.checkAndTriggerStockAlert(finalProduct);
    soundManager.playSuccessSound();
    return finalProduct;
  },

  softDeleteProduct(productId: string, currentUser: User): boolean {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === productId);
    if (index === -1) return false;

    const prod = products[index];
    prod.deleted = true;
    prod.updatedAt = new Date().toISOString();
    prod.updatedBy = currentUser.id;
    prod.updatedByName = currentUser.name;
    prod.version = (prod.version || 1) + 1;

    this.saveProducts(products);
    this.addToPendingSync({ type: 'product_delete', id: prod.id, timestamp: prod.updatedAt });

    const log: AuditLog = {
      id: `log_${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      changeType: 'delete_product',
      oldValue: 'فعال در انبار',
      newValue: 'حذف موقت از لیست',
      changedBy: currentUser.id,
      changedByName: currentUser.name,
      changedAt: prod.updatedAt,
      synced: !this.isSimulatedOffline(),
    };
    this.addAuditLog(log);

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: `حذف کالا توسط ${currentUser.name}`,
      body: `${currentUser.name} کالا «${prod.name}» را از لیست موجودی انبار حذف کرد.`,
      type: 'system',
      read: false,
      createdAt: prod.updatedAt,
      authorId: currentUser.id,
    };
    this.addNotification(notif);

    broadcast({
      type: 'DATA_UPDATED',
      sourceUserId: currentUser.id,
      log,
      notification: notif,
      product: prod,
    });

    return true;
  },

  /** حذف دائمی رکورد کالا از فهرست کالاها؛ سوابق فاکتورها و گزارش‌های تاریخی عمداً حفظ می‌شوند. */
  permanentDeleteProduct(productId: string, currentUser: User): boolean {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === productId);
    if (index === -1) return false;

    const [prod] = products.splice(index, 1);
    const now = new Date().toISOString();
    this.saveProducts(products);
    this.addToPendingSync({ type: 'product_permanent_delete', id: prod.id, timestamp: now });

    const log: AuditLog = {
      id: `log_${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      changeType: 'delete_product',
      oldValue: prod.deleted ? 'حذف موقت‌شده' : 'فعال در فهرست کالاها',
      newValue: 'حذف دائمی از فهرست کالاها؛ سوابق فاکتور حفظ شد',
      changedBy: currentUser.id,
      changedByName: currentUser.name,
      changedAt: now,
      synced: !this.isSimulatedOffline(),
    };
    this.addAuditLog(log);

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: `حذف دائمی کالا توسط ${currentUser.name}`,
      body: `کالا «${prod.name}» از فهرست کالاها حذف دائمی شد؛ سوابق فاکتورها و گزارش‌های تاریخی حفظ شدند.`,
      type: 'system',
      read: false,
      createdAt: now,
      authorId: currentUser.id,
    };
    this.addNotification(notif);
    broadcast({ type: 'DATA_UPDATED', sourceUserId: currentUser.id, log, notification: notif });
    return true;
  },

  updateProductAnalyticsParams(
    productId: string,
    params: { leadTimeDays?: number; safetyFactor?: number; analysisPeriodDays?: number },
    currentUser?: User
  ): Product | null {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === productId);
    if (index === -1) return null;

    const existing = products[index];
    const user = currentUser || this.getCurrentUser();
    const updated: Product = {
      ...existing,
      leadTimeDays: params.leadTimeDays !== undefined ? params.leadTimeDays : existing.leadTimeDays,
      safetyFactor: params.safetyFactor !== undefined ? params.safetyFactor : existing.safetyFactor,
      analysisPeriodDays: params.analysisPeriodDays !== undefined ? params.analysisPeriodDays : existing.analysisPeriodDays,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
      updatedByName: user.name,
    };
    products[index] = updated;
    this.saveProducts(products);

    const log: AuditLog = {
      id: `log_${Date.now()}`,
      productId: updated.id,
      productName: updated.name,
      changeType: 'edit_product',
      oldValue: `زمان تأمین: ${existing.leadTimeDays || 7} روز`,
      newValue: `زمان تأمین: ${updated.leadTimeDays} روز · ضریب اطمینان: ${updated.safetyFactor}`,
      changedBy: user.id,
      changedByName: user.name,
      changedAt: updated.updatedAt,
      synced: !this.isSimulatedOffline(),
    };
    this.addAuditLog(log);

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: `تنظیم پارامترهای تحلیل و سفارش کالا`,
      body: `${user.name} مشخصات هوشمند سفارش مجدد «${updated.name}» را به‌روزرسانی کرد.`,
      type: 'system',
      read: false,
      createdAt: updated.updatedAt,
      authorId: user.id,
    };
    this.addNotification(notif);

    broadcast({
      type: 'DATA_UPDATED',
      sourceUserId: user.id,
      log,
      notification: notif,
      product: updated,
    });

    return updated;
  },

  // Perform full sync
  syncNow(): { success: boolean; syncedItems: number } {
    const pendingCount = this.getPendingSyncCount();
    this.clearPendingSync();
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    // Mark audit logs as synced
    const logs = this.getAuditLogs().map((l) => ({ ...l, synced: true }));
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    } catch {
      // Ignore
    }

    soundManager.playSuccessSound();
    broadcast({ type: 'CLOUD_SYNCED', timestamp: new Date().toISOString() });
    return { success: true, syncedItems: pendingCount };
  },

  // ============================================
  // Customer Groups
  // ============================================
  getCustomerGroups(): CustomerGroup[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMER_GROUPS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMER_GROUPS, JSON.stringify(DEFAULT_CUSTOMER_GROUPS));
        return DEFAULT_CUSTOMER_GROUPS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_CUSTOMER_GROUPS;
    }
  },

  saveCustomerGroups(groups: CustomerGroup[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_GROUPS, JSON.stringify(groups));
    } catch {
      // Ignore
    }
  },

  addCustomerGroup(groupData: Omit<CustomerGroup, 'id' | 'createdAt' | 'updatedAt'>, currentUser?: User): CustomerGroup {
    const groups = this.getCustomerGroups();
    const newGroup: CustomerGroup = {
      ...groupData,
      id: `grp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    groups.push(newGroup);
    this.saveCustomerGroups(groups);
    return newGroup;
  },

  updateCustomerGroup(id: string, groupData: Partial<CustomerGroup>): CustomerGroup | null {
    const groups = this.getCustomerGroups();
    const idx = groups.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    const updated = {
      ...groups[idx],
      ...groupData,
      updatedAt: new Date().toISOString(),
    };
    groups[idx] = updated;
    this.saveCustomerGroups(groups);
    return updated;
  },

  deleteCustomerGroup(id: string): boolean {
    let groups = this.getCustomerGroups();
    groups = groups.filter((g) => g.id !== id);
    this.saveCustomerGroups(groups);
    return true;
  },

  // ============================================
  // Customer Ledger (Immutable)
  // ============================================
  getCustomerLedger(): CustomerLedgerEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMER_LEDGER);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMER_LEDGER, JSON.stringify(INITIAL_CUSTOMER_LEDGER));
        return INITIAL_CUSTOMER_LEDGER;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CUSTOMER_LEDGER;
    }
  },

  saveCustomerLedger(ledger: CustomerLedgerEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_LEDGER, JSON.stringify(ledger));
    } catch {
      // Ignore
    }
  },

  addCustomerLedgerEntry(entryData: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>): CustomerLedgerEntry {
    const ledger = this.getCustomerLedger();
    const newEntry: CustomerLedgerEntry = {
      ...entryData,
      id: `ledg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    ledger.push(newEntry);
    this.saveCustomerLedger(ledger);
    return newEntry;
  },

  getCustomerLedgerByCustomerId(customerId: string): CustomerLedgerEntry[] {
    const ledger = this.getCustomerLedger();
    return ledger
      .filter((l) => l.customerId === customerId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  // ============================================
  // Customers
  // ============================================
  getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
        return INITIAL_CUSTOMERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CUSTOMERS;
    }
  },

  saveCustomers(customers: Customer[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch {
      // Ignore
    }
  },

  getCustomerById(id: string): Customer | null {
    const customers = this.getCustomers();
    return customers.find((c) => c.id === id) || null;
  },

  getNextCustomerCode(): string {
    const customers = this.getCustomers();
    const year = '۱۴۰۴';
    const nextSeq = customers.length + 1;
    const seqStr = toPersianDigits(nextSeq.toString().padStart(4, '0'));
    return `مش-${year}-${seqStr}`;
  },

  addCustomer(
    customerData: Partial<Customer> & { name: string; mobile: string },
    currentUser?: User
  ): Customer {
    const customers = this.getCustomers();
    const user = currentUser || this.getCurrentUser();
    const nowIso = new Date().toISOString();
    const jalali = getJalaliNow(new Date());

    const customerCode = customerData.customerCode || this.getNextCustomerCode();
    const initialDebt = customerData.totalDebt ?? customerData.debt ?? 0;

    const newCustomer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: customerData.name,
      customerCode,
      mobile: customerData.mobile,
      phone: customerData.phone || null,
      address: customerData.address || null,
      groupId: customerData.groupId || null,
      defaultPriceLevel: customerData.defaultPriceLevel || null,
      defaultDiscountPercent: customerData.defaultDiscountPercent || 0,
      notes: customerData.notes || null,
      tags: customerData.tags || [],
      totalDebt: initialDebt,
      debt: initialDebt,
      totalPurchases: customerData.totalPurchases || 0,
      totalPayments: customerData.totalPayments || 0,
      lastPurchaseDate: customerData.lastPurchaseDate || null,
      lastPaymentDate: customerData.lastPaymentDate || null,
      isActive: customerData.isActive ?? true,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: user.id,
      deleted: false,
    };

    customers.unshift(newCustomer);
    this.saveCustomers(customers);

    // If initial debt !== 0, record initial balance in ledger
    if (initialDebt !== 0) {
      this.addCustomerLedgerEntry({
        customerId: newCustomer.id,
        customerName: newCustomer.name,
        entryType: 'initial_balance',
        debit: initialDebt > 0 ? initialDebt : 0,
        credit: initialDebt < 0 ? Math.abs(initialDebt) : 0,
        balanceBefore: 0,
        balanceAfter: initialDebt,
        date: jalali.date,
        time: jalali.time,
        timestamp: nowIso,
        description: 'مانده اولیه حساب',
        performedBy: user.id,
        performedByName: user.name,
      });
    }

    broadcast({ type: 'DATA_UPDATED', sourceUserId: user.id });
    return newCustomer;
  },

  updateCustomer(
    id: string,
    customerData: Partial<Customer>,
    currentUser?: User
  ): Customer | null {
    const customers = this.getCustomers();
    const idx = customers.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    const existing = customers[idx];
    const user = currentUser || this.getCurrentUser();
    const updated: Customer = {
      ...existing,
      ...customerData,
      debt: customerData.totalDebt !== undefined ? customerData.totalDebt : customerData.debt !== undefined ? customerData.debt : existing.debt,
      totalDebt: customerData.totalDebt !== undefined ? customerData.totalDebt : customerData.debt !== undefined ? customerData.debt : existing.totalDebt,
      updatedAt: new Date().toISOString(),
    };

    customers[idx] = updated;
    this.saveCustomers(customers);
    broadcast({ type: 'DATA_UPDATED', sourceUserId: user.id });
    return updated;
  },

  deleteCustomer(id: string, currentUser?: User): boolean {
    const customers = this.getCustomers();
    const idx = customers.findIndex((c) => c.id === id);
    if (idx === -1) return false;

    customers[idx].deleted = true;
    customers[idx].updatedAt = new Date().toISOString();
    this.saveCustomers(customers);

    const user = currentUser || this.getCurrentUser();
    broadcast({ type: 'DATA_UPDATED', sourceUserId: user.id });
    return true;
  },

  addCustomerPayment(
    customerId: string,
    amount: number,
    paymentMethod: 'cash' | 'pos' | 'card_transfer' | 'cheque' | 'credit',
    referenceNumber?: string,
    notes?: string,
    currentUser?: User
  ): { success: boolean; customer?: Customer; ledgerEntry?: CustomerLedgerEntry } {
    const customer = this.getCustomerById(customerId);
    if (!customer) return { success: false };

    const user = currentUser || this.getCurrentUser();
    const now = new Date();
    const nowIso = now.toISOString();
    const jalali = getJalaliNow(now);

    const balanceBefore = customer.totalDebt;
    const balanceAfter = balanceBefore - amount;

    const methodLabels: Record<string, string> = {
      cash: 'پرداخت نقدی',
      pos: 'پرداخت کارت‌خوان (پوز)',
      card_transfer: 'کارت به کارت / واریزی',
      cheque: 'پرداخت چکمانی',
      credit: 'اعتبار / تخفیف حساب',
    };

    const entryTypeMap: Record<string, LedgerEntryType> = {
      cash: 'payment_cash',
      pos: 'payment_card',
      card_transfer: 'payment_transfer',
      cheque: 'payment_cheque',
      credit: 'payment_credit',
    };

    const desc = `${methodLabels[paymentMethod] || 'پرداخت'}${
      referenceNumber ? ` (${referenceNumber})` : ''
    }`;

    const ledgerEntry = this.addCustomerLedgerEntry({
      customerId,
      customerName: customer.name,
      entryType: entryTypeMap[paymentMethod] || 'payment_cash',
      referenceNumber: referenceNumber || null,
      debit: 0,
      credit: amount,
      balanceBefore,
      balanceAfter,
      date: jalali.date,
      time: jalali.time,
      timestamp: nowIso,
      description: desc,
      performedBy: user.id,
      performedByName: user.name,
      notes: notes || null,
    });

    const updatedCust = this.updateCustomer(
      customerId,
      {
        totalDebt: balanceAfter,
        debt: balanceAfter,
        totalPayments: (customer.totalPayments || 0) + amount,
        lastPaymentDate: jalali.date,
      },
      user
    );

    this.addAuditLog({
      id: `log_${Date.now()}`,
      productId: 'customer_payment',
      productName: customer.name,
      changeType: 'edit_product',
      oldValue: `مانده: ${formatToman(balanceBefore)}`,
      newValue: `پرداخت ${formatToman(amount)} · مانده جدید: ${formatToman(balanceAfter)}`,
      changedBy: user.id,
      changedByName: user.name,
      changedAt: nowIso,
      synced: true,
    });

    return { success: true, customer: updatedCust || undefined, ledgerEntry };
  },

  addCustomerAdjustment(
    customerId: string,
    adjustmentType: 'debit' | 'credit',
    amount: number,
    reason: string,
    currentUser?: User
  ): { success: boolean; customer?: Customer; ledgerEntry?: CustomerLedgerEntry } {
    const customer = this.getCustomerById(customerId);
    if (!customer) return { success: false };

    const user = currentUser || this.getCurrentUser();
    const now = new Date();
    const nowIso = now.toISOString();
    const jalali = getJalaliNow(now);

    const balanceBefore = customer.totalDebt;
    const debit = adjustmentType === 'debit' ? amount : 0;
    const credit = adjustmentType === 'credit' ? amount : 0;
    const balanceAfter = balanceBefore + debit - credit;

    const ledgerEntry = this.addCustomerLedgerEntry({
      customerId,
      customerName: customer.name,
      entryType: 'adjustment',
      debit,
      credit,
      balanceBefore,
      balanceAfter,
      date: jalali.date,
      time: jalali.time,
      timestamp: nowIso,
      description: `تعدیل حساب: ${reason}`,
      performedBy: user.id,
      performedByName: user.name,
      notes: reason,
    });

    const updatedCust = this.updateCustomer(
      customerId,
      {
        totalDebt: balanceAfter,
        debt: balanceAfter,
      },
      user
    );

    return { success: true, customer: updatedCust || undefined, ledgerEntry };
  },

  // Invoices
  getInvoices(): Invoice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
        return INITIAL_INVOICES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_INVOICES;
    }
  },

  // ============================================
  // Payments
  // ============================================
  getPayments(): Payment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  savePayments(payments: Payment[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    } catch {
      // Ignore
    }
  },

  addPayment(paymentData: Omit<Payment, 'id' | 'createdAt' | 'paymentNumber'>): Payment {
    const payments = this.getPayments();
    const newPayment: Payment = {
      ...paymentData,
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      paymentNumber: `پ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    payments.push(newPayment);
    this.savePayments(payments);
    return newPayment;
  },

  // Shop Info
  getShopInfo(): ShopInfo {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHOP_INFO);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SHOP_INFO, JSON.stringify(DEFAULT_SHOP_INFO));
        return DEFAULT_SHOP_INFO;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_SHOP_INFO;
    }
  },

  saveShopInfo(info: ShopInfo): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SHOP_INFO, JSON.stringify(info));
    } catch {
      // Ignore
    }
  },

  // Invoice Settings
  getInvoiceSettings(): InvoiceSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICE_SETTINGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.INVOICE_SETTINGS, JSON.stringify(DEFAULT_INVOICE_SETTINGS));
        return DEFAULT_INVOICE_SETTINGS;
      }
      return { ...DEFAULT_INVOICE_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_INVOICE_SETTINGS;
    }
  },

  saveInvoiceSettings(settings: InvoiceSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICE_SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  },

  // Invoice Audit Logs
  getInvoiceAuditLogs(): InvoiceAuditLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICE_AUDIT_LOGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.INVOICE_AUDIT_LOGS, JSON.stringify(INITIAL_INVOICE_AUDIT_LOGS));
        return INITIAL_INVOICE_AUDIT_LOGS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_INVOICE_AUDIT_LOGS;
    }
  },

  addInvoiceAuditLog(log: InvoiceAuditLog): void {
    const logs = this.getInvoiceAuditLogs();
    const updated = [log, ...logs];
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICE_AUDIT_LOGS, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  },

  getLogsForInvoice(invoiceId: string, invoiceNumber?: string): InvoiceAuditLog[] {
    const logs = this.getInvoiceAuditLogs();
    return logs.filter((l) => l.invoiceId === invoiceId || (invoiceNumber && l.invoiceNumber === invoiceNumber));
  },

  recordInvoiceAction(
    invoice: Invoice,
    action: InvoiceAuditAction,
    details: string,
    currentUser: User,
    diffs?: InvoiceAuditDiff[]
  ): InvoiceAuditLog {
    const now = new Date();
    const jalaliDate = invoice.date || '۱۴۰۴/۰۸/۱۵';
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const log: InvoiceAuditLog = {
      id: `inv_log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      action,
      details,
      diffs,
      performedBy: currentUser.id,
      performedByName: currentUser.name,
      timestamp: now.toISOString(),
      date: jalaliDate,
      time: toPersianDigits(time),
    };
    this.addInvoiceAuditLog(log);
    return log;
  },

  // ============================================
  // Categories Management (Part 2, 3, 4, 7, 10)
  // ============================================
  getCategories(): Category[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
        return INITIAL_CATEGORIES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CATEGORIES;
    }
  },

  saveCategories(categories: Category[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch {
      // Ignore
    }
  },

  getActiveCategories(): Category[] {
    const categories = this.getCategories();
    const products = this.getProducts().filter((p) => !p.deleted);

    // Calculate productCount dynamically for accuracy
    return categories
      .filter((c) => !c.deleted)
      .map((cat) => {
        const count = products.filter((p) => p.categoryId === cat.id || p.category === cat.name).length;
        return { ...cat, productCount: count };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  createCategory(categoryData: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parentId?: string | null;
    displayOrder?: number;
  }): Category {
    const categories = this.getCategories();
    const now = new Date().toISOString();
    const newCategory: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: categoryData.name.trim(),
      description: categoryData.description?.trim() || '',
      color: categoryData.color || '#3B82F6',
      icon: categoryData.icon || 'Folder',
      parentId: categoryData.parentId || null,
      displayOrder: categoryData.displayOrder !== undefined ? categoryData.displayOrder : categories.length + 1,
      productCount: 0,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    categories.push(newCategory);
    this.saveCategories(categories);
    soundManager.playSuccessSound();
    return newCategory;
  },

  updateCategory(categoryId: string, updates: Partial<Category>): Category | null {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === categoryId);
    if (index === -1) return null;

    const oldCategory = categories[index];
    const updatedCategory: Category = {
      ...oldCategory,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    categories[index] = updatedCategory;
    this.saveCategories(categories);

    // If category name changed, update product category strings as well
    if (updates.name && updates.name !== oldCategory.name) {
      const products = this.getProducts();
      let changed = false;
      products.forEach((p) => {
        if (p.categoryId === categoryId || p.category === oldCategory.name) {
          p.category = updates.name!;
          p.categoryId = categoryId;
          changed = true;
        }
      });
      if (changed) {
        this.saveProducts(products);
      }
    }

    soundManager.playSuccessSound();
    return updatedCategory;
  },

  deleteCategory(
    categoryId: string,
    action: 'uncategorized' | 'delete_products' | 'move_to_category',
    targetCategoryId?: string
  ): boolean {
    const categories = this.getCategories();
    const targetCat = categories.find((c) => c.id === categoryId);
    if (!targetCat) return false;

    // Check if subcategories exist, mark them or set parent to null
    categories.forEach((c) => {
      if (c.parentId === categoryId) {
        c.parentId = null; // Promote to top level or handle
      }
    });

    targetCat.deleted = true;
    targetCat.updatedAt = new Date().toISOString();
    this.saveCategories(categories);

    // Handle products in this category
    const products = this.getProducts();
    let prodsChanged = false;

    if (action === 'delete_products') {
      products.forEach((p) => {
        if (p.categoryId === categoryId || p.category === targetCat.name) {
          p.deleted = true;
          prodsChanged = true;
        }
      });
    } else if (action === 'move_to_category' && targetCategoryId) {
      const destCat = categories.find((c) => c.id === targetCategoryId);
      if (destCat) {
        products.forEach((p) => {
          if (p.categoryId === categoryId || p.category === targetCat.name) {
            p.categoryId = destCat.id;
            p.category = destCat.name;
            prodsChanged = true;
          }
        });
      }
    } else {
      // 'uncategorized'
      products.forEach((p) => {
        if (p.categoryId === categoryId || p.category === targetCat.name) {
          p.categoryId = undefined;
          p.category = 'بدون دسته‌بندی';
          prodsChanged = true;
        }
      });
    }

    if (prodsChanged) {
      this.saveProducts(products);
    }

    return true;
  },

  reorderCategories(reorderedIds: string[]): void {
    const categories = this.getCategories();
    reorderedIds.forEach((id, idx) => {
      const c = categories.find((cat) => cat.id === id);
      if (c) c.displayOrder = idx + 1;
    });
    this.saveCategories(categories);
  },

  // ============================================
  // Stock History Tracking (Part 8, 9)
  // ============================================
  getStockHistory(productId?: string): StockHistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STOCK_HISTORY);
      const items: StockHistoryItem[] = data ? JSON.parse(data) : [];
      if (productId) {
        return items.filter((h) => h.productId === productId);
      }
      return items;
    } catch {
      return [];
    }
  },

  recordStockChange(item: Omit<StockHistoryItem, 'id' | 'date'>): StockHistoryItem {
    const history = this.getStockHistory();
    const newItem: StockHistoryItem = {
      ...item,
      id: `sh_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      date: new Date().toISOString(),
    };
    history.unshift(newItem);
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_HISTORY, JSON.stringify(history.slice(0, 500)));
    } catch {
      // Ignore
    }
    return newItem;
  },

  // ============================================
  // Warehouse Management System (Parts 2, 3, 5, 7, 8)
  // ============================================

  getStockMovements(productId?: string): StockMovement[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS);
      let movements: StockMovement[] = data ? JSON.parse(data) : [];

      // Seed realistic initial movements if empty
      if (movements.length === 0) {
        movements = this.seedInitialStockMovements();
        this.saveStockMovements(movements);
      }

      if (productId) {
        return movements.filter((m) => m.productId === productId);
      }
      return movements;
    } catch {
      return [];
    }
  },

  saveStockMovements(movements: StockMovement[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(movements.slice(0, 1000)));
    } catch {
      // Ignore
    }
  },

  recordStockMovement(movement: Omit<StockMovement, 'id' | 'performedAt'>): StockMovement {
    const movements = this.getStockMovements();
    const newMovement: StockMovement = {
      ...movement,
      id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      performedAt: new Date().toISOString(),
    };

    movements.unshift(newMovement);
    this.saveStockMovements(movements);

    // Also populate legacy StockHistoryItem for backward compatibility
    try {
      const legacyType =
        movement.movementType === 'purchase'
          ? 'invoice_purchase'
          : movement.movementType === 'sale' || movement.movementType === 'retail_sale'
          ? 'invoice_sales'
          : movement.movementType === 'return_from_customer'
          ? 'invoice_return'
          : movement.movementType === 'initial'
          ? 'initial'
          : 'manual_adjust';

      this.recordStockChange({
        productId: movement.productId,
        changeType: legacyType,
        quantityChange: movement.quantityChange,
        previousStock: movement.quantityBefore,
        newStock: movement.quantityAfter,
        referenceId: movement.referenceId || undefined,
        referenceNumber: movement.referenceNumber || undefined,
        userId: movement.performedBy,
        userName: movement.performedByName,
        note: movement.reason || movement.notes || undefined,
      });
    } catch {
      // Ignore legacy sync
    }

    broadcast({
      type: 'DATA_UPDATED',
      sourceUserId: movement.performedBy,
    });

    return newMovement;
  },

  seedInitialStockMovements(): StockMovement[] {
    const products = this.getProducts();
    const now = Date.now();
    const dayMs = 86400000;
    const seeded: StockMovement[] = [];

    // Helper for jalali formatting
    const p1 = products[0] || { id: 'prod_1', name: 'پیچ‌گوشتی برقی و شارژی رونیکس', stock: 18, price: 1450000 };
    const p2 = products[1] || { id: 'prod_2', name: 'دریل چکشی ۱۸ ولت براشلس', stock: 12, price: 3850000 };
    const p3 = products[2] || { id: 'prod_3', name: 'آچار فرانسه ۱۰ اینچ فولادی', stock: 25, price: 580000 };
    const p4 = products[3] || { id: 'prod_4', name: 'چکش ۵۰۰ گرمی دسته فایبرگلاس', stock: 17, price: 310000 };

    seeded.push(
      {
        id: 'sm_seed_1',
        productId: p1.id,
        productName: p1.name,
        movementType: 'purchase',
        quantityChange: 10,
        quantityBefore: 10,
        quantityAfter: 20,
        unitPrice: 1150000,
        totalValue: 11500000,
        referenceType: 'invoice',
        referenceNumber: 'خ-۱۴۰۴-۰۰۲۵',
        reason: 'خرید از ابزار رضا (فاکتور خرید)',
        performedBy: 'u_1',
        performedByName: 'علی محمدی',
        performedAt: new Date(now - 2 * dayMs + 14400000).toISOString(),
        notes: 'بارگیری محموله با بارنامه شماره ۱۸۵',
      },
      {
        id: 'sm_seed_2',
        productId: p1.id,
        productName: p1.name,
        movementType: 'sale',
        quantityChange: -2,
        quantityBefore: 20,
        quantityAfter: 18,
        unitPrice: 1450000,
        totalValue: 2900000,
        referenceType: 'invoice',
        referenceNumber: 'ف-۱۴۰۴-۰۰۴۲',
        reason: 'فاکتور فروش: مشتری آقای رضایی',
        performedBy: 'u_2',
        performedByName: 'حمید کمالی',
        performedAt: new Date(now - 2 * dayMs + 36000000).toISOString(),
      },
      {
        id: 'sm_seed_3',
        productId: p4.id,
        productName: p4.name,
        movementType: 'damage',
        quantityChange: -1,
        quantityBefore: 18,
        quantityAfter: 17,
        unitPrice: 240000,
        totalValue: 240000,
        referenceType: 'damage',
        referenceNumber: 'ض-۱۴۰۴-۰۰۱',
        reason: 'شکستگی در انبار بر اثر سقوط کارتن',
        performedBy: 'u_1',
        performedByName: 'علی محمدی',
        performedAt: new Date(now - 3 * dayMs).toISOString(),
      },
      {
        id: 'sm_seed_4',
        productId: p2.id,
        productName: p2.name,
        movementType: 'stocktake',
        quantityChange: -1,
        quantityBefore: 13,
        quantityAfter: 12,
        unitPrice: 3080000,
        totalValue: 3080000,
        referenceType: 'stocktake',
        referenceNumber: 'ش-۱۴۰۴-۰۰۱',
        reason: 'تطبیق مغایرت شمارش دوره مهرماه',
        performedBy: 'u_1',
        performedByName: 'علی محمدی',
        performedAt: new Date(now - 7 * dayMs).toISOString(),
      },
      {
        id: 'sm_seed_5',
        productId: p3.id,
        productName: p3.name,
        movementType: 'return_from_customer',
        quantityChange: 1,
        quantityBefore: 24,
        quantityAfter: 25,
        unitPrice: 580000,
        totalValue: 580000,
        referenceType: 'return',
        referenceNumber: 'م-۱۴۰۴-۰۰۱',
        reason: 'مرجوعی کالا توسط مشتری (اشتباه در سایز)',
        performedBy: 'u_2',
        performedByName: 'حمید کمالی',
        performedAt: new Date(now - 5 * dayMs).toISOString(),
      },
      {
        id: 'sm_seed_6',
        productId: p2.id,
        productName: p2.name,
        movementType: 'retail_sale',
        quantityChange: -1,
        quantityBefore: 14,
        quantityAfter: 13,
        unitPrice: 3850000,
        totalValue: 3850000,
        referenceType: 'invoice',
        referenceNumber: 'ف-۱۴۰۴-۰۰۳۹',
        reason: 'فروش خرده‌فروشی حضوری فروشگاه',
        performedBy: 'u_2',
        performedByName: 'حمید کمالی',
        performedAt: new Date(now - 8 * dayMs).toISOString(),
      },
      {
        id: 'sm_seed_7',
        productId: p1.id,
        productName: p1.name,
        movementType: 'initial',
        quantityChange: 10,
        quantityBefore: 0,
        quantityAfter: 10,
        unitPrice: 1150000,
        totalValue: 11500000,
        referenceType: 'initial',
        reason: 'موجودی اولیه کالا در شروع دوره',
        performedBy: 'u_1',
        performedByName: 'علی محمدی',
        performedAt: new Date(now - 30 * dayMs).toISOString(),
      }
    );

    return seeded;
  },

  // Stocktakes (Part 5, 6)
  getStocktakes(): Stocktake[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STOCKTAKES);
      let stocktakes: Stocktake[] = data ? JSON.parse(data) : [];

      if (stocktakes.length === 0) {
        stocktakes = this.seedInitialStocktakes();
        this.saveStocktakes(stocktakes);
      }
      return stocktakes;
    } catch {
      return [];
    }
  },

  saveStocktakes(stocktakes: Stocktake[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STOCKTAKES, JSON.stringify(stocktakes));
    } catch {
      // Ignore
    }
  },

  seedInitialStocktakes(): Stocktake[] {
    const now = Date.now();
    const dayMs = 86400000;
    return [
      {
        id: 'st_seed_2',
        stocktakeNumber: 'ش-۱۴۰۴-۰۰۲',
        title: 'شمارش ماهانه آبان',
        startDate: new Date(now - 1 * dayMs).toISOString(),
        endDate: null,
        status: 'in_progress',
        filterCategory: null,
        createdBy: 'u_1',
        createdByName: 'علی محمدی',
        notes: 'شمارش کلیه قفسه‌ها و انبارهای پشتی',
        totalItemsCounted: 45,
        totalDifferences: 2,
        totalDifferenceValue: -3200000,
      },
      {
        id: 'st_seed_1',
        stocktakeNumber: 'ش-۱۴۰۴-۰۰۱',
        title: 'شمارش دوره مهرماه',
        startDate: new Date(now - 32 * dayMs).toISOString(),
        endDate: new Date(now - 30 * dayMs).toISOString(),
        status: 'completed',
        filterCategory: null,
        createdBy: 'u_1',
        createdByName: 'علی محمدی',
        completedBy: 'u_1',
        completedByName: 'علی محمدی',
        completedAt: new Date(now - 30 * dayMs).toISOString(),
        notes: 'انبارگردانی پایان دوره با تطبیق کامل',
        totalItemsCounted: 120,
        totalDifferences: 5,
        totalDifferenceValue: -1200000,
      },
    ];
  },

  getStocktakeItems(stocktakeId: string): StocktakeItem[] {
    try {
      const key = `${STORAGE_KEYS.STOCKTAKE_ITEMS}_${stocktakeId}`;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }

      // Generate items from products if session exists
      const products = this.getProducts().filter((p) => !p.deleted);
      const items: StocktakeItem[] = products.map((prod, idx) => ({
        id: `sti_${stocktakeId}_${prod.id}`,
        stocktakeId,
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        systemQuantity: prod.stock,
        countedQuantity: idx < 3 ? Math.max(0, prod.stock - (idx === 1 ? 1 : 0)) : prod.stock,
        difference: idx === 1 ? -1 : 0,
        differenceValue: idx === 1 ? -(prod.buyPrice || prod.price) : 0,
        reason: idx === 1 ? 'شکستگی' : null,
        countedBy: 'u_1',
        countedAt: new Date().toISOString(),
        notes: null,
      }));

      this.saveStocktakeItems(stocktakeId, items);
      return items;
    } catch {
      return [];
    }
  },

  saveStocktakeItems(stocktakeId: string, items: StocktakeItem[]): void {
    try {
      const key = `${STORAGE_KEYS.STOCKTAKE_ITEMS}_${stocktakeId}`;
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // Ignore
    }
  },

  createStocktake(
    data: { title: string; filterCategory?: string | null; notes?: string; locationId?: string | null },
    currentUser: User
  ): { stocktake: Stocktake; items: StocktakeItem[] } {
    const stocktakes = this.getStocktakes();
    const d = new Date();
    const [jy] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const nextSeq = stocktakes.length + 1;
    const seqStr = nextSeq.toString().padStart(3, '0');
    const stocktakeNumber = `ش-${jy}-${seqStr}`;

    const newStocktake: Stocktake = {
      id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      stocktakeNumber,
      title: data.title,
      startDate: new Date().toISOString(),
      endDate: null,
      status: 'in_progress',
      filterCategory: data.filterCategory || null,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      notes: data.notes || '',
      locationId: data.locationId || null,
      totalItemsCounted: 0,
      totalDifferences: 0,
      totalDifferenceValue: 0,
    };

    stocktakes.unshift(newStocktake);
    this.saveStocktakes(stocktakes);

    // Populate items
    let products = this.getProducts().filter((p) => !p.deleted);
    if (data.filterCategory) {
      products = products.filter((p) => p.category === data.filterCategory || p.categoryId === data.filterCategory);
    }

    const locId = data.locationId || null;
    if (locId) products = products.filter((p) => (p.locationStock?.[locId] ?? 0) > 0);
    const qtyAt = (prod: Product): number => (locId ? prod.locationStock?.[locId] ?? 0 : prod.stock);

    const items: StocktakeItem[] = products.map((prod) => ({
      id: `sti_${newStocktake.id}_${prod.id}`,
      stocktakeId: newStocktake.id,
      productId: prod.id,
      productName: prod.name,
      productCode: prod.code,
      systemQuantity: qtyAt(prod),
      countedQuantity: qtyAt(prod), // Pre-filled with system stock for convenience
      difference: 0,
      differenceValue: 0,
      reason: null,
      countedBy: currentUser.id,
      countedAt: new Date().toISOString(),
      notes: null,
    }));

    this.saveStocktakeItems(newStocktake.id, items);

    broadcast({ type: 'DATA_UPDATED', sourceUserId: currentUser.id });
    return { stocktake: newStocktake, items };
  },

  updateStocktakeItem(
    stocktakeId: string,
    itemId: string,
    countedQuantity: number,
    reason?: string | null,
    notes?: string | null,
    currentUser?: User
  ): StocktakeItem | null {
    const items = this.getStocktakeItems(stocktakeId);
    const index = items.findIndex((i) => i.id === itemId);
    if (index === -1) return null;

    const item = items[index];
    const products = this.getProducts();
    const prod = products.find((p) => p.id === item.productId);
    const unitPrice = prod?.buyPrice || prod?.price || 0;

    const diff = countedQuantity - item.systemQuantity;
    const diffValue = diff * unitPrice;

    const updatedItem: StocktakeItem = {
      ...item,
      countedQuantity,
      difference: diff,
      differenceValue: diffValue,
      reason: reason || (diff !== 0 ? item.reason : null),
      notes: notes !== undefined ? notes : item.notes,
      countedBy: currentUser?.id || item.countedBy,
      countedAt: new Date().toISOString(),
    };

    items[index] = updatedItem;
    this.saveStocktakeItems(stocktakeId, items);

    // Update parent stocktake totals
    const stocktakes = this.getStocktakes();
    const stIndex = stocktakes.findIndex((s) => s.id === stocktakeId);
    if (stIndex !== -1) {
      const diffCount = items.filter((i) => i.difference !== 0).length;
      const totalDiffVal = items.reduce((sum, i) => sum + i.differenceValue, 0);
      stocktakes[stIndex].totalItemsCounted = items.length;
      stocktakes[stIndex].totalDifferences = diffCount;
      stocktakes[stIndex].totalDifferenceValue = totalDiffVal;
      this.saveStocktakes(stocktakes);
    }

    return updatedItem;
  },

  completeStocktake(stocktakeId: string, currentUser: User): { stocktake: Stocktake; updatedProductsCount: number } {
    const stocktakes = this.getStocktakes();
    const stIndex = stocktakes.findIndex((s) => s.id === stocktakeId);
    if (stIndex === -1) throw new Error('Stocktake session not found');

    const stocktake = stocktakes[stIndex];
    const items = this.getStocktakeItems(stocktakeId);
    const products = this.getProducts();
    let updatedCount = 0;

    // Apply differences to products
    items.forEach((item) => {
      if (item.difference !== 0) {
        const prodIndex = products.findIndex((p) => p.id === item.productId);
        if (prodIndex !== -1) {
          const oldStock = products[prodIndex].stock;
          let newStock = item.countedQuantity;
          if (stocktake.locationId) {
            // شمارش یک مکان: همان مکان به مقدار شمرده‌شده می‌رسد و جمع کل به‌روز می‌شود
            const locId = stocktake.locationId;
            const curLoc = products[prodIndex].locationStock?.[locId] ?? 0;
            const dist = this.applyLocationDelta(products[prodIndex].locationStock || {}, locId, item.countedQuantity - curLoc);
            products[prodIndex].locationStock = dist;
            newStock = Object.values<number>(dist).reduce((a, b) => a + b, 0);
          }
          products[prodIndex].stock = newStock;
          products[prodIndex].updatedAt = new Date().toISOString();
          products[prodIndex].updatedBy = currentUser.id;
          products[prodIndex].updatedByName = currentUser.name;
          products[prodIndex].version = (products[prodIndex].version || 1) + 1;
          updatedCount++;

          // Record stock movement
          this.recordStockMovement({
            productId: item.productId,
            productName: item.productName,
            movementType: 'stocktake',
            locationId: stocktake.locationId || null,
            locationName: stocktake.locationId ? this.getLocationPath(stocktake.locationId) : null,
            quantityChange: item.difference,
            quantityBefore: oldStock,
            quantityAfter: newStock,
            unitPrice: products[prodIndex].buyPrice || products[prodIndex].price,
            totalValue: Math.abs(item.differenceValue),
            referenceType: 'stocktake',
            referenceId: stocktake.id,
            referenceNumber: stocktake.stocktakeNumber,
            reason: item.reason || 'تطبیق شمارش انبارگردانی',
            performedBy: currentUser.id,
            performedByName: currentUser.name,
            notes: item.notes || `شمارش: ${stocktake.title}`,
          });

          // Log in audit logs
          this.addAuditLog({
            id: `log_st_${Date.now()}_${item.productId}`,
            productId: item.productId,
            productName: item.productName,
            changeType: 'stock_update',
            oldValue: `${toPersianDigits(oldStock)} عدد`,
            newValue: `${toPersianDigits(newStock)} عدد`,
            diffAmount: item.difference,
            changedBy: currentUser.id,
            changedByName: currentUser.name,
            changedAt: new Date().toISOString(),
            synced: true,
          });
        }
      }
    });

    if (updatedCount > 0) {
      this.saveProducts(products);
    }

    const completedStocktake: Stocktake = {
      ...stocktake,
      status: 'completed',
      endDate: new Date().toISOString(),
      completedBy: currentUser.id,
      completedByName: currentUser.name,
      completedAt: new Date().toISOString(),
      totalItemsCounted: items.length,
      totalDifferences: items.filter((i) => i.difference !== 0).length,
      totalDifferenceValue: items.reduce((sum, i) => sum + i.differenceValue, 0),
    };

    stocktakes[stIndex] = completedStocktake;
    this.saveStocktakes(stocktakes);

    soundManager.playSuccessSound();
    broadcast({ type: 'DATA_UPDATED', sourceUserId: currentUser.id });
    return { stocktake: completedStocktake, updatedProductsCount: updatedCount };
  },

  cancelStocktake(stocktakeId: string, currentUser: User): boolean {
    const stocktakes = this.getStocktakes();
    const stIndex = stocktakes.findIndex((s) => s.id === stocktakeId);
    if (stIndex === -1) return false;

    stocktakes[stIndex].status = 'cancelled';
    stocktakes[stIndex].endDate = new Date().toISOString();
    this.saveStocktakes(stocktakes);

    broadcast({ type: 'DATA_UPDATED', sourceUserId: currentUser.id });
    return true;
  },

  // Damages (Part 7, 9)
  getDamages(): Damage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAMAGES);
      let damages: Damage[] = data ? JSON.parse(data) : [];

      if (damages.length === 0) {
        damages = this.seedInitialDamages();
        this.saveDamages(damages);
      }
      return damages;
    } catch {
      return [];
    }
  },

  saveDamages(damages: Damage[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DAMAGES, JSON.stringify(damages));
    } catch {
      // Ignore
    }
  },

  seedInitialDamages(): Damage[] {
    const products = this.getProducts();
    const p = products[3] || products[0];
    return [
      {
        id: 'dmg_seed_1',
        damageNumber: 'ض-۱۴۰۴-۰۰۱',
        productId: p?.id || 'prod_4',
        productName: p?.name || 'چکش ۵۰۰ گرمی',
        productCode: p?.code || 'CH-010',
        quantity: 1,
        unitPrice: p?.buyPrice || 240000,
        totalValue: p?.buyPrice || 240000,
        reason: 'breakage',
        reasonNote: 'شکستگی دسته در انبار هنگام جابجایی کارتن',
        images: [],
        status: 'approved',
        reportedBy: 'u_1',
        reportedByName: 'علی محمدی',
        reportedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        approvedBy: 'u_1',
        approvedByName: 'علی محمدی',
        approvedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        notes: 'امحا گردید',
      },
    ];
  },

  recordDamage(
    data: {
      productId: string;
      quantity: number;
      locationId?: string | null;
      reason: DamageReason;
      reasonNote?: string | null;
      images?: string[];
      notes?: string | null;
    },
    currentUser: User
  ): Damage {
    const damages = this.getDamages();
    const d = new Date();
    const [jy] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const damageNumber = `ض-${jy}-${(damages.length + 1).toString().padStart(3, '0')}`;

    const products = this.getProducts();
    const prodIndex = products.findIndex((p) => p.id === data.productId);
    if (prodIndex === -1) throw new Error('Product not found');

    const product = products[prodIndex];
    const unitPrice = product.buyPrice || product.price;
    const totalValue = data.quantity * unitPrice;
    const oldStock = product.stock;
    const newStock = Math.max(0, oldStock - data.quantity);

    // 1. Update product stock (کسر از مکان انتخابی؛ اگر نبود، از مکان اصلی)
    products[prodIndex].stock = newStock;
    products[prodIndex].locationStock = this.applyLocationDelta(
      product.locationStock || {},
      data.locationId || DEFAULT_LOCATION_ID,
      newStock - oldStock
    );
    products[prodIndex].updatedAt = new Date().toISOString();
    products[prodIndex].updatedBy = currentUser.id;
    products[prodIndex].updatedByName = currentUser.name;
    products[prodIndex].version = (product.version || 1) + 1;
    this.saveProducts(products);

    // 2. Create damage record
    const newDamage: Damage = {
      id: `dmg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      damageNumber,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      quantity: data.quantity,
      locationId: data.locationId || DEFAULT_LOCATION_ID,
      unitPrice,
      totalValue,
      reason: data.reason,
      reasonNote: data.reasonNote || null,
      images: data.images || [],
      status: 'approved',
      reportedBy: currentUser.id,
      reportedByName: currentUser.name,
      reportedAt: new Date().toISOString(),
      approvedBy: currentUser.id,
      approvedByName: currentUser.name,
      approvedAt: new Date().toISOString(),
      notes: data.notes || null,
    };

    damages.unshift(newDamage);
    this.saveDamages(damages);

    // 3. Record stock movement
    this.recordStockMovement({
      productId: product.id,
      productName: product.name,
      movementType: 'damage',
      quantityChange: -data.quantity,
      quantityBefore: oldStock,
      quantityAfter: newStock,
      unitPrice,
      totalValue,
      referenceType: 'damage',
      referenceId: newDamage.id,
      referenceNumber: damageNumber,
      reason: data.reasonNote || `ضایعات به دلیل ${data.reason}`,
      performedBy: currentUser.id,
      performedByName: currentUser.name,
      notes: data.notes || undefined,
    });

    // 4. Audit log
    this.addAuditLog({
      id: `log_dmg_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      changeType: 'stock_update',
      oldValue: `${toPersianDigits(oldStock)} عدد`,
      newValue: `${toPersianDigits(newStock)} عدد`,
      diffAmount: -data.quantity,
      changedBy: currentUser.id,
      changedByName: currentUser.name,
      changedAt: new Date().toISOString(),
      synced: true,
    });

    soundManager.playTapSound();
    broadcast({ type: 'DATA_UPDATED', sourceUserId: currentUser.id });
    return newDamage;
  },

  // Returns from Customer (Part 8, 9)
  getCustomerReturns(): ReturnFromCustomer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RETURNS_CUSTOMER);
      let returns: ReturnFromCustomer[] = data ? JSON.parse(data) : [];

      if (returns.length === 0) {
        returns = this.seedInitialCustomerReturns();
        this.saveCustomerReturns(returns);
      }
      return returns;
    } catch {
      return [];
    }
  },

  saveCustomerReturns(returns: ReturnFromCustomer[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RETURNS_CUSTOMER, JSON.stringify(returns));
    } catch {
      // Ignore
    }
  },

  seedInitialCustomerReturns(): ReturnFromCustomer[] {
    const products = this.getProducts();
    const p = products[2] || products[0];
    return [
      {
        id: 'ret_cust_seed_1',
        returnNumber: 'م-۱۴۰۴-۰۰۱',
        originalInvoiceNumber: 'ف-۱۴۰۴-۰۰۳۵',
        customerName: 'آقای اکبری',
        items: [
          {
            productId: p?.id || 'prod_3',
            productName: p?.name || 'آچار فرانسه ۱۰ اینچ',
            productCode: p?.code || 'WR-10IN',
            quantity: 1,
            unitPrice: p?.price || 580000,
            total: p?.price || 580000,
          },
        ],
        reason: 'wrong_item',
        reasonNote: 'مشتری سایز ۸ اینچ نیاز داشت',
        totalRefund: p?.price || 580000,
        returnToStock: true,
        status: 'completed',
        reportedBy: 'u_2',
        reportedByName: 'حمید کمالی',
        reportedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ];
  },

  recordCustomerReturn(
    data: Omit<ReturnFromCustomer, 'id' | 'returnNumber' | 'reportedAt'>,
    currentUser: User
  ): ReturnFromCustomer {
    const returns = this.getCustomerReturns();
    const d = new Date();
    const [jy] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const returnNumber = `م-${jy}-${(returns.length + 1).toString().padStart(3, '0')}`;

    const newReturn: ReturnFromCustomer = {
      ...data,
      id: `rc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      returnNumber,
      reportedAt: new Date().toISOString(),
    };

    returns.unshift(newReturn);
    this.saveCustomerReturns(returns);

    // If returnToStock is true, increase stock for each returned item
    if (data.returnToStock) {
      const products = this.getProducts();
      data.items.forEach((item) => {
        const prodIndex = products.findIndex((p) => p.id === item.productId);
        if (prodIndex !== -1) {
          const oldStock = products[prodIndex].stock;
          const newStock = oldStock + item.quantity;
          products[prodIndex].stock = newStock;
          products[prodIndex].updatedAt = new Date().toISOString();
          products[prodIndex].updatedBy = currentUser.id;
          products[prodIndex].updatedByName = currentUser.name;
          products[prodIndex].version = (products[prodIndex].version || 1) + 1;

          // Record stock movement
          this.recordStockMovement({
            productId: item.productId,
            productName: item.productName,
            movementType: 'return_from_customer',
            quantityChange: item.quantity,
            quantityBefore: oldStock,
            quantityAfter: newStock,
            unitPrice: item.unitPrice,
            totalValue: item.total,
            referenceType: 'return_customer',
            referenceId: newReturn.id,
            referenceNumber: returnNumber,
            reason: `مرجوعی از مشتری: ${data.customerName}`,
            performedBy: currentUser.id,
            performedByName: currentUser.name,
            notes: data.reasonNote || undefined,
          });
        }
      });
      this.saveProducts(products);
    }

    soundManager.playSuccessSound();
    broadcast({ type: 'DATA_UPDATED', sourceUserId: currentUser.id });
    return newReturn;
  },

  // Returns to Supplier (Part 8, 9)
  getSupplierReturns(): ReturnToSupplier[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RETURNS_SUPPLIER);
      let returns: ReturnToSupplier[] = data ? JSON.parse(data) : [];

      if (returns.length === 0) {
        returns = this.seedInitialSupplierReturns();
        this.saveSupplierReturns(returns);
      }
      return returns;
    } catch {
      return [];
    }
  },

  saveSupplierReturns(returns: ReturnToSupplier[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RETURNS_SUPPLIER, JSON.stringify(returns));
    } catch {
      // Ignore
    }
  },

  seedInitialSupplierReturns(): ReturnToSupplier[] {
    const products = this.getProducts();
    const p = products[1] || products[0];
    return [
      {
        id: 'ret_supp_seed_1',
        returnNumber: 'م-ت-۱۴۰۴-۰۰۱',
        supplierName: 'ابزار رضا',
        items: [
          {
            productId: p?.id || 'prod_2',
            productName: p?.name || 'دریل شارژی',
            productCode: p?.code || 'DR-18V',
            quantity: 1,
            buyPrice: p?.buyPrice || 3080000,
            total: p?.buyPrice || 3080000,
          },
        ],
        reason: 'defective',
        reasonNote: 'خرابی ترکمتر کالا و ارجاع به گارانتی تأمین‌کننده',
        expectedRefund: p?.buyPrice || 3080000,
        status: 'completed',
        reportedBy: 'u_1',
        reportedByName: 'علی محمدی',
        reportedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ];
  },

  recordSupplierReturn(
    data: Omit<ReturnToSupplier, 'id' | 'returnNumber' | 'reportedAt'>,
    currentUser: User
  ): ReturnToSupplier {
    const returns = this.getSupplierReturns();
    const d = new Date();
    const [jy] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const returnNumber = `م-ت-${jy}-${(returns.length + 1).toString().padStart(3, '0')}`;

    const newReturn: ReturnToSupplier = {
      ...data,
      id: `rs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      returnNumber,
      reportedAt: new Date().toISOString(),
    };

    returns.unshift(newReturn);
    this.saveSupplierReturns(returns);

    // Decrease stock for items returned to supplier
    const products = this.getProducts();
    data.items.forEach((item) => {
      const prodIndex = products.findIndex((p) => p.id === item.productId);
      if (prodIndex !== -1) {
        const oldStock = products[prodIndex].stock;
        const newStock = Math.max(0, oldStock - item.quantity);
        products[prodIndex].stock = newStock;
        products[prodIndex].updatedAt = new Date().toISOString();
        products[prodIndex].updatedBy = currentUser.id;
        products[prodIndex].updatedByName = currentUser.name;
        products[prodIndex].version = (products[prodIndex].version || 1) + 1;

        // Record stock movement
        this.recordStockMovement({
          productId: item.productId,
          productName: item.productName,
          movementType: 'return_to_supplier',
          quantityChange: -item.quantity,
          quantityBefore: oldStock,
          quantityAfter: newStock,
          unitPrice: item.buyPrice,
          totalValue: item.total,
          referenceType: 'return_supplier',
          referenceId: newReturn.id,
          referenceNumber: returnNumber,
          reason: `مرجوعی به تأمین‌کننده: ${data.supplierName}`,
          performedBy: currentUser.id,
          performedByName: currentUser.name,
          notes: data.reasonNote || undefined,
        });
      }
    });
    this.saveProducts(products);

    soundManager.playSuccessSound();
    broadcast({ type: 'DATA_UPDATED', sourceUserId: currentUser.id });
    return newReturn;
  },

  // ============================================
  // Stock Alert System & Anti-Spam (Part 4, 7)
  // ============================================
  getStockAlertSettings(): StockAlertSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STOCK_ALERT_SETTINGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.STOCK_ALERT_SETTINGS, JSON.stringify(DEFAULT_STOCK_ALERT_SETTINGS));
        return DEFAULT_STOCK_ALERT_SETTINGS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_STOCK_ALERT_SETTINGS;
    }
  },

  saveStockAlertSettings(settings: StockAlertSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_ALERT_SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  },

  // ============================================
  // Automatic Price Lookup & Abzarreza (Parts 1-14)
  // ============================================
  getAutoPricingSettings(): AutoPricingSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTO_PRICING_SETTINGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.AUTO_PRICING_SETTINGS, JSON.stringify(DEFAULT_AUTO_PRICING_SETTINGS));
        return DEFAULT_AUTO_PRICING_SETTINGS;
      }
      return { ...DEFAULT_AUTO_PRICING_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_AUTO_PRICING_SETTINGS;
    }
  },

  saveAutoPricingSettings(settings: AutoPricingSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_PRICING_SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  },

  // ============================================
  // Expiry Date Management System (Expiry Parts 1-14)
  // ============================================
  getDefaultExpirySettings(): ExpirySettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPIRY_SETTINGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.EXPIRY_SETTINGS, JSON.stringify(DEFAULT_EXPIRY_SETTINGS));
        return DEFAULT_EXPIRY_SETTINGS;
      }
      return { ...DEFAULT_EXPIRY_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_EXPIRY_SETTINGS;
    }
  },

  saveDefaultExpirySettings(settings: ExpirySettings, currentUser?: User): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPIRY_SETTINGS, JSON.stringify(settings));
      const user = currentUser || this.getCurrentUser();
      this.addAuditLog({
        id: `log_${Date.now()}`,
        productId: 'settings',
        productName: 'تنظیمات انقضا',
        changeType: 'expiry_settings_update',
        oldValue: 'تنظیمات قبلی',
        newValue: `هشدار: ${settings.defaultExpiryWarningDays} روز · بحرانی: ${settings.defaultExpiryCriticalDays} روز`,
        changedBy: user.id,
        changedByName: user.name,
        changedAt: new Date().toISOString(),
        synced: true,
      });
      broadcast({ type: 'DATA_UPDATED', sourceUserId: user.id });
    } catch {
      // Ignore
    }
  },

  getStockBatches(): StockBatch[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STOCK_BATCHES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.STOCK_BATCHES, JSON.stringify(INITIAL_STOCK_BATCHES));
        return INITIAL_STOCK_BATCHES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_STOCK_BATCHES;
    }
  },

  saveStockBatches(batches: StockBatch[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_BATCHES, JSON.stringify(batches));
    } catch {
      // Ignore
    }
  },

  addStockBatch(batchData: Omit<StockBatch, 'id' | 'receivedAt'>, currentUser?: User): StockBatch {
    const batches = this.getStockBatches();
    const user = currentUser || this.getCurrentUser();
    const newBatch: StockBatch = {
      ...batchData,
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      receivedAt: new Date().toISOString(),
      receivedBy: user.id,
      receivedByName: user.name,
      remainingQuantity: batchData.quantity,
    };
    batches.unshift(newBatch);
    this.saveStockBatches(batches);
    this.addToPendingSync({ type: 'batch_add', id: newBatch.id, timestamp: newBatch.receivedAt });

    this.addAuditLog({
      id: `log_${Date.now()}`,
      productId: newBatch.productId,
      productName: newBatch.productName,
      changeType: 'batch_add',
      oldValue: '---',
      newValue: `افزودن بچ ${newBatch.batchNumber || 'بدون شماره'} (${newBatch.quantity} عدد)`,
      changedBy: user.id,
      changedByName: user.name,
      changedAt: new Date().toISOString(),
      synced: true,
    });

    broadcast({ type: 'DATA_UPDATED', sourceUserId: user.id });
    return newBatch;
  },

  /** تگ و قیمت پیشرفته (اختیاری). پیش‌فرض خاموش؛ وقتی خاموش است فقط سود خود کالا اعمال می‌شود */
  advancedPricingEnabled(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.ADVANCED_PRICING) === 'true';
    } catch {
      return false;
    }
  },

  setAdvancedPricingEnabled(v: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ADVANCED_PRICING, v ? 'true' : 'false');
    } catch {
      // Ignore
    }
  },

  // ---------- انواع تگ (کاربر تعریف می‌کند) ----------
  getTagTypes(): TagType[] {
    try {
      const d = localStorage.getItem(STORAGE_KEYS.TAG_TYPES);
      if (!d) {
        localStorage.setItem(STORAGE_KEYS.TAG_TYPES, JSON.stringify(DEFAULT_TAG_TYPES));
        return DEFAULT_TAG_TYPES;
      }
      return JSON.parse(d) as TagType[];
    } catch {
      return DEFAULT_TAG_TYPES;
    }
  },

  saveTagTypes(list: TagType[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TAG_TYPES, JSON.stringify(list));
    } catch {
      // Ignore
    }
  },

  addTagType(name: string, drivesProfit: boolean): TagType {
    const list = this.getTagTypes();
    const t: TagType = { id: `ttype_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, name: name.trim(), drivesProfit };
    list.push(t);
    this.saveTagTypes(list);
    return t;
  },

  /** حذف نوع تگ: فقط وقتی تگی از این نوع نباشد */
  deleteTagType(id: string): { ok: boolean; reason?: string } {
    if (this.getTags().some((t) => (t.kind || 'general') === id)) {
      return { ok: false, reason: 'ابتدا تگ‌های این نوع را حذف یا به نوع دیگری ببر.' };
    }
    this.saveTagTypes(this.getTagTypes().filter((t) => t.id !== id));
    return { ok: true };
  },

  tagTypeName(id: string): string {
    return this.getTagTypes().find((t) => t.id === id)?.name || 'نامشخص';
  },

  tagTypeDrivesProfit(id: string): boolean {
    return !!this.getTagTypes().find((t) => t.id === id)?.drivesProfit;
  },

  /** تگ اصلی (ریشه‌ی) هر تگ */
  tagRootOf(tagId: string): string {
    const tags = this.getTags();
    let cur = tags.find((t) => t.id === tagId);
    let g = 0;
    while (cur && cur.parentId && g++ < 50) {
      const pid: string = cur.parentId;
      cur = tags.find((t) => t.id === pid);
    }
    return cur ? cur.id : tagId;
  },

  /** ترتیب اولویت گروه‌های سود (تگ‌های اصلی سودساز). گروه‌های جدید به انتها اضافه می‌شوند */
  getProfitPriority(): string[] {
    const drivers = new Set(this.getTagTypes().filter((x) => x.drivesProfit).map((x) => x.id));
    const roots = this.getTags().filter((t) => !t.parentId && drivers.has(t.kind || 'general')).map((t) => t.id);
    let stored: string[] = [];
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFIT_PRIORITY) || '[]') as string[];
    } catch {
      stored = [];
    }
    const kept = stored.filter((id) => roots.includes(id));
    const missing = roots.filter((id) => !kept.includes(id));
    return [...kept, ...missing];
  },

  setProfitPriority(ids: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFIT_PRIORITY, JSON.stringify(ids));
    } catch {
      // Ignore
    }
  },

  // ---------- تگ‌های کالا (درختی، بی‌حد) ----------
  getTags(): ProductTag[] {
    try {
      const d = localStorage.getItem(STORAGE_KEYS.TAGS);
      return d ? (JSON.parse(d) as ProductTag[]) : [];
    } catch {
      return [];
    }
  },

  saveTags(list: ProductTag[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(list));
    } catch {
      // Ignore
    }
  },

  addTag(name: string, parentId: string | null, kind: TagKind = 'general'): ProductTag {
    const list = this.getTags();
    const tag: ProductTag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      parentId,
      kind,
      createdAt: new Date().toISOString(),
    };
    list.push(tag);
    this.saveTags(list);
    return tag;
  },

  renameTag(id: string, name: string): void {
    this.saveTags(this.getTags().map((t) => (t.id === id ? { ...t, name: name.trim() } : t)));
  },

  /** حذف تگ: زیرمجموعه‌ها به والد تگ منتقل می‌شوند و تگ از کالاها برداشته می‌شود */
  deleteTag(id: string): { ok: boolean; reason?: string } {
    const list = this.getTags();
    const target = list.find((t) => t.id === id);
    if (!target) return { ok: false, reason: 'تگ پیدا نشد.' };
    this.saveTags(list.filter((t) => t.id !== id).map((t) => (t.parentId === id ? { ...t, parentId: target.parentId } : t)));
    const products = this.getProducts();
    if (products.some((p) => (p.tagIds || []).includes(id))) {
      this.saveProducts(products.map((p) => ((p.tagIds || []).includes(id) ? { ...p, tagIds: (p.tagIds || []).filter((x) => x !== id) } : p)));
    }
    return { ok: true };
  },

  /** سود مؤثر کالا: اول سود خود کالا، و اگر نداشت، سود اولین تگ دارای سود (و والدهای آن) */
  /** سود تعریف‌شده در تگ‌های کالا: عمیق‌ترین زیرگروهی که سود دارد (والد هم ارث می‌برد) */
  tagProfitFor(p: Product): { type: ProfitType; value: number; tagName: string } | null {
    const tags = this.getTags();
    const drivers = new Set(this.getTagTypes().filter((x) => x.drivesProfit).map((x) => x.id));
    const priority = this.getProfitPriority();
    const rankOf = (rootId: string) => {
      const i = priority.indexOf(rootId);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    const depthOf = (t: ProductTag): number => {
      let d = 0;
      let cur: ProductTag | undefined = t;
      let g = 0;
      while (cur && cur.parentId && g++ < 50) {
        d++;
        const pid: string = cur.parentId;
        cur = tags.find((x) => x.id === pid);
      }
      return d;
    };
    const isDriver = (t: ProductTag | undefined) => !!t && drivers.has(t.kind || 'general');

    // هر تگ کالا: نزدیک‌ترین تگ سودساز با سود (خودش یا والدش) را پیدا کن
    let best: { type: ProfitType; value: number; tagName: string; rank: number; depth: number } | null = null;
    for (const tid of p.tagIds || []) {
      let cur: ProductTag | undefined = tags.find((t) => t.id === tid);
      let g = 0;
      while (isDriver(cur) && g++ < 50) {
        if (cur!.profitType && typeof cur!.profitValue === 'number') {
          const cand = {
            type: cur!.profitType,
            value: cur!.profitValue,
            tagName: cur!.name,
            rank: rankOf(this.tagRootOf(cur!.id)),
            depth: depthOf(cur!),
          };
          // اول اولویت گروه (بالاتر برنده است)، بعد عمق (زیرگروه دقیق‌تر برنده است)
          if (!best || cand.rank < best.rank || (cand.rank === best.rank && cand.depth > best.depth)) best = cand;
          break;
        }
        const pid: string | null = cur!.parentId;
        cur = pid ? tags.find((t) => t.id === pid) : undefined;
      }
    }
    return best ? { type: best.type, value: best.value, tagName: best.tagName } : null;
  },

  /** آیا کالا حداقل یک تگ از نوع «گروه سود» دارد؟ */
  hasProfitTag(p: Product): boolean {
    const tags = this.getTags();
    const drivers = new Set(this.getTagTypes().filter((x) => x.drivesProfit).map((x) => x.id));
    return (p.tagIds || []).some((id) => drivers.has(tags.find((t) => t.id === id)?.kind || 'general'));
  },

  /**
   * سود مؤثر کالا، به ترتیب اولویت:
   * ۱) سود مخصوص کالا
   * ۲) سود تگ (عمیق‌ترین زیرگروه)؛ اگر کالا تگ دارد، بازه‌ی قیمت غیرفعال است
   * ۳) بازه‌ی قیمت خرید (فقط برای کالاهای بدون تگ)
   */
  effectiveProfit(p: Product): { type: ProfitType; value: number } | null {
    if (p.profitType && typeof p.profitValue === 'number') return { type: p.profitType, value: p.profitValue };
    if (!this.advancedPricingEnabled()) return null;
    if (this.hasProfitTag(p)) {
      const tp = this.tagProfitFor(p);
      return tp ? { type: tp.type, value: tp.value } : null;
    }
    const buy = p.buyPrice || 0;
    if (buy > 0) {
      const band = [...this.getProfitBands()]
        .sort((a, b) => a.minBuy - b.minBuy)
        .find((b) => buy >= b.minBuy && (b.maxBuy === null || buy < b.maxBuy));
      if (band) return { type: band.profitType, value: band.profitValue };
    }
    return null;
  },

  /** منبع سود کالا برای نمایش: کالا، تگ، بازه قیمتی یا بدون سود */
  profitSourceOf(p: Product): string {
    if (p.profitType && typeof p.profitValue === 'number') return 'سود خود کالا';
    if (!this.advancedPricingEnabled()) return 'بدون سود';
    if (this.hasProfitTag(p)) {
      const tp = this.tagProfitFor(p);
      return tp ? `سود «${tp.tagName}»` : 'بدون سود (تگ‌های سودساز کالا سود ندارند)';
    }
    const buy = p.buyPrice || 0;
    const band = [...this.getProfitBands()]
      .sort((a, b) => a.minBuy - b.minBuy)
      .find((b) => buy > 0 && buy >= b.minBuy && (b.maxBuy === null || buy < b.maxBuy));
    if (band) return `بازه قیمتی ${toPersianDigits(band.minBuy)} تا ${band.maxBuy === null ? '∞' : toPersianDigits(band.maxBuy)}`;
    return 'بدون سود';
  },

  getProfitBands(): ProfitBand[] {
    try {
      const d = localStorage.getItem(STORAGE_KEYS.PROFIT_BANDS);
      if (!d) {
        localStorage.setItem(STORAGE_KEYS.PROFIT_BANDS, JSON.stringify(DEFAULT_PROFIT_BANDS));
        return DEFAULT_PROFIT_BANDS;
      }
      return JSON.parse(d) as ProfitBand[];
    } catch {
      return DEFAULT_PROFIT_BANDS;
    }
  },

  /** آیا کاربر بازه‌ها را خودش تنظیم کرده؟ (تا وقتی نکرده، یادآوری نشان داده می‌شود) */
  profitBandsCustomized(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.PROFIT_BANDS_CUSTOM) === 'true';
    } catch {
      return false;
    }
  },

  saveProfitBands(list: ProfitBand[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFIT_BANDS, JSON.stringify(list));
      localStorage.setItem(STORAGE_KEYS.PROFIT_BANDS_CUSTOM, 'true');
    } catch {
      // Ignore
    }
  },

  addProfitBand(b: Omit<ProfitBand, 'id'>): ProfitBand {
    const list = this.getProfitBands();
    const band: ProfitBand = { ...b, id: `band_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` };
    list.push(band);
    this.saveProfitBands(list);
    return band;
  },

  deleteProfitBand(id: string): void {
    this.saveProfitBands(this.getProfitBands().filter((b) => b.id !== id));
  },

  /**
   * اگر قیمت خرید عوض شده و فروشنده قیمت فروش را دستی عوض نکرده، قیمت فروش
   * از روی سود مؤثر کالا دوباره محاسبه می‌شود.
   */
  /** آیا با قیمت خرید جدید، قیمت فعلی کمتر از سود تعریف‌شده است؟ (فقط اگر سود تعریف شده باشد) */
  buyPriceConflict(p: Product, newBuy: number): { current: number; target: number } | null {
    if (!newBuy || newBuy <= 0) return null;
    const prof = this.effectiveProfit({ ...p, buyPrice: newBuy });
    if (!prof) return null;
    const target = this.calcNewPrice(newBuy, prof.type, prof.value);
    // هر اختلافی: یا سود کمتر از حد است، یا بیشتر (مثلاً فروش دستی بالا رفته ولی خرید گران نشده)
    return target !== p.price ? { current: p.price, target } : null;
  },

  autoSellFromBuy(p: Product, prevBuy: number | undefined, prevSell: number | undefined, approve = false): Product {
    if (!approve) return p;
    const newBuy = p.buyPrice;
    if (!newBuy) return p;
    if (prevSell !== undefined && p.price !== prevSell) return p;
    const prof = this.effectiveProfit(p);
    if (!prof) return p;
    const sell = this.calcNewPrice(newBuy, prof.type, prof.value);
    return { ...p, price: sell, sellPrice: sell };
  },

  /** ثبت قیمت خرید جدید (مثلاً از ورود کالا) و محاسبه‌ی خودکار قیمت فروش */
  applyBuyPriceChange(productId: string, newBuy: number, user: User, approve = false): boolean {
    const products = this.getProducts();
    const idx = products.findIndex((p) => p.id === productId);
    if (idx === -1 || !newBuy || newBuy <= 0) return false;
    const prev = products[idx];
    if (newBuy === prev.buyPrice && !approve) return false;
    const updated = this.autoSellFromBuy({ ...prev, buyPrice: newBuy }, prev.buyPrice, prev.price, approve);
    const nowIso = new Date().toISOString();
    products[idx] = {
      ...updated,
      updatedAt: nowIso,
      updatedBy: user.id,
      updatedByName: user.name,
      version: (prev.version || 1) + 1,
    };
    this.saveProducts(products);
    if (updated.price !== prev.price) {
      this.addAuditLog({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productId: prev.id,
        productName: prev.name,
        changeType: 'price_update',
        oldValue: formatToman(prev.price),
        newValue: `${formatToman(updated.price)} (خودکار بر اساس قیمت خرید جدید ${formatToman(newBuy)})`,
        changedBy: user.id,
        changedByName: user.name,
        changedAt: nowIso,
        synced: !this.isSimulatedOffline(),
      });
    }
    return true;
  },

  /** تنظیم سود پیش‌فرض یک تگ (null یعنی حذف سود تگ) */
  setTagProfit(tagId: string, profitType: ProfitType | null, profitValue: number | null): void {
    this.saveTags(
      this.getTags().map((t) =>
        t.id === tagId
          ? { ...t, profitType: profitType || undefined, profitValue: profitValue ?? undefined }
          : t
      )
    );
  },

  /** اعمال فوری سود مؤثر به قیمت فروش همه‌ی کالاهای یک تگ (و زیرتگ‌ها) بر اساس قیمت خرید فعلی */
  applyTagProfitNow(tagId: string, includeSubtree: boolean, user: User): number {
    const scope = new Set(this.tagScopeIds(tagId, includeSubtree));
    const products = this.getProducts();
    const nowIso = new Date().toISOString();
    let n = 0;
    products.forEach((p, i) => {
      if (p.deleted || !p.buyPrice || !(p.tagIds || []).some((t) => scope.has(t))) return;
      const prof = this.effectiveProfit(p);
      if (!prof) return;
      const sell = this.calcNewPrice(p.buyPrice, prof.type, prof.value);
      if (sell === p.price) return;
      products[i] = { ...p, price: sell, sellPrice: sell, updatedAt: nowIso, updatedBy: user.id, updatedByName: user.name, version: (p.version || 1) + 1 };
      this.addAuditLog({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productId: p.id,
        productName: p.name,
        changeType: 'price_update',
        oldValue: formatToman(p.price),
        newValue: `${formatToman(sell)} (سود تگ اعمال شد)`,
        changedBy: user.id,
        changedByName: user.name,
        changedAt: nowIso,
        synced: !this.isSimulatedOffline(),
      });
      n++;
    });
    if (n) this.saveProducts(products);
    return n;
  },

  /** شناسه‌ی تگ و (در صورت نیاز) همه‌ی زیرمجموعه‌هایش */
  tagScopeIds(tagId: string, includeSubtree: boolean): string[] {
    if (!includeSubtree) return [tagId];
    const list = this.getTags();
    const out: string[] = [];
    const walk = (id: string) => {
      out.push(id);
      list.filter((t) => t.parentId === id).forEach((c) => walk(c.id));
    };
    walk(tagId);
    return out;
  },

  /** قیمت جدید: درصدی با گرد کردن به roundTo، یا مبلغی (مثبت یا منفی) */
  calcNewPrice(old: number, mode: 'percent' | 'amount', value: number, roundTo = 1000): number {
    if (mode === 'percent') {
      const v = old * (1 + value / 100);
      return Math.max(0, roundTo > 1 ? Math.round(v / roundTo) * roundTo : Math.round(v));
    }
    return Math.max(0, old + value);
  },

  previewTagPriceChange(opts: {
    tagId: string;
    includeSubtree: boolean;
    mode: 'percent' | 'amount';
    value: number;
    target: 'sell' | 'buy' | 'both';
    roundTo?: number;
  }) {
    const scope = new Set(this.tagScopeIds(opts.tagId, opts.includeSubtree));
    return this.getProducts()
      .filter((p) =>
        !p.deleted &&
        (p.tagIds || []).some((t) => scope.has(t)) &&
        // قیمت خریدِ ثبت‌نشده قابل افزایش نیست؛ در حالت «قیمت خرید» این کالا را وارد پیش‌نمایش نکن.
        (opts.target !== 'buy' || (typeof p.buyPrice === 'number' && Number.isFinite(p.buyPrice) && p.buyPrice > 0))
      )
      .map((p) => {
        const newSell =
          opts.target === 'sell' || opts.target === 'both'
            ? this.calcNewPrice(p.price, opts.mode, opts.value, opts.roundTo)
            : p.price;
        const newBuy =
          (opts.target === 'buy' || opts.target === 'both') && typeof p.buyPrice === 'number' && p.buyPrice > 0
            ? this.calcNewPrice(p.buyPrice, opts.mode, opts.value, opts.roundTo)
            : p.buyPrice;
        return { product: p, oldSell: p.price, newSell, oldBuy: p.buyPrice, newBuy };
      });
  },

  applyTagPriceChange(
    opts: { tagId: string; includeSubtree: boolean; mode: 'percent' | 'amount'; value: number; target: 'sell' | 'buy' | 'both'; roundTo?: number },
    user: User
  ): number {
    const preview = this.previewTagPriceChange(opts);
    if (!preview.length) return 0;
    const map = new Map<string, (typeof preview)[number]>();
    preview.forEach((r) => map.set(r.product.id, r));
    const products = this.getProducts();
    const nowIso = new Date().toISOString();
    products.forEach((p, i) => {
      const r = map.get(p.id);
      if (!r) return;
      products[i] = {
        ...p,
        price: r.newSell,
        sellPrice: r.newSell,
        buyPrice: r.newBuy ?? p.buyPrice,
        updatedAt: nowIso,
        updatedBy: user.id,
        updatedByName: user.name,
        version: (p.version || 1) + 1,
      };
      const oldValue = opts.target === 'buy'
        ? formatToman(r.oldBuy ?? 0)
        : opts.target === 'both'
          ? `فروش: ${formatToman(r.oldSell)}؛ خرید: ${r.oldBuy != null ? formatToman(r.oldBuy) : 'ثبت نشده'}`
          : formatToman(r.oldSell);
      const newValue = opts.target === 'buy'
        ? formatToman(r.newBuy ?? r.oldBuy ?? 0)
        : opts.target === 'both'
          ? `فروش: ${formatToman(r.newSell)}؛ خرید: ${r.newBuy != null ? formatToman(r.newBuy) : 'ثبت نشده'}`
          : formatToman(r.newSell);
      this.addAuditLog({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productId: p.id,
        productName: p.name,
        changeType: 'price_update',
        oldValue,
        newValue: `${newValue} (تغییر گروهی ${opts.target === 'buy' ? 'قیمت خرید' : opts.target === 'both' ? 'قیمت فروش و خرید' : 'قیمت فروش'}: ${opts.mode === 'percent' ? `${opts.value}٪` : formatToman(opts.value)})`,
        changedBy: user.id,
        changedByName: user.name,
        changedAt: nowIso,
        synced: !this.isSimulatedOffline(),
      });
    });
    this.saveProducts(products);
    this.addToPendingSync({ type: 'tag_price_change', id: opts.tagId, timestamp: nowIso });
    return preview.length;
  },

  /** افزودن (add=true) یا حذف (add=false) یک تگ از چند کالا */
  setTagOnProducts(tagId: string, productIds: string[], add: boolean, user: User): number {
    const set = new Set(productIds);
    const products = this.getProducts();
    const nowIso = new Date().toISOString();
    let n = 0;
    products.forEach((p, i) => {
      if (!set.has(p.id)) return;
      const has = (p.tagIds || []).includes(tagId);
      if (add === has) return;
      products[i] = {
        ...p,
        tagIds: add ? [...(p.tagIds || []), tagId] : (p.tagIds || []).filter((x) => x !== tagId),
        updatedAt: nowIso,
        updatedBy: user.id,
        updatedByName: user.name,
        version: (p.version || 1) + 1,
      };
      n++;
    });
    if (n) this.saveProducts(products);
    return n;
  },

  /** ثبت کد تامین‌کننده برای یک کالا (برای تطبیق دقیق در دفعات بعد) */
  setSupplierCode(productId: string, code: string): void {
    const products = this.getProducts();
    const idx = products.findIndex((p) => p.id === productId);
    if (idx === -1) return;
    products[idx] = { ...products[idx], supplierCode: code };
    this.saveProducts(products);
  },

  /** جهت تأثیر نوع فاکتور روی موجودی: +1 افزایش، -1 کاهش، 0 بدون تغییر */
  stockSignOf(type: InvoiceType): number {
    if (type === 'purchase' || type === 'sales_return') return 1;
    if (type === 'sales' || type === 'retail' || type === 'purchase_return') return -1;
    return 0;
  },

  /**
   * توزیع تغییر موجودی یک قلم روی مکان‌ها.
   * اگر قلم تقسیم شده باشد، هر سهم روی مکان خودش اعمال می‌شود.
   * reverse=true برای برگرداندن اثر قلم (مثلاً هنگام حذف فاکتور).
   */
  applyItemToLocations(
    dist: Record<string, number>,
    item: InvoiceItem,
    defaultLoc: string,
    totalDelta: number,
    type: InvoiceType,
    reverse = false
  ): Record<string, number> {
    if (!item.locationSplits || item.locationSplits.length === 0) {
      return this.applyLocationDelta(dist, item.locationId || defaultLoc, totalDelta);
    }
    const sign = this.stockSignOf(type) * (reverse ? -1 : 1);
    let out = dist;
    item.locationSplits.forEach((sp) => {
      out = this.applyLocationDelta(out, sp.locationId, sign * sp.quantity);
    });
    return out;
  },

  /** اثر بچ روی موجودی بچ: فروش و برگشت خرید کم می‌کنند، برگشت فروش زیاد می‌کند، خرید فقط وصل می‌کند */
  batchEffectSign(type: InvoiceType): number {
    if (type === 'sales' || type === 'retail' || type === 'purchase_return') return -1;
    if (type === 'sales_return') return 1;
    return 0;
  },

  /** اعمال (یا برگرداندن با qty منفی) اثر یک قلم فاکتور روی بچ */
  applyBatchEffect(batchId: string, type: InvoiceType, qty: number): void {
    const sign = this.batchEffectSign(type);
    if (sign === 0) return;
    const batches = this.getStockBatches();
    const b = batches.find((x) => x.id === batchId);
    if (!b) return;
    b.remainingQuantity = Math.min(Math.max(0, b.remainingQuantity + sign * qty), b.quantity);
    this.saveStockBatches(batches);
    this.addToPendingSync({ type: 'batch_effect', id: batchId, timestamp: new Date().toISOString() });
  },

  /**
   * تخصیص (یا تغییر) بچ یک قلم فاکتور، بعد از ثبت فاکتور.
   * اثر بچ قبلی برگردانده می‌شود و اثر بچ جدید اعمال می‌شود.
   */
  assignInvoiceItemBatch(
    invoiceId: string,
    itemId: string,
    newBatchId: string | null
  ): { ok: boolean; reason?: string } {
    const invoices = this.getInvoices();
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { ok: false, reason: 'فاکتور پیدا نشد.' };
    const item = inv.items.find((i) => i.id === itemId);
    if (!item) return { ok: false, reason: 'قلم پیدا نشد.' };
    if (item.locationSplits && item.locationSplits.length) {
      return { ok: false, reason: 'این قلم بین چند مکان تقسیم شده؛ بچ هر سهم را هنگام ثبت فاکتور انتخاب کنید.' };
    }

    const batches = this.getStockBatches();
    const sign = this.batchEffectSign(inv.type);
    const clamp = (v: number, max: number) => Math.min(Math.max(0, v), max);

    const newBatch = newBatchId ? batches.find((b) => b.id === newBatchId) : undefined;
    if (newBatchId && !newBatch) return { ok: false, reason: 'بچ پیدا نشد.' };
    if (newBatch && newBatch.productId !== item.productId) {
      return { ok: false, reason: 'این بچ مربوط به این کالا نیست.' };
    }

    // ۱) برگرداندن اثر بچ قبلی
    const oldBatch = item.batchId ? batches.find((b) => b.id === item.batchId) : undefined;
    if (oldBatch && sign !== 0) {
      oldBatch.remainingQuantity = clamp(oldBatch.remainingQuantity - sign * item.quantity, oldBatch.quantity);
    }

    // ۲) کنترل مانده برای بچ جدید
    if (newBatch && sign === -1 && newBatch.remainingQuantity < item.quantity) {
      return { ok: false, reason: `مانده‌ی بچ کافی نیست (${newBatch.remainingQuantity} عدد).` };
    }

    // ۳) اعمال اثر بچ جدید
    if (newBatch && sign !== 0) {
      newBatch.remainingQuantity = clamp(newBatch.remainingQuantity + sign * item.quantity, newBatch.quantity);
    }

    item.batchId = newBatchId;
    this.saveStockBatches(batches);
    this.saveInvoices(invoices);
    this.addToPendingSync({ type: 'batch_assign', id: invoiceId, timestamp: new Date().toISOString() });
    return { ok: true };
  },

  /**
   * ساخت بچ جدید برای یک قلم فاکتور خرید (با تاریخ انقضا) و وصل کردن آن.
   * موجودی قبلاً وارد شده، پس بچ همان تعداد را به‌عنوان مانده ثبت می‌کند.
   */
  createBatchForInvoiceItem(
    invoiceId: string,
    itemId: string,
    info: { expiryDate: string; batchNumber?: string; supplierName?: string },
    currentUser: User
  ): { ok: boolean; reason?: string } {
    const inv = this.getInvoices().find((i) => i.id === invoiceId);
    if (!inv) return { ok: false, reason: 'فاکتور پیدا نشد.' };
    if (inv.type !== 'purchase') return { ok: false, reason: 'ساخت بچ جدید فقط برای قلم فاکتور خرید است.' };
    const item = inv.items.find((i) => i.id === itemId);
    if (!item) return { ok: false, reason: 'قلم پیدا نشد.' };
    if (!info.expiryDate) return { ok: false, reason: 'تاریخ انقضا را وارد کنید.' };

    const batch = this.addStockBatch(
      {
        productId: item.productId,
        productName: item.productName,
        batchNumber: info.batchNumber?.trim() || null,
        quantity: item.quantity,
        remainingQuantity: item.quantity,
        productionDate: null,
        expiryDate: new Date(info.expiryDate).toISOString(),
        supplierName: info.supplierName?.trim() || inv.supplierName || null,
        receivedBy: currentUser.id,
        receivedByName: currentUser.name,
        buyPrice: item.unitPrice,
        notes: `از فاکتور ${inv.invoiceNumber}`,
        locationId: item.locationId || inv.locationId || DEFAULT_LOCATION_ID,
      },
      currentUser
    );
    return this.assignInvoiceItemBatch(invoiceId, itemId, batch.id);
  },

  /** کم کردن از یک بچ مشخص که فروشنده انتخاب کرده */
  deductSpecificBatch(batchId: string, quantity: number): void {
    const batches = this.getStockBatches();
    const b = batches.find((x) => x.id === batchId);
    if (!b) return;
    b.remainingQuantity = Math.max(0, b.remainingQuantity - quantity);
    this.saveStockBatches(batches);
    this.addToPendingSync({ type: 'batch_deduct', id: batchId, timestamp: new Date().toISOString() });
  },

  // [غیرفعال] فیفوی خودکار: فروشنده بچ را انتخاب می‌کند؛ این تابع دیگر استفاده نمی‌شود.
  //   deductStockBatchFIFO(productId: string, quantity: number, locationId?: string | null): void {
  //     const batches = this.getStockBatches();
  //     let qtyToDeduct = quantity;
  //
  //     const productBatches = batches
  //       .filter((b) => b.productId === productId && b.remainingQuantity > 0)
  //       .sort(
  //         (a, b) =>
  //           (Number((b.locationId || null) === (locationId || null)) - Number((a.locationId || null) === (locationId || null))) ||
  //           new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  //       );
  //
  //     for (const batch of productBatches) {
  //       if (qtyToDeduct <= 0) break;
  //       const deductFromThis = Math.min(batch.remainingQuantity, qtyToDeduct);
  //       batch.remainingQuantity -= deductFromThis;
  //       qtyToDeduct -= deductFromThis;
  //     }
  //
  //     this.saveStockBatches(batches);
  //     this.addToPendingSync({ type: 'batch_deduct', id: productId, timestamp: new Date().toISOString() });
  //   },

  getNameUniquenessSettings(): NameUniquenessSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NAME_UNIQUENESS_SETTINGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.NAME_UNIQUENESS_SETTINGS, JSON.stringify(DEFAULT_UNIQUENESS_SETTINGS));
        return DEFAULT_UNIQUENESS_SETTINGS;
      }
      return { ...DEFAULT_UNIQUENESS_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_UNIQUENESS_SETTINGS;
    }
  },

  saveNameUniquenessSettings(settings: NameUniquenessSettings, currentUser?: User): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NAME_UNIQUENESS_SETTINGS, JSON.stringify(settings));
      const user = currentUser || this.getCurrentUser();
      this.addAuditLog({
        id: `log_${Date.now()}`,
        productId: 'settings',
        productName: 'تنظیمات نام و کد کالا',
        changeType: 'expiry_settings_update',
        oldValue: 'تنظیمات قبلی',
        newValue: `یکتایی: ${settings.globalNameUniqueness} · حساسیت حروف: ${settings.globalNameCaseSensitivity}`,
        changedBy: user.id,
        changedByName: user.name,
        changedAt: new Date().toISOString(),
        synced: true,
      });
      broadcast({ type: 'DATA_UPDATED', sourceUserId: user.id });
    } catch {
      // Ignore
    }
  },

  async checkAndUpdateAbzarrezaPrice(
    productId: string,
    currentUser?: User,
    force: boolean = false
  ): Promise<{
    success: boolean;
    changed: boolean;
    oldBuyPrice?: number;
    newBuyPrice?: number;
    oldSellPrice?: number;
    newSellPrice?: number;
    notFound?: boolean;
    message: string;
  }> {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === productId);
    if (index === -1) {
      return { success: false, changed: false, message: 'کالا یافت نشد' };
    }

    const prod = products[index];
    const settings = this.getAutoPricingSettings();
    const user = currentUser || this.getCurrentUser();
    const now = Date.now();

    // Check throttle (minimum interval between checks) unless forced
    if (!force && prod.lastPriceCheckAttempt) {
      const elapsedSec = (now - new Date(prod.lastPriceCheckAttempt).getTime()) / 1000;
      if (elapsedSec < (settings.minIntervalBetweenChecksSeconds || 30)) {
        return {
          success: true,
          changed: false,
          oldBuyPrice: prod.buyPrice,
          oldSellPrice: prod.price,
          message: 'بررسی قیمت در ۳۰ ثانیه گذشته انجام شده است',
        };
      }
    }

    // Update last check attempt
    prod.lastPriceCheckAttempt = new Date().toISOString();

    // Perform lookup
    const searchCode = prod.abzarrezaSearchCode || prod.code;
    const searchName = prod.abzarrezaSearchName || prod.name;
    const useCode = prod.useCodeForSearch !== undefined ? prod.useCodeForSearch : true;

    let result = null;
    try {
      result = await AbzarrezaService.searchProduct({
        code: searchCode,
        name: searchName,
        useCodeForSearch: useCode,
        searchMethod: settings.searchMethod,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errLog: AuditLog = {
        id: `log_abzarreza_err_${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        changeType: 'abzarreza_price_update',
        oldValue: 'خطا در وب‌سرویس',
        newValue: errMsg,
        changedBy: user.id,
        changedByName: user.name,
        changedAt: new Date().toISOString(),
        synced: !this.isSimulatedOffline(),
      };
      this.addAuditLog(errLog);
      return { success: false, changed: false, message: `خطا در دریافت قیمت ${prod.name}: ${errMsg}` };
    }

    // Handle failure / not found (Part 9, 10, 11)
    if (!result || (!result.retailPrice && !result.wholesalePrice)) {
      const auditLog: AuditLog = {
        id: `log_abzarreza_nf_${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        changeType: 'abzarreza_price_update',
        oldValue: `جستجو: ${useCode ? searchCode : searchName}`,
        newValue: 'یافت نشد',
        changedBy: user.id,
        changedByName: user.name,
        changedAt: new Date().toISOString(),
        synced: !this.isSimulatedOffline(),
      };
      this.addAuditLog(auditLog);

      const notif: AppNotification = {
        id: `notif_abzarreza_nf_${Date.now()}`,
        title: 'عدم تطابق با ابزار رضا',
        body: `⚠️ ${prod.name} در ابزار رضا پیدا نشد. لطفاً نام جستجو را بررسی کنید.`,
        type: 'system',
        read: false,
        createdAt: new Date().toISOString(),
        authorId: user.id,
      };
      this.addNotification(notif);

      this.saveProducts(products);

      return {
        success: false,
        changed: false,
        notFound: true,
        message: '⚠️ پیدا نشد. لطفاً نام دقیق را وارد کنید',
      };
    }

    // Determine target prices (Part 7, 8)
    const oldBuyPrice = prod.buyPrice || 0;
    const oldSellPrice = prod.price || 0;

    const priceSource = prod.buyPriceSource || settings.defaultPriceSource || 'wholesale';
    let rawSupplierPrice = priceSource === 'retail'
      ? (result.retailPrice || result.wholesalePrice || oldBuyPrice)
      : (result.wholesalePrice || result.retailPrice || oldBuyPrice);

    let newBuyPrice = prod.buyPriceLocked ? oldBuyPrice : rawSupplierPrice;

    // Calculate new sell price
    const profitType = prod.profitType || settings.defaultProfitType || 'percent';
    const profitValue = prod.profitValue !== undefined ? prod.profitValue : (settings.defaultProfitValue || 25);
    const isRounded = prod.sellPriceRounded !== undefined ? prod.sellPriceRounded : true;

    let newSellPrice = prod.sellPriceLocked
      ? oldSellPrice
      : AbzarrezaService.calculateSellPrice(
          newBuyPrice,
          profitType,
          profitValue,
          settings.roundToNearest || 1000,
          isRounded
        );

    // Check if buy price or sell price changed
    const buyPriceChanged = newBuyPrice !== oldBuyPrice;
    const sellPriceChanged = newSellPrice !== oldSellPrice;
    const isChanged = buyPriceChanged || sellPriceChanged;

    const percentDiff = oldBuyPrice > 0
      ? (Math.abs(newBuyPrice - oldBuyPrice) / oldBuyPrice) * 100
      : 100;

    // Update product fields
    prod.supplierRetailPrice = result.retailPrice;
    prod.supplierWholesalePrice = result.wholesalePrice;
    prod.supplierProductUrl = result.url;
    prod.supplierPricesUpdatedAt = new Date().toISOString();
    prod.buyPrice = newBuyPrice;
    prod.price = newSellPrice;
    prod.sellPrice = newSellPrice;
    prod.updatedAt = new Date().toISOString();
    prod.updatedBy = user.id;
    prod.updatedByName = user.name;
    prod.version = (prod.version || 1) + 1;

    if (isChanged && percentDiff >= (settings.alertThresholdPercent || 2)) {
      // 1. Audit log (Part 10)
      const auditLog: AuditLog = {
        id: `log_abzarreza_upd_${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        changeType: 'abzarreza_price_update',
        oldValue: `خرید: ${formatToman(oldBuyPrice)} · فروش: ${formatToman(oldSellPrice)}`,
        newValue: `خرید: ${formatToman(newBuyPrice)} · فروش: ${formatToman(newSellPrice)}`,
        diffAmount: newSellPrice - oldSellPrice,
        changedBy: user.id,
        changedByName: user.name,
        changedAt: prod.updatedAt,
        synced: !this.isSimulatedOffline(),
      };
      this.addAuditLog(auditLog);

      // Price update history log
      const priceHistoryLog: AuditLog = {
        id: `log_price_${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        changeType: 'price_update',
        oldValue: `${formatToman(oldSellPrice)} تومان`,
        newValue: `${formatToman(newSellPrice)} تومان`,
        diffAmount: newSellPrice - oldSellPrice,
        changedBy: user.id,
        changedByName: user.name,
        changedAt: prod.updatedAt,
        synced: !this.isSimulatedOffline(),
      };
      this.addAuditLog(priceHistoryLog);

      // 2. Notification (Part 11)
      if (settings.notifyOnPriceChange) {
        const notif: AppNotification = {
          id: `notif_abzarreza_chg_${Date.now()}`,
          title: `🔔 بروزرسانی قیمت از ابزار رضا`,
          body: `🔔 قیمت «${prod.name}» در ابزار رضا تغییر کرد: ${formatToman(oldBuyPrice)} → ${formatToman(newBuyPrice)}. قیمت فروش: ${formatToman(newSellPrice)} تومان`,
          type: 'price_change',
          read: false,
          createdAt: prod.updatedAt,
          authorId: user.id,
        };
        this.addNotification(notif);
      }
    }

    this.saveProducts(products);

    broadcast({
      type: 'DATA_UPDATED',
      sourceUserId: user.id,
      product: prod,
    });

    return {
      success: true,
      changed: isChanged,
      oldBuyPrice,
      newBuyPrice,
      oldSellPrice,
      newSellPrice,
      message: isChanged
        ? `قیمت بروزرسانی شد: خرید ${formatToman(newBuyPrice)} تومان`
        : 'قیمت در ابزار رضا تغییری نداشته است',
    };
  },

  async runBatchAbzarrezaUpdate(currentUser?: User): Promise<{
    total: number;
    updated: number;
    unchanged: number;
    failed: number;
  }> {
    const products = this.getProducts().filter(
      (p) => !p.deleted && p.priceSourceType === 'abzarreza'
    );

    let updated = 0;
    let unchanged = 0;
    let failed = 0;

    for (const prod of products) {
      try {
        const res = await this.checkAndUpdateAbzarrezaPrice(prod.id, currentUser, true);
        if (res.success) {
          if (res.changed) updated++;
          else unchanged++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return {
      total: products.length,
      updated,
      unchanged,
      failed,
    };
  },

  checkAndTriggerStockAlert(product: Product, previousStock?: number): void {
    if (product.alertEnabled === false) return;

    const status: StockStatusLevel = getProductStockStatus(product);
    const settings = this.getStockAlertSettings();

    // Check if recovery back to normal
    if (status === 'normal') {
      if (product.lastAlertStatus && product.lastAlertStatus !== 'normal' && settings.receiveRecoveryAlert) {
        const notif: AppNotification = {
          id: `notif_stock_rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          title: `شارژ مجدد و رفع کسری موجودی`,
          body: `موجودی ابزار «${product.name}» به ${toPersianDigits(product.stock)} ${product.unit} افزایش یافت و به وضعیت عادی بازگشت.`,
          type: 'inventory_alert',
          read: false,
          createdAt: new Date().toISOString(),
        };
        this.addNotification(notif);
        product.lastAlertStatus = 'normal';
        product.lastAlertStockLevel = product.stock;
        product.lastAlertSent = new Date().toISOString();
      }
      return;
    }

    // Check notification preference by status level
    if (status === 'low' && !settings.receiveLowStockAlert) return;
    if (status === 'critical' && !settings.receiveCriticalAlert) return;
    if (status === 'out_of_stock' && !settings.receiveOutOfStockAlert) return;

    // Anti-spam rules:
    // 1. If status is same and stock level unchanged, skip
    if (product.lastAlertStatus === status && product.lastAlertStockLevel === product.stock) {
      return;
    }

    // 2. Cooldown check: if already alerted recently with same stock level
    const now = Date.now();
    if (product.lastAlertSent && product.lastAlertStockLevel === product.stock) {
      const elapsedMs = now - new Date(product.lastAlertSent).getTime();
      if (elapsedMs < 10 * 60 * 1000) {
        return;
      }
    }

    // Determine title & body
    let title = '';
    let body = '';
    const minStock = product.minStock !== undefined ? product.minStock : 5;
    const criticalStock = product.criticalStock !== undefined ? product.criticalStock : 0;

    if (status === 'out_of_stock') {
      title = `❌ اتمام موجودی: ${product.name}`;
      body = `موجودی کالای «${product.name}» (کد ${product.code}) به صفر رسید و ناموجود شد! نیاز به شارژ انبار.`;
    } else if (status === 'critical') {
      title = `🔴 هشدار موجودی بحرانی: ${product.name}`;
      body = `موجودی «${product.name}» فقط ${toPersianDigits(product.stock)} ${product.unit} است (آستانه بحرانی: ${toPersianDigits(criticalStock)}). نیاز فوری به سفارش خرید!`;
    } else if (status === 'low') {
      title = `⚠️ هشدار کسری موجودی: ${product.name}`;
      body = `موجودی «${product.name}» به ${toPersianDigits(product.stock)} ${product.unit} کاهش یافت (حداقل مجاز: ${toPersianDigits(minStock)}).`;
    }

    const notif: AppNotification = {
      id: `notif_stock_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title,
      body,
      type: 'inventory_alert',
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.addNotification(notif);

    product.lastAlertStatus = status;
    product.lastAlertStockLevel = product.stock;
    product.lastAlertSent = new Date().toISOString();

    if (status === 'critical' || status === 'out_of_stock') {
      soundManager.playAlertSound();
    } else {
      soundManager.playNotificationChime();
    }
  },

  logInvoicePrinted(invoice: Invoice, templateTitle: string, currentUser: User): void {
    this.recordInvoiceAction(
      invoice,
      'print',
      `چاپ شده (قالب ${templateTitle})`,
      currentUser
    );
  },

  logInvoiceExported(invoice: Invoice, format: string, currentUser: User): void {
    this.recordInvoiceAction(
      invoice,
      'export',
      `خروجی ${format} دریافت شد`,
      currentUser
    );
  },

  logInvoiceShared(invoice: Invoice, channel: string, currentUser: User): void {
    this.recordInvoiceAction(
      invoice,
      'share',
      `اشتراک‌گذاری از طریق ${channel}`,
      currentUser
    );
  },

  saveInvoices(invoices: Invoice[]): void {

    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    } catch {
      // Ignore
    }
  },

  getNextInvoiceNumber(type: InvoiceType): string {
    const invoices = this.getInvoices();
    const settings = this.getInvoiceSettings();
    const prefixMap: Record<InvoiceType, string> = {
      sales: settings.prefixes?.sales || 'ف',
      purchase: settings.prefixes?.purchase || 'خ',
      retail: settings.prefixes?.retail || 'خرده',
      purchase_return: settings.prefixes?.purchase_return || 'ب-خ',
      sales_return: settings.prefixes?.sales_return || 'ب-ف',
    };
    const prefix = prefixMap[type] || 'ف';
    const year = '۱۴۰۳';
    const sameTypeCount = invoices.filter((i) => i.type === type).length + 1;
    const serial = toPersianDigits(sameTypeCount.toString().padStart(4, '0'));
    return `${prefix}-${year}-${serial}`;
  },

  createInvoice(
    invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'createdBy' | 'createdByName'>,
    currentUser: User
  ): Invoice {
    const invoices = this.getInvoices();
    const invoiceNumber = this.getNextInvoiceNumber(invoiceData.type);
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      invoiceNumber,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    // خرید: هر بخشی که تاریخ انقضا دارد، بچ جدا می‌گیرد (حتی اگر قلم تقسیم شده باشد)
    if (newInvoice.type === 'purchase') {
      const defaultLoc = newInvoice.locationId || DEFAULT_LOCATION_ID;
      newInvoice.items.forEach((it) => {
        if (it.locationSplits && it.locationSplits.length) {
          it.locationSplits = it.locationSplits.map((sp) => {
            if (!sp.expiryDate || sp.batchId) return sp;
            const b = this.addStockBatch(
              {
                productId: it.productId,
                productName: it.productName,
                batchNumber: sp.batchNumber || null,
                quantity: sp.quantity,
                remainingQuantity: sp.quantity,
                productionDate: null,
                expiryDate: sp.expiryDate,
                supplierName: newInvoice.supplierName || null,
                receivedBy: currentUser.id,
                receivedByName: currentUser.name,
                buyPrice: it.unitPrice,
                notes: `از فاکتور ${invoiceNumber}`,
                locationId: sp.locationId || defaultLoc,
                sourceInvoiceId: newInvoice.id,
              },
              currentUser
            );
            return { ...sp, batchId: b.id };
          });
        } else if (it.expiryDate && !it.batchId) {
          const b = this.addStockBatch(
            {
              productId: it.productId,
              productName: it.productName,
              batchNumber: it.batchNumber || null,
              quantity: it.quantity,
              remainingQuantity: it.quantity,
              productionDate: null,
              expiryDate: it.expiryDate,
              supplierName: newInvoice.supplierName || null,
              receivedBy: currentUser.id,
              receivedByName: currentUser.name,
              buyPrice: it.unitPrice,
              notes: `از فاکتور ${invoiceNumber}`,
              locationId: it.locationId || defaultLoc,
              sourceInvoiceId: newInvoice.id,
            },
            currentUser
          );
          it.batchId = b.id;
        }
      });
    }

    invoices.unshift(newInvoice);
    this.saveInvoices(invoices);

    // اثر بچ‌هایی که فروشنده انتخاب کرده (برای هر نوع فاکتور)
    newInvoice.items.forEach((item) => {
      const applies = item.deductFromStock !== false;
      if (applies) {
        if (item.locationSplits && item.locationSplits.length) {
          item.locationSplits.forEach((sp) => {
            if (sp.batchId) this.applyBatchEffect(sp.batchId, newInvoice.type, sp.quantity);
          });
        } else if (item.batchId) {
          this.applyBatchEffect(item.batchId, newInvoice.type, item.quantity);
        }
      }
    });

    // 1. Update product stocks (respecting deductFromStock per product/item)
    const invLocId = newInvoice.locationId || DEFAULT_LOCATION_ID;
    const products = this.getProducts();
    let productsUpdated = false;

    newInvoice.items.forEach((item) => {
      const itemLocId = item.locationId || invLocId;
      const prodIndex = products.findIndex((p) => p.id === item.productId);
      if (prodIndex !== -1) {
        const prod = products[prodIndex];
        // Check if deduction is enabled (default true unless explicitly false)
        const shouldDeduct = item.deductFromStock !== undefined ? item.deductFromStock : ((newInvoice.type === 'purchase' || newInvoice.type === 'purchase_return') ? true : prod.deductFromStock !== false);

        const oldStock = prod.stock;
        let newStock = oldStock;

        const stockDirection = this.stockSignOf(newInvoice.type);
        const availableAtLocation = prod.locationStock?.[itemLocId] ?? oldStock;
        const canMove = stockDirection >= 0 || (oldStock >= item.quantity && availableAtLocation >= item.quantity);
        if (shouldDeduct && canMove) {
          newStock = oldStock + stockDirection * item.quantity;
          if (newStock < 0) newStock = oldStock; // final guard: never allow negative inventory
          if (newStock !== oldStock) item.stockAdjustmentStatus = 'applied';
        } else if (stockDirection < 0 && shouldDeduct && !canMove) {
          // Inventory was insufficient at operation time; keep this line pending for a later retry.
          item.stockAdjustmentStatus = 'pending';
          item.deductFromStock = false;
        }

        if (newStock !== oldStock) {
          products[prodIndex] = this.autoSellFromBuy(
            {
              ...prod,
              ...(newInvoice.type === 'purchase' && item.unitPrice > 0 ? { buyPrice: item.unitPrice } : {}),
              stock: newStock,
              locationStock: this.applyItemToLocations(prod.locationStock || {}, item, invLocId, newStock - oldStock, newInvoice.type),
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.id,
              updatedByName: currentUser.name,
              version: (prod.version || 1) + 1,
            },
            prod.buyPrice,
            prod.price,
            !!item.applyProfit
          );
          productsUpdated = true;

          // Record stock movement & history (Part 3)
          const movType: StockMovementType =
            newInvoice.type === 'purchase'
              ? 'purchase'
              : newInvoice.type === 'retail'
              ? 'retail_sale'
              : newInvoice.type === 'sales_return'
              ? 'return_from_customer'
              : newInvoice.type === 'purchase_return'
              ? 'return_to_supplier'
              : 'sale';

          this.recordStockMovement({
            productId: prod.id,
            productName: prod.name,
            movementType: movType,
            quantityChange: newStock - oldStock,
            quantityBefore: oldStock,
            quantityAfter: newStock,
            unitPrice: item.unitPrice,
            totalValue: item.totalPrice,
            referenceType: 'invoice',
            referenceId: newInvoice.id,
            locationId: itemLocId,
            locationName: this.getLocationPath(itemLocId),
            referenceNumber: invoiceNumber,
            reason: `${newInvoice.customerName || newInvoice.supplierName || 'فاکتور'} (${invoiceNumber})`,
            performedBy: currentUser.id,
            performedByName: currentUser.name,
            notes: item.notes || undefined,
          });
        }
      }
    });

    if (productsUpdated) {
      this.saveProducts(products);
      newInvoice.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) this.checkAndTriggerStockAlert(prod);
      });
    }
    // Persist per-line stock processing state so a successful adjustment cannot be repeated.
    const invoiceAfterStock = this.getInvoices();
    const stockInvoiceIndex = invoiceAfterStock.findIndex((i) => i.id === newInvoice.id);
    if (stockInvoiceIndex >= 0) {
      invoiceAfterStock[stockInvoiceIndex] = newInvoice;
      this.saveInvoices(invoiceAfterStock);
    }

    // 2. Update customer debt & ledger if applicable
    if (newInvoice.customerId) {
      const customer = this.getCustomerById(newInvoice.customerId);
      if (customer) {
        const balanceBefore = customer.totalDebt;
        let balanceAfter = balanceBefore;
        const nowIso = new Date().toISOString();
        const jalali = getJalaliNow(new Date());

        if (newInvoice.type === 'sales' || newInvoice.type === 'retail') {
          // Add sale debit entry to ledger
          const balanceAfterSale = balanceBefore + newInvoice.finalTotal;
          this.addCustomerLedgerEntry({
            customerId: customer.id,
            customerName: customer.name,
            entryType: newInvoice.type === 'retail' ? 'invoice_retail' : 'invoice_sale',
            referenceId: newInvoice.id,
            referenceNumber: invoiceNumber,
            debit: newInvoice.finalTotal,
            credit: 0,
            balanceBefore,
            balanceAfter: balanceAfterSale,
            date: newInvoice.date || jalali.date,
            time: newInvoice.time || jalali.time,
            timestamp: nowIso,
            description: `فاکتور فروش ${invoiceNumber}`,
            performedBy: currentUser.id,
            performedByName: currentUser.name,
          });

          balanceAfter = balanceAfterSale;

          // If paid amount > 0, record payment entry in ledger
          if (newInvoice.paidAmount > 0) {
            const balanceAfterPayment = balanceAfterSale - newInvoice.paidAmount;
            const methodEntryMap: Record<string, LedgerEntryType> = {
              cash: 'payment_cash',
              pos: 'payment_card',
              card_transfer: 'payment_transfer',
              cheque: 'payment_cheque',
              credit: 'payment_credit',
            };
            this.addCustomerLedgerEntry({
              customerId: customer.id,
              customerName: customer.name,
              entryType: methodEntryMap[newInvoice.paymentMethod] || 'payment_cash',
              referenceId: newInvoice.id,
              referenceNumber: invoiceNumber,
              debit: 0,
              credit: newInvoice.paidAmount,
              balanceBefore: balanceAfterSale,
              balanceAfter: balanceAfterPayment,
              date: newInvoice.date || jalali.date,
              time: newInvoice.time || jalali.time,
              timestamp: nowIso,
              description: `پرداخت فاکتور ${invoiceNumber}`,
              performedBy: currentUser.id,
              performedByName: currentUser.name,
            });

            balanceAfter = balanceAfterPayment;
          }

          this.updateCustomer(
            customer.id,
            {
              totalDebt: balanceAfter,
              debt: balanceAfter,
              totalPurchases: (customer.totalPurchases || 0) + newInvoice.finalTotal,
              totalPayments: (customer.totalPayments || 0) + (newInvoice.paidAmount || 0),
              lastPurchaseDate: newInvoice.date || jalali.date,
              lastPaymentDate: newInvoice.paidAmount > 0 ? (newInvoice.date || jalali.date) : customer.lastPaymentDate,
            },
            currentUser
          );
        } else if (newInvoice.type === 'sales_return') {
          balanceAfter = balanceBefore - newInvoice.finalTotal;
          this.addCustomerLedgerEntry({
            customerId: customer.id,
            customerName: customer.name,
            entryType: 'invoice_sale_return',
            referenceId: newInvoice.id,
            referenceNumber: invoiceNumber,
            debit: 0,
            credit: newInvoice.finalTotal,
            balanceBefore,
            balanceAfter,
            date: newInvoice.date || jalali.date,
            time: newInvoice.time || jalali.time,
            timestamp: nowIso,
            description: `فاکتور مرجوعی فروش ${invoiceNumber}`,
            performedBy: currentUser.id,
            performedByName: currentUser.name,
          });

          this.updateCustomer(
            customer.id,
            {
              totalDebt: balanceAfter,
              debt: balanceAfter,
            },
            currentUser
          );
        }

        // Attach running balance snapshot to invoice
        newInvoice.balanceBefore = balanceBefore;
        newInvoice.balanceAfter = balanceAfter;

        // Re-save invoices to persist balanceBefore and balanceAfter
        const invList = this.getInvoices();
        const invIdx = invList.findIndex((i) => i.id === newInvoice.id);
        if (invIdx !== -1) {
          invList[invIdx] = newInvoice;
          this.saveInvoices(invList);
        }
      }
    }

    // 3. Record in InvoiceAuditLog
    const typeTitles: Record<InvoiceType, string> = {
      sales: 'فاکتور فروش',
      purchase: 'فاکتور خرید',
      retail: 'فاکتور خرده‌فروشی',
      purchase_return: 'برگشت از خرید',
      sales_return: 'برگشت از فروش',
    };

    this.recordInvoiceAction(
      newInvoice,
      'create',
      `ایجاد شده توسط ${currentUser.name} · مبلغ: ${formatToman(newInvoice.finalTotal)} · ${toPersianDigits(newInvoice.items.length)} قلم`,
      currentUser
    );

    // 4. Create AppNotification(s) as per PART 10 specifications
    let primaryNotifTitle = `ثبت ${typeTitles[newInvoice.type]}`;
    let primaryNotifBody = `${currentUser.name} فاکتور ${invoiceNumber} را ثبت کرد.`;

    if (newInvoice.type === 'sales' && newInvoice.customerName) {
      primaryNotifTitle = `فاکتور فروش جدید`;
      primaryNotifBody = `فاکتور فروش ${invoiceNumber} برای ${newInvoice.customerName} به مبلغ ${formatToman(newInvoice.finalTotal)} ثبت شد`;
    } else if (newInvoice.type === 'sales_return' || newInvoice.type === 'purchase_return') {
      primaryNotifTitle = `🔄 ثبت فاکتور برگشتی`;
      primaryNotifBody = `برگشتی ${invoiceNumber} به مبلغ ${formatToman(newInvoice.finalTotal)} ثبت شد`;
    }

    const notif: AppNotification = {
      id: `notif_inv_${Date.now()}`,
      title: primaryNotifTitle,
      body: primaryNotifBody,
      type: newInvoice.type === 'purchase' || newInvoice.type === 'purchase_return' ? 'stock_change' : 'price_change',
      read: false,
      createdAt: newInvoice.createdAt,
      authorId: currentUser.id,
    };
    this.addNotification(notif);

    // Additional condition-based notifications
    if (newInvoice.remainingAmount > 0) {
      this.addNotification({
        id: `notif_unpaid_${Date.now()}_1`,
        title: `⚠️ هشدار مانده پرداخت نشده`,
        body: `فاکتور ${invoiceNumber} با مانده ${formatToman(newInvoice.remainingAmount)} ثبت شد`,
        type: 'price_change',
        read: false,
        createdAt: newInvoice.createdAt,
        authorId: currentUser.id,
      });
    }

    if (newInvoice.finalTotal >= 20000000) {
      this.addNotification({
        id: `notif_large_${Date.now()}_2`,
        title: `💰 فاکتور بزرگ`,
        body: `فاکتور بزرگ: ${invoiceNumber} به مبلغ ${formatToman(newInvoice.finalTotal)}`,
        type: 'price_change',
        read: false,
        createdAt: newInvoice.createdAt,
        authorId: currentUser.id,
      });
    }

    if (newInvoice.totalProfit !== undefined && newInvoice.finalTotal > 0) {
      const profitPct = (newInvoice.totalProfit / newInvoice.finalTotal) * 100;
      if (profitPct < 10) {
        this.addNotification({
          id: `notif_lowprof_${Date.now()}_3`,
          title: `⚠️ هشدار سود پایین`,
          body: `فاکتور ${invoiceNumber} سود زیر ۱۰٪ دارد (${toPersianDigits(profitPct.toFixed(1))}٪)`,
          type: 'inventory_alert',
          read: false,
          createdAt: newInvoice.createdAt,
          authorId: currentUser.id,
        });
      }
    }

    // 5. General audit log
    const log: AuditLog = {
      id: `log_inv_${Date.now()}`,
      productId: newInvoice.items[0]?.productId || 'invoice',
      productName: `${typeTitles[newInvoice.type]} (${invoiceNumber})`,
      changeType: 'stock_update',
      oldValue: '---',
      newValue: `مبلغ: ${formatToman(newInvoice.finalTotal)} · ${toPersianDigits(newInvoice.items.length)} قلم`,
      changedBy: currentUser.id,
      changedByName: currentUser.name,
      changedAt: newInvoice.createdAt,
      synced: !this.isSimulatedOffline(),
    };
    this.addAuditLog(log);

    soundManager.playSuccessSound();

    if (products[0]) {
      broadcast({
        type: 'DATA_UPDATED',
        sourceUserId: currentUser.id,
        log,
        notification: notif,
        product: products[0],
      });
    }

    return newInvoice;
  },

  applyPendingInvoiceStock(invoiceId: string, currentUser: User): { applied: number; skipped: number; message: string } {
    const invoices = this.getInvoices();
    const invoiceIndex = invoices.findIndex((i) => i.id === invoiceId && !i.deleted);
    if (invoiceIndex < 0) return { applied: 0, skipped: 0, message: 'فاکتور پیدا نشد.' };
    const invoice = invoices[invoiceIndex];
    const products = this.getProducts();
    let applied = 0;
    let skipped = 0;
    const defaultLoc = invoice.locationId || DEFAULT_LOCATION_ID;
    for (const item of invoice.items) {
      if (item.stockAdjustmentStatus !== 'pending') continue;
      const pIndex = products.findIndex((p) => p.id === item.productId && !p.deleted);
      if (pIndex < 0) { skipped++; continue; }
      const prod = products[pIndex];
      const direction = this.stockSignOf(invoice.type);
      const locationId = item.locationId || defaultLoc;
      const available = prod.locationStock?.[locationId] ?? prod.stock;
      if (direction < 0 && (prod.stock < item.quantity || available < item.quantity)) { skipped++; continue; }
      const oldStock = prod.stock;
      const newStock = oldStock + direction * item.quantity;
      if (newStock < 0) { skipped++; continue; }
      if (direction !== 0) {
        products[pIndex] = {
          ...prod,
          ...(invoice.type === 'purchase' && item.unitPrice > 0 ? { buyPrice: item.unitPrice } : {}),
          stock: newStock,
          locationStock: this.applyItemToLocations(prod.locationStock || {}, item, defaultLoc, newStock - oldStock, invoice.type),
          updatedAt: new Date().toISOString(), updatedBy: currentUser.id, updatedByName: currentUser.name,
          version: (prod.version || 1) + 1,
        };
        const movementType: StockMovementType = invoice.type === 'purchase' ? 'purchase' : invoice.type === 'retail' ? 'retail_sale' : invoice.type === 'sales_return' ? 'return_from_customer' : invoice.type === 'purchase_return' ? 'return_to_supplier' : 'sale';
        this.recordStockMovement({
          productId: prod.id, productName: prod.name, movementType, quantityChange: newStock - oldStock,
          quantityBefore: oldStock, quantityAfter: newStock, unitPrice: item.unitPrice, totalValue: item.totalPrice,
          referenceType: 'invoice', referenceId: invoice.id, locationId, locationName: this.getLocationPath(locationId),
          referenceNumber: invoice.invoiceNumber, reason: `اعمال موجودی معوق فاکتور ${invoice.invoiceNumber}`,
          performedBy: currentUser.id, performedByName: currentUser.name,
        });
        if (item.batchId) this.applyBatchEffect(item.batchId, invoice.type, item.quantity);
        item.deductFromStock = true;
        item.stockAdjustmentStatus = 'applied';
        applied++;
      } else {
        skipped++;
      }
    }
    this.saveProducts(products);
    invoices[invoiceIndex] = invoice;
    this.saveInvoices(invoices);
    this.addToPendingSync({ type: 'invoice_stock_adjustment', id: invoice.id, timestamp: new Date().toISOString() });
    return { applied, skipped, message: applied ? `${applied} قلم اعمال شد${skipped ? `؛ ${skipped} قلم به علت نبود کالا یا موجودی کافی انجام نشد` : ''}.` : 'هیچ قلمی قابل اعمال نبود؛ موجودی کالاها را بررسی کنید.' };
  },

  updateInvoice(invoiceId: string, updatedData: Partial<Invoice>, currentUser: User): Invoice | null {
    const invoices = this.getInvoices();
    const index = invoices.findIndex((i) => i.id === invoiceId);
    if (index === -1) return null;

    const oldInvoice = invoices[index];
    const newInvoice: Invoice = { ...oldInvoice, ...updatedData };

    // Reconcile stock only for invoice lines whose stock movement had already succeeded.
    // Pending/new lines remain pending and are never adjusted merely because the invoice is edited.
    if (updatedData.items) {
      const direction = this.stockSignOf(oldInvoice.type);
      const defaultLocation = oldInvoice.locationId || DEFAULT_LOCATION_ID;
      const stockDelta = new Map<string, number>();
      const locationDelta = new Map<string, Map<string, number>>();
      const collect = (item: InvoiceItem, multiplier: number) => {
        if (item.stockAdjustmentStatus !== 'applied' || item.productId.startsWith('quick_')) return;
        stockDelta.set(item.productId, (stockDelta.get(item.productId) || 0) + direction * item.quantity * multiplier);
        const splits = item.locationSplits && item.locationSplits.length
          ? item.locationSplits.map((sp) => ({ locationId: sp.locationId || defaultLocation, quantity: sp.quantity }))
          : [{ locationId: item.locationId || defaultLocation, quantity: item.quantity }];
        const byLocation = locationDelta.get(item.productId) || new Map<string, number>();
        splits.forEach((sp) => byLocation.set(sp.locationId, (byLocation.get(sp.locationId) || 0) + direction * sp.quantity * multiplier));
        locationDelta.set(item.productId, byLocation);
      };
      oldInvoice.items.forEach((it) => collect(it, -1));
      newInvoice.items.forEach((it) => collect(it, 1));
      const products = this.getProducts();
      const updates: { index: number; stock: number; locationStock: Record<string, number> }[] = [];
      for (const [productId, delta] of stockDelta) {
        if (!delta) continue;
        const pIndex = products.findIndex((p) => p.id === productId && !p.deleted);
        if (pIndex < 0) return null;
        const product = products[pIndex];
        const newStock = product.stock + delta;
        if (newStock < 0) return null;
        let locationStock = { ...(product.locationStock || {}) };
        for (const [locId, locDelta] of locationDelta.get(productId) || []) {
          if (!locDelta) continue;
          locationStock = this.applyLocationDelta(locationStock, locId, locDelta);
        }
        updates.push({ index: pIndex, stock: newStock, locationStock });
      }
      updates.forEach(({ index: pIndex, stock, locationStock }) => {
        const p = products[pIndex];
        products[pIndex] = { ...p, stock, locationStock, updatedAt: new Date().toISOString(), updatedBy: currentUser.id, updatedByName: currentUser.name, version: (p.version || 1) + 1 };
      });
      if (updates.length) this.saveProducts(products);
    }

    // Calculate diffs
    const diffs: InvoiceAuditDiff[] = [];
    if (oldInvoice.finalTotal !== newInvoice.finalTotal) {
      diffs.push({
        field: 'مبلغ نهایی',
        oldVal: formatToman(oldInvoice.finalTotal),
        newVal: formatToman(newInvoice.finalTotal),
      });
    }
    if (oldInvoice.paidAmount !== newInvoice.paidAmount) {
      diffs.push({
        field: 'مبلغ پرداختی',
        oldVal: formatToman(oldInvoice.paidAmount),
        newVal: formatToman(newInvoice.paidAmount),
      });
    }
    if (oldInvoice.customerName !== newInvoice.customerName) {
      diffs.push({
        field: 'طرف حساب',
        oldVal: oldInvoice.customerName || '---',
        newVal: newInvoice.customerName || '---',
      });
    }

    invoices[index] = newInvoice;
    this.saveInvoices(invoices);

    this.recordInvoiceAction(
      newInvoice,
      'edit',
      `ویرایش شده توسط ${currentUser.name}`,
      currentUser,
      diffs.length > 0 ? diffs : undefined
    );

    const notif: AppNotification = {
      id: `notif_edit_${Date.now()}`,
      title: `ویرایش فاکتور`,
      body: `فاکتور ${newInvoice.invoiceNumber} توسط ${currentUser.name} ویرایش شد`,
      type: 'price_change',
      read: false,
      createdAt: new Date().toISOString(),
      authorId: currentUser.id,
    };
    this.addNotification(notif);

    soundManager.playSuccessSound();
    return newInvoice;
  },

  deleteInvoice(invoiceId: string, currentUser: User): boolean {
    const invoices = this.getInvoices();
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return false;

    const settings = this.getInvoiceSettings();
    if (settings.softDelete) {
      target.deleted = true;
      this.saveInvoices(invoices);
    } else {
      const filtered = invoices.filter((i) => i.id !== invoiceId);
      this.saveInvoices(filtered);
    }

    // Revert customer debt
    if (target.customerId) {
      const customers = this.getCustomers();
      const custIndex = customers.findIndex((c) => c.id === target.customerId);
      if (custIndex !== -1) {
        const cust = customers[custIndex];
        if (target.type === 'sales') {
          cust.debt = Math.max(0, (cust.debt || 0) - target.remainingAmount);
        } else if (target.type === 'sales_return') {
          cust.debt = (cust.debt || 0) + target.finalTotal;
        }
        customers[custIndex] = cust;
        this.saveCustomers(customers);
      }
    }

    // حذف بچ‌هایی که از این فاکتور خرید ساخته شده‌اند (فقط اگر هنوز مصرف نشده باشند)
    if (target.type === 'purchase') {
      const allBatches = this.getStockBatches();
      const kept = allBatches.filter((b) => !(b.sourceInvoiceId === target.id && b.remainingQuantity >= b.quantity));
      if (kept.length !== allBatches.length) this.saveStockBatches(kept);
    }

    // برگرداندن اثر بچ‌های انتخاب‌شده در فاکتور
    target.items.forEach((it) => {
      if (it.locationSplits && it.locationSplits.length) {
        it.locationSplits.forEach((sp) => {
          if (sp.batchId) this.applyBatchEffect(sp.batchId, target.type, -sp.quantity);
        });
      } else if (it.batchId) {
        this.applyBatchEffect(it.batchId, target.type, -it.quantity);
      }
    });

    // Revert product stock
    const products = this.getProducts();
    let prodsChanged = false;
    target.items.forEach((item) => {
      const pIdx = products.findIndex((p) => p.id === item.productId);
      if (pIdx !== -1) {
        const prod = products[pIdx];
        const shouldDeduct = item.deductFromStock !== undefined ? item.deductFromStock : ((target.type === 'purchase' || target.type === 'purchase_return') ? true : prod.deductFromStock !== false);

        const oldStock = prod.stock;
        let newStock = oldStock;

        if (target.type === 'sales' || target.type === 'retail') {
          if (shouldDeduct) {
            newStock = oldStock + item.quantity;
          }
        } else if (target.type === 'purchase') {
          newStock = Math.max(0, oldStock - item.quantity);
        } else if (target.type === 'purchase_return') {
          newStock = oldStock + item.quantity;
        } else if (target.type === 'sales_return') {
          if (shouldDeduct) {
            newStock = Math.max(0, oldStock - item.quantity);
          }
        }

        if (newStock !== oldStock) {
          products[pIdx].stock = newStock;
          products[pIdx].locationStock = this.applyItemToLocations(
            products[pIdx].locationStock || {},
            item,
            target.locationId || DEFAULT_LOCATION_ID,
            newStock - oldStock,
            target.type,
            true
          );
          prodsChanged = true;

          this.recordStockChange({
            productId: prod.id,
            changeType: 'manual_adjust',
            quantityChange: newStock - oldStock,
            previousStock: oldStock,
            newStock,
            referenceId: target.id,
            referenceNumber: target.invoiceNumber,
            userId: currentUser.id,
            userName: currentUser.name,
            note: `ابطال/حذف فاکتور ${target.invoiceNumber}`,
          });
        }
      }
    });
    if (prodsChanged) {
      this.saveProducts(products);
      target.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) this.checkAndTriggerStockAlert(prod);
      });
    }

    this.recordInvoiceAction(
      target,
      'delete',
      `حذف شده توسط ${currentUser.name} (بازگشت موجودی انبار و حساب طرف حساب)`,
      currentUser
    );

    this.addNotification({
      id: `notif_del_${Date.now()}`,
      title: `حذف فاکتور`,
      body: `فاکتور ${target.invoiceNumber} توسط ${currentUser.name} حذف شد`,
      type: 'inventory_alert',
      read: false,
      createdAt: new Date().toISOString(),
      authorId: currentUser.id,
    });

    return true;
  },

  recordInvoicePayment(
    invoiceId: string,
    amount: number,
    method: string,
    currentUser: User
  ): Invoice | null {
    const invoices = this.getInvoices();
    const index = invoices.findIndex((i) => i.id === invoiceId);
    if (index === -1) return null;

    const inv = invoices[index];
    const prevPaid = inv.paidAmount || 0;
    const newPaid = prevPaid + amount;
    const newRemaining = Math.max(0, inv.finalTotal - newPaid);

    inv.paidAmount = newPaid;
    inv.remainingAmount = newRemaining;
    if (newRemaining === 0) {
      inv.paymentStatus = 'full';
    } else {
      inv.paymentStatus = 'partial';
    }

    invoices[index] = inv;
    this.saveInvoices(invoices);

    // Update customer debt
    if (inv.customerId) {
      const customers = this.getCustomers();
      const custIndex = customers.findIndex((c) => c.id === inv.customerId);
      if (custIndex !== -1) {
        customers[custIndex].debt = Math.max(0, (customers[custIndex].debt || 0) - amount);
        this.saveCustomers(customers);
      }
    }

    this.recordInvoiceAction(
      inv,
      'payment',
      `پرداخت ثبت شده: ${formatToman(amount)} (${method}) · مانده: ${formatToman(newRemaining)}`,
      currentUser
    );

    return inv;
  },

  // Reset to factory sample data
  resetAllData(): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
    localStorage.setItem(STORAGE_KEYS.SHOP_INFO, JSON.stringify(DEFAULT_SHOP_INFO));
    localStorage.setItem(STORAGE_KEYS.INVOICE_SETTINGS, JSON.stringify(DEFAULT_INVOICE_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.INVOICE_AUDIT_LOGS, JSON.stringify(INITIAL_INVOICE_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.removeItem(STORAGE_KEYS.STOCK_HISTORY);
    localStorage.setItem(STORAGE_KEYS.STOCK_ALERT_SETTINGS, JSON.stringify(DEFAULT_STOCK_ALERT_SETTINGS));
    localStorage.removeItem(STORAGE_KEYS.PENDING_SYNC);
    localStorage.removeItem(STORAGE_KEYS.SIMULATED_OFFLINE);
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  },
};


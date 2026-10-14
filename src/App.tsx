import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, ProductUnit, User, AuditLog, AppNotification, SyncStatus, Invoice, InvoiceType, Customer, Category } from './types';
import { StorageService, subscribeToSync } from './services/storageService';
import { soundManager } from './utils/audio';
import { toPersianDigits, formatToman } from './utils/jalali';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { ProductCard } from './components/ProductCard';
import { QuickPriceModal } from './components/QuickPriceModal';
import { QuickStockModal } from './components/QuickStockModal';
import { ProductFormModal } from './components/ProductFormModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CategoryManagementView } from './components/CategoryManagementView';
import { InvoicesView } from './components/InvoicesView';
import { InvoiceFormModal } from './components/InvoiceFormModal';
import { InvoiceEditModal } from './components/InvoiceEditModal';
import { QuickInvoiceModal } from './components/QuickInvoiceModal';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { InvoiceShareModal } from './components/InvoiceShareModal';
import { InvoiceAuditModal } from './components/InvoiceAuditModal';
import { BulkExportModal } from './components/BulkExportModal';
import { AuditLogView } from './components/AuditLogView';
import { AnalyticsView } from './components/AnalyticsView';
import { ProductAnalyticsModal } from './components/ProductAnalyticsModal';

import { CustomersView } from './components/CustomersView';
import { DebtReportView } from './components/DebtReportView';
import { NotificationsView } from './components/NotificationsView';
import { SettingsView } from './components/SettingsView';
import { ExpiryAlertsView } from './components/ExpiryAlertsView';
import { ExpiryReportView } from './components/ExpiryReportView';
import { UserSwitchModal } from './components/UserSwitchModal';
import { LoginModal } from './components/LoginModal';
import { KotlinCodeViewer } from './components/KotlinCodeViewer';
import { TransferModal } from './components/TransferModal';
import { SideDrawer } from './components/SideDrawer';
import { LocationReportView } from './components/LocationReportView';
import { InvoiceBatchAssignModal } from './components/InvoiceBatchAssignModal';
import { TagsView } from './components/TagsView';
import { ProfitBandsReminder } from './components/ProfitBandsReminder';
import { PriceListImportView } from './components/PriceListImportView';
import { Menu as MenuIcon } from 'lucide-react';
import { GoodsReceiptView } from './components/GoodsReceiptView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InAppNotificationToast } from './components/InAppNotificationToast';
import { getProductStockStatus } from './utils/stockAlertUtils';
import { Search, Plus, Wrench, Layers, RefreshCw, X, ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Bell } from 'lucide-react';

export default function App() {
  // App Core State
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [currentUser, setCurrentUser] = useState<User>(() => StorageService.getCurrentUser());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [categories, setCategories] = useState<Category[]>(() => StorageService.getActiveCategories());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => StorageService.getAuditLogs());
  const [notifications, setNotifications] = useState<AppNotification[]>(() => StorageService.getNotifications());
  const [invoices, setInvoices] = useState<Invoice[]>(() => StorageService.getInvoices());
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [customerGroups, setCustomerGroups] = useState(() => StorageService.getCustomerGroups());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => StorageService.getSyncStatus());

  // Navigation & Views
  const [activeTab, setActiveTab] = useState<NavTab>('products');
  const [showKotlinCode, setShowKotlinCode] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [stockAlertFilter, setStockAlertFilter] = useState<'all' | 'alert_only' | 'critical' | 'low' | 'out_of_stock'>('all');

  // Modals
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [formProduct, setFormProduct] = useState<Product | null>(null);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [analyticsProduct, setAnalyticsProduct] = useState<Product | null>(null);
  const [createInvoiceType, setCreateInvoiceType] = useState<InvoiceType | null>(null);
  const [showQuickInvoice, setShowQuickInvoice] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [shareInvoice, setShareInvoice] = useState<Invoice | null>(null);
  const [auditInvoice, setAuditInvoice] = useState<Invoice | null>(null);
  const [bulkExportInvoices, setBulkExportInvoices] = useState<Invoice[] | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUserSwitchOpen, setIsUserSwitchOpen] = useState(false);


  // In-App Toast
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null);
  const [transferProduct, setTransferProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [batchInvoice, setBatchInvoice] = useState<Invoice | null>(null);

  // Layout & Theme
  const [isMobileFrame, setIsMobileFrame] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hami_tools_theme') === 'dark';
    }
    return false;
  });

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('hami_tools_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('hami_tools_theme', 'light');
    }
  }, [isDarkMode]);

  // Sync listener across tabs and windows
  useEffect(() => {
    const unsubscribe = subscribeToSync((msg) => {
      if (msg.type === 'DATA_UPDATED') {
        // Refresh data
        setProducts(StorageService.getProducts());
        setAuditLogs(StorageService.getAuditLogs());
        setNotifications(StorageService.getNotifications());
        setInvoices(StorageService.getInvoices());
        setCustomers(StorageService.getCustomers());
        setSyncStatus(StorageService.getSyncStatus());

        // Play chime and show toast if action was by another user
        if (msg.sourceUserId !== currentUser.id) {
          soundManager.playNotificationChime();
          if (msg.notification) {
            setToastNotification(msg.notification);
          }
        }
      } else if (msg.type === 'USER_SWITCHED') {
        setUsers(StorageService.getUsers());
        setCurrentUser(StorageService.getCurrentUser());
      } else if (msg.type === 'CLOUD_SYNCED') {
        setAuditLogs(StorageService.getAuditLogs());
        setInvoices(StorageService.getInvoices());
        setSyncStatus(StorageService.getSyncStatus());
      }
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setSyncStatus(StorageService.getSyncStatus());
    const handleOffline = () => setSyncStatus(StorageService.getSyncStatus());
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic Auto-Pricing Check for Abzarreza (Part 8)
  useEffect(() => {
    const settings = StorageService.getAutoPricingSettings();
    if (!settings.autoUpdateEnabled) return;

    const intervalHours = settings.autoCheckIntervalHours || 6;
    const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;

    const timer = setInterval(() => {
      StorageService.runBatchAbzarrezaUpdate(currentUser).then((res) => {
        if (res.updated > 0) {
          setProducts(StorageService.getProducts());
          setAuditLogs(StorageService.getAuditLogs());
          setNotifications(StorageService.getNotifications());
        }
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentUser]);

  const handleCheckAbzarrezaPrice = async (prod: Product) => {
    try {
      const res = await StorageService.checkAndUpdateAbzarrezaPrice(prod.id, currentUser, true);
      setProducts(StorageService.getProducts());
      setAuditLogs(StorageService.getAuditLogs());
      setNotifications(StorageService.getNotifications());
      soundManager.playSuccessSound();
      setToastNotification({
        id: `toast_${Date.now()}`,
        title: `استعلام قیمت ابزار رضا: ${prod.name}`,
        body: res.message,
        type: 'price_change',
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  };

  // Stock Alerts Summary Stats (Part 6)
  const alertStats = useMemo(() => {
    const active = products.filter((p) => !p.deleted);
    let critical = 0;
    let low = 0;
    let outOfStock = 0;
    let normal = 0;

    active.forEach((p) => {
      const status = getProductStockStatus(p);
      if (status === 'critical') critical++;
      else if (status === 'low') low++;
      else if (status === 'out_of_stock') outOfStock++;
      else normal++;
    });

    return {
      critical,
      low,
      outOfStock,
      normal,
      totalAlerts: critical + low + outOfStock,
    };
  }, [products]);

  // Filtered Products
  const visibleProducts = useMemo(() => {
    return products
      .filter((p) => !p.deleted)
      .filter((p) => {
        if (selectedCategory !== 'همه' && p.category !== selectedCategory) {
          return false;
        }
        if (stockAlertFilter !== 'all') {
          const status = getProductStockStatus(p);
          if (stockAlertFilter === 'alert_only') {
            if (status === 'normal') return false;
          } else if (status !== stockAlertFilter) {
            return false;
          }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCode = p.code.toLowerCase().includes(q);
          const matchDesc = (p.description || '').toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchDesc) return false;
        }
        return true;
      });
  }, [products, selectedCategory, searchQuery, stockAlertFilter]);

  // Actions
  const handleQuickPriceSave = useCallback(
    (productId: string, newPrice: number) => {
      const res = StorageService.quickUpdatePrice(productId, newPrice, currentUser);
      if (res) {
        setProducts(StorageService.getProducts());
        setAuditLogs(StorageService.getAuditLogs());
        setNotifications(StorageService.getNotifications());
        setSyncStatus(StorageService.getSyncStatus());
        setToastNotification(res.notification);
        setSelectedDetailProduct((prev) => (prev && prev.id === res.product.id ? res.product : prev));
      }
    },
    [currentUser]
  );

  const handleQuickStockSave = useCallback(
    (productId: string, newStock: number) => {
      const res = StorageService.quickUpdateStock(productId, newStock, currentUser);
      if (res) {
        setProducts(StorageService.getProducts());
        setAuditLogs(StorageService.getAuditLogs());
        setNotifications(StorageService.getNotifications());
        setSyncStatus(StorageService.getSyncStatus());
        setToastNotification(res.notification);
        setSelectedDetailProduct((prev) => (prev && prev.id === res.product.id ? res.product : prev));
      }
    },
    [currentUser]
  );

  const handleProductFormSave = useCallback(
    (data: Partial<Product> & { name: string; price: number; stock: number; unit: ProductUnit }) => {
      StorageService.saveProductDetails(data, currentUser);
      setProducts(StorageService.getProducts());
      setAuditLogs(StorageService.getAuditLogs());
      setNotifications(StorageService.getNotifications());
      setSyncStatus(StorageService.getSyncStatus());
    },
    [currentUser]
  );

  const requestDeleteProduct = useCallback((product: Product) => {
    setPendingDeleteProduct(product);
  }, []);

  const refreshAfterProductDelete = useCallback(() => {
    setProducts(StorageService.getProducts());
    setCategories(StorageService.getActiveCategories());
    setAuditLogs(StorageService.getAuditLogs());
    setNotifications(StorageService.getNotifications());
    setSyncStatus(StorageService.getSyncStatus());
    setPendingDeleteProduct(null);
  }, []);

  const confirmSoftDeleteProduct = useCallback(() => {
    if (!pendingDeleteProduct) return;
    StorageService.softDeleteProduct(pendingDeleteProduct.id, currentUser);
    refreshAfterProductDelete();
  }, [currentUser, pendingDeleteProduct, refreshAfterProductDelete]);

  const confirmPermanentDeleteProduct = useCallback(() => {
    if (!pendingDeleteProduct) return;
    const confirmed = typeof window !== 'undefined' && window.confirm(
      `حذف دائمی «${pendingDeleteProduct.name}» برگشت‌پذیر نیست. رکورد کالا از فهرست حذف می‌شود، اما سوابق فاکتورهای قبلی حفظ می‌شوند. ادامه می‌دهید؟`
    );
    if (!confirmed) return;
    StorageService.permanentDeleteProduct(pendingDeleteProduct.id, currentUser);
    refreshAfterProductDelete();
  }, [currentUser, pendingDeleteProduct, refreshAfterProductDelete]);

  const handleToggleOffline = () => {
    const current = StorageService.isSimulatedOffline();
    StorageService.setSimulatedOffline(!current);
    const updated = StorageService.getSyncStatus();
    setSyncStatus(updated);

    // If turned online, auto-sync pending
    if (current && updated.pendingChangesCount > 0) {
      StorageService.syncNow();
      setAuditLogs(StorageService.getAuditLogs());
      setSyncStatus(StorageService.getSyncStatus());
    }
  };

  const handleManualSync = () => {
    StorageService.syncNow();
    setAuditLogs(StorageService.getAuditLogs());
    setSyncStatus(StorageService.getSyncStatus());
  };

  const handleCreateInvoice = useCallback(
    (
      invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'createdBy' | 'createdByName'>
    ) => {
      StorageService.createInvoice(invoiceData, currentUser);
      setInvoices(StorageService.getInvoices());
      setProducts(StorageService.getProducts());
      setAuditLogs(StorageService.getAuditLogs());
      setNotifications(StorageService.getNotifications());
      setCustomers(StorageService.getCustomers());
      setSyncStatus(StorageService.getSyncStatus());
      setCreateInvoiceType(null);
    },
    [currentUser]
  );

  const handleSaveQuickInvoice = useCallback((invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'createdBy' | 'createdByName'>) => {
    StorageService.createInvoice(invoiceData, currentUser);
    setInvoices(StorageService.getInvoices());
    setProducts(StorageService.getProducts());
    setAuditLogs(StorageService.getAuditLogs());
    setNotifications(StorageService.getNotifications());
    setCustomers(StorageService.getCustomers());
    setSyncStatus(StorageService.getSyncStatus());
  }, [currentUser]);

  const handleSaveQuickProduct = useCallback((name: string, unit: ProductUnit, price: number, type: InvoiceType) => {
    const product = StorageService.saveProductDetails({
      name, unit, price, stock: 0, buyPrice: type === 'purchase' || type === 'purchase_return' ? price : undefined,
      category: 'فاکتور سریع', deductFromStock: true,
    }, currentUser);
    setProducts(StorageService.getProducts());
    setCategories(StorageService.getActiveCategories());
    return product;
  }, [currentUser]);

  const handleUpdateInvoice = useCallback((invoiceId: string, data: Partial<Invoice>) => {
    const updated = StorageService.updateInvoice(invoiceId, data, currentUser);
    if (!updated) {
      if (typeof window !== 'undefined') window.alert('تغییرات ذخیره نشد؛ ممکن است موجودی کافی نباشد یا کالا از انبار حذف شده باشد. موجودی را بررسی کنید.');
      return false;
    }
    setInvoices(StorageService.getInvoices());
    setProducts(StorageService.getProducts());
    setAuditLogs(StorageService.getAuditLogs());
    setNotifications(StorageService.getNotifications());
    setCustomers(StorageService.getCustomers());
    setSyncStatus(StorageService.getSyncStatus());
    return true;
  }, [currentUser]);

  const handleApplyPendingInvoiceStock = useCallback((invoiceId: string) => {
    const result = StorageService.applyPendingInvoiceStock(invoiceId, currentUser);
    setInvoices(StorageService.getInvoices());
    setProducts(StorageService.getProducts());
    setAuditLogs(StorageService.getAuditLogs());
    setNotifications(StorageService.getNotifications());
    if (typeof window !== 'undefined') window.alert(result.message);
  }, [currentUser]);

  const handleAddCustomer = useCallback(
    (customerData: Partial<Customer> & { name: string; mobile: string }) => {
      const created = StorageService.addCustomer(customerData, currentUser);
      setCustomers(StorageService.getCustomers());
      return created;
    },
    [currentUser]
  );

  const handleUpdateCustomer = useCallback(
    (id: string, customerData: Partial<Customer>) => {
      StorageService.updateCustomer(id, customerData, currentUser);
      setCustomers(StorageService.getCustomers());
    },
    [currentUser]
  );

  const handleDeleteCustomer = useCallback(
    (id: string) => {
      StorageService.deleteCustomer(id, currentUser);
      setCustomers(StorageService.getCustomers());
    },
    [currentUser]
  );

  const handleCreateCategory = useCallback(
    (catData: { name: string; description?: string; color?: string; icon?: string; parentId?: string | null }) => {
      StorageService.createCategory(catData);
      setCategories(StorageService.getActiveCategories());
    },
    []
  );

  const handleUpdateCategory = useCallback(
    (id: string, updates: Partial<Category>) => {
      StorageService.updateCategory(id, updates);
      setCategories(StorageService.getActiveCategories());
      setProducts(StorageService.getProducts());
    },
    []
  );

  const handleDeleteCategory = useCallback(
    (id: string, action: 'uncategorized' | 'delete_products' | 'move_to_category', targetCategoryId?: string) => {
      StorageService.deleteCategory(id, action, targetCategoryId);
      setCategories(StorageService.getActiveCategories());
      setProducts(StorageService.getProducts());
    },
    []
  );

  const handleReorderCategories = useCallback(
    (ids: string[]) => {
      StorageService.reorderCategories(ids);
      setCategories(StorageService.getActiveCategories());
    },
    []
  );

  const handleDeleteInvoice = useCallback(
    (invoiceId: string) => {
      const success = StorageService.deleteInvoice(invoiceId, currentUser);
      if (success) {
        setInvoices(StorageService.getInvoices());
        setProducts(StorageService.getProducts());
        setCustomers(StorageService.getCustomers());
        setNotifications(StorageService.getNotifications());
      }
    },
    [currentUser]
  );


  const handleResetData = () => {
    StorageService.resetAllData();
    setProducts(StorageService.getProducts());
    setAuditLogs(StorageService.getAuditLogs());
    setNotifications(StorageService.getNotifications());
    setInvoices(StorageService.getInvoices());
    setCustomers(StorageService.getCustomers());
    setSyncStatus(StorageService.getSyncStatus());
  };

  const handleUserSelect = (user: User) => {
    StorageService.setCurrentUser(user.id);
    setCurrentUser(user);
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-start ${isDarkMode ? 'dark' : ''}`}>
      {/* If logged out */}
      {!isLoggedIn && (
        <LoginModal
          users={users}
          onLogin={(user) => {
            handleUserSelect(user);
            setIsLoggedIn(true);
          }}
        />
      )}

      {/* Floating In-App Toast */}
      <InAppNotificationToast
        notification={toastNotification}
        onDismiss={() => setToastNotification(null)}
        onView={() => {
          setActiveTab('notifications');
          setToastNotification(null);
        }}
      />

      {/* دکمه‌ی منو: بالا سمت راست، روی هدر */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="باز کردن منو"
        className="fixed right-2 top-2 z-[60] w-10 h-10 rounded-xl bg-slate-800/95 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <MenuIcon className="w-5 h-5" />
      </button>

      {/* کشوی منو */}
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onSelect={(tab) => {
          setActiveTab(tab);
          setShowKotlinCode(false);
          setDrawerOpen(false);
        }}
      />

      {/* Main Container: Mobile Frame or Fullscreen */}
      <div
        className={`w-full flex-1 transition-all duration-300 flex flex-col ${
          isMobileFrame
            ? 'max-w-md my-0 sm:my-3 sm:rounded-[36px] shadow-2xl overflow-hidden border-0 sm:border-8 sm:border-slate-800 bg-slate-100 dark:bg-slate-950 relative min-h-screen sm:min-h-[844px]'
            : 'max-w-4xl bg-slate-100 dark:bg-slate-950 min-h-screen shadow-md'
        }`}
      >
        {/* Android Native Status Bar */}
        <AndroidStatusBar isOffline={!syncStatus.isOnline} />

        {/* Top App Header */}
        <Header
          currentUser={currentUser}
          syncStatus={syncStatus}
          unreadCount={unreadCount}
          onOpenUserSwitch={() => setIsUserSwitchOpen(true)}
          onToggleOffline={handleToggleOffline}
          onNavigateToNotifications={() => {
            setActiveTab('notifications');
            setShowKotlinCode(false);
          }}
          isMobileFrame={isMobileFrame}
          onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto px-3.5 py-4">
          {activeTab !== 'tags' && (
            <ProfitBandsReminder
              onOpen={() => {
                setActiveTab('tags');
                setShowKotlinCode(false);
              }}
            />
          )}
          {showKotlinCode ? (
            <KotlinCodeViewer onBack={() => setShowKotlinCode(false)} />
          ) : activeTab === 'products' ? (
            <div className="space-y-3.5 pb-20">
              {/* Top Banner / Actions Bar */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    لیست کالاها و ابزارآلات ({toPersianDigits(visibleProducts.length)} قلم)
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    به‌روزرسانی سریع قیمت و موجودی انبار
                  </p>
                </div>

                <button
                  onClick={() => {
                    setFormProduct(null);
                    setIsFormOpen(true);
                  }}
                  className="min-h-[40px] px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-600/20 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن ابزار</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو بر اساس نام کالا، کد انبار یا مشخصات..."
                  className="w-full pr-10 pl-8 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dashboard Stock Alert Summary & Quick Filter (Part 6) */}
              {alertStats.totalAlerts > 0 && (
                <div className="p-3 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <Bell className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>داشبورد هشدار موجودی انبار</span>
                    </div>
                    {stockAlertFilter !== 'all' ? (
                      <button
                        onClick={() => setStockAlertFilter('all')}
                        className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                      >
                        نمایش همه کالاها
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        {toPersianDigits(alertStats.totalAlerts)} قلم کسری یا بحرانی
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                    {/* All */}
                    <button
                      onClick={() => setStockAlertFilter('all')}
                      className={`p-1.5 rounded-xl border transition-colors ${
                        stockAlertFilter === 'all'
                          ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-transparent shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className="block text-[10px] opacity-75">همه</span>
                      <strong className="text-xs tabular-nums">{toPersianDigits(products.filter(p => !p.deleted).length)}</strong>
                    </button>

                    {/* Critical */}
                    <button
                      onClick={() => setStockAlertFilter(stockAlertFilter === 'critical' ? 'all' : 'critical')}
                      className={`p-1.5 rounded-xl border transition-colors ${
                        stockAlertFilter === 'critical'
                          ? 'bg-rose-600 text-white border-transparent shadow-xs'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      <span className="block text-[10px] opacity-75">🔴 بحرانی</span>
                      <strong className="text-xs tabular-nums">{toPersianDigits(alertStats.critical)}</strong>
                    </button>

                    {/* Low */}
                    <button
                      onClick={() => setStockAlertFilter(stockAlertFilter === 'low' ? 'all' : 'low')}
                      className={`p-1.5 rounded-xl border transition-colors ${
                        stockAlertFilter === 'low'
                          ? 'bg-amber-600 text-white border-transparent shadow-xs'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      <span className="block text-[10px] opacity-75">⚠️ کم</span>
                      <strong className="text-xs tabular-nums">{toPersianDigits(alertStats.low)}</strong>
                    </button>

                    {/* Out of Stock */}
                    <button
                      onClick={() => setStockAlertFilter(stockAlertFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
                      className={`p-1.5 rounded-xl border transition-colors ${
                        stockAlertFilter === 'out_of_stock'
                          ? 'bg-slate-600 text-white border-transparent shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="block text-[10px] opacity-75">❌ ناموجود</span>
                      <strong className="text-xs tabular-nums">{toPersianDigits(alertStats.outOfStock)}</strong>
                    </button>
                  </div>
                </div>
              )}

              {/* Horizontal Category Scroller */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  onClick={() => setSelectedCategory('همه')}
                  className={`min-h-[34px] px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    selectedCategory === 'همه'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  همه ({products.filter((p) => !p.deleted).length})
                </button>
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`min-h-[34px] px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#F59E0B' }}
                      />
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-75 tabular-nums">
                        ({cat.productCount})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Products Feed */}
              {visibleProducts.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <Wrench className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    کالایی با این مشخصات یافت نشد
                  </p>
                  <p className="text-xs text-slate-400">
                    عبارت دیگری جستجو کنید یا دسته‌بندی دیگری انتخاب نمایید.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      currentUser={currentUser}
                      onQuickPrice={(p) => setQuickPriceProduct(p)}
                      onQuickStock={(p) => setQuickStockProduct(p)}
                      onEditFull={(p) => {
                        setFormProduct(p);
                        setIsFormOpen(true);
                      }}
                      onDelete={requestDeleteProduct}
                      onTransfer={(p) => setTransferProduct(p)}
                      onViewDetail={(p) => setSelectedDetailProduct(p)}
                      onViewAnalytics={(p) => setAnalyticsProduct(p)}
                      onCheckAbzarrezaPrice={handleCheckAbzarrezaPrice}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'categories' ? (
            <CategoryManagementView
              categories={categories}
              totalProductsCount={products.filter((p) => !p.deleted).length}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onReorderCategories={handleReorderCategories}
              onSelectCategoryFilter={(catName) => {
                setSelectedCategory(catName);
                setActiveTab('products');
              }}
            />
          ) : activeTab === 'invoices' ? (
            <InvoicesView
              invoices={invoices}
              customers={customers}
              products={products}
              onOpenCreateInvoice={(type) => setCreateInvoiceType(type)}
              onOpenQuickInvoice={() => setShowQuickInvoice(true)}
              onApplyPendingStock={handleApplyPendingInvoiceStock}
              onViewInvoice={(inv) => setPreviewInvoice(inv)}
              onEditInvoice={(inv) => setEditingInvoice(inv)}
              onShareInvoice={(inv) => setShareInvoice(inv)}
              onViewAudit={(inv) => setAuditInvoice(inv)}
              onAssignBatches={(inv) => setBatchInvoice(inv)}
              onDeleteInvoice={handleDeleteInvoice}
              onOpenBulkExport={(filtered) => setBulkExportInvoices(filtered)}
            />
          ) : activeTab === 'analytics' ? (
            <AnalyticsView
              products={products}
              invoices={invoices}
              categories={categories}
              currentUser={currentUser}
              onSelectProduct={(p) => setAnalyticsProduct(p)}
              onOpenPurchaseInvoice={(p, qty) => {
                setCreateInvoiceType('purchase');
              }}
              onUpdateProductParams={(productId, params) => {
                StorageService.updateProductAnalyticsParams(productId, params, currentUser);
                setProducts(StorageService.getProducts());
              }}
            />
          ) : activeTab === 'customers' ? (
            <CustomersView
              currentUser={currentUser}
              customers={customers}
              groups={customerGroups}
              invoices={invoices}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onCreateInvoiceForCustomer={(c) => {
                setCreateInvoiceType('sales');
              }}
            />
          ) : activeTab === 'debt_reports' ? (
            <DebtReportView
              currentUser={currentUser}
              customers={customers}
            />
          ) : activeTab === 'history' ? (

            <AuditLogView
              auditLogs={auditLogs}
              users={users}
              onClearLogs={() => setAuditLogs([])}
            />
          ) : activeTab === 'notifications' ? (
            <NotificationsView
              notifications={notifications}
              onMarkAllAsRead={() => {
                StorageService.markNotificationsAsRead();
                setNotifications(StorageService.getNotifications());
              }}
              onClearAll={() => {
                StorageService.clearNotifications();
                setNotifications([]);
              }}
            />
          ) : activeTab === 'tags' ? (
            <TagsView
              products={products}
              currentUser={currentUser}
              onChanged={() => {
                setProducts(StorageService.getProducts());
                setAuditLogs(StorageService.getAuditLogs());
                setSyncStatus(StorageService.getSyncStatus());
              }}
            />
          ) : activeTab === 'price_import' ? (
            <PriceListImportView
              products={products}
              currentUser={currentUser}
              onChanged={() => {
                setProducts(StorageService.getProducts());
                setAuditLogs(StorageService.getAuditLogs());
                setSyncStatus(StorageService.getSyncStatus());
              }}
            />
          ) : activeTab === 'location_report' ? (
            <LocationReportView products={products} />
          ) : activeTab === 'goods_receipt' ? (
            <GoodsReceiptView
              currentUser={currentUser}
              products={products}
              onSaved={() => {
                setProducts(StorageService.getProducts());
                setAuditLogs(StorageService.getAuditLogs());
                setNotifications(StorageService.getNotifications());
                setSyncStatus(StorageService.getSyncStatus());
              }}
            />
          ) : activeTab === 'expiry_alerts' ? (
            <ExpiryAlertsView
              currentUser={currentUser}
              products={products}
              onViewProduct={(p) => setSelectedDetailProduct(p)}
            />
          ) : activeTab === 'expiry_reports' ? (
            <ExpiryReportView
              currentUser={currentUser}
              products={products}
              categories={categories}
            />
          ) : (
            <SettingsView
              currentUser={currentUser}
              onOpenTags={() => setActiveTab('tags')}
              syncStatus={syncStatus}
              isDarkMode={isDarkMode}
              onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
              onToggleOffline={handleToggleOffline}
              onManualSync={handleManualSync}
              onResetData={handleResetData}
              onOpenUserSwitch={() => setIsUserSwitchOpen(true)}
              onOpenKotlinViewer={() => setShowKotlinCode(true)}
              onOpenCategoryManagement={() => setActiveTab('categories')}
            />
          )}
        </main>

        {/* Android Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            setShowKotlinCode(false);
          }}
          unreadNotificationsCount={unreadCount}
        />
      </div>

      {/* Quick Price Sheet/Modal */}
      {quickPriceProduct && (
        <QuickPriceModal
          product={quickPriceProduct}
          currentUser={currentUser}
          isOpen={!!quickPriceProduct}
          onClose={() => setQuickPriceProduct(null)}
          onSave={handleQuickPriceSave}
        />
      )}

      {/* Quick Stock Sheet/Modal */}
      {quickStockProduct && (
        <QuickStockModal
          product={quickStockProduct}
          currentUser={currentUser}
          isOpen={!!quickStockProduct}
          onClose={() => setQuickStockProduct(null)}
          onSave={handleQuickStockSave}
        />
      )}

      {/* Product Add/Edit Modal */}
      {isFormOpen && (
        <ProductFormModal
          initialProduct={formProduct}
          categories={categories}
          currentUser={currentUser}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setFormProduct(null);
          }}
          onSave={handleProductFormSave}
          onQuickAddCategory={() => setCategories(StorageService.getActiveCategories())}
        />
      )}

      {transferProduct && (
        <TransferModal
          product={transferProduct}
          currentUser={currentUser}
          onClose={() => setTransferProduct(null)}
          onDone={() => {
            setProducts(StorageService.getProducts());
            setAuditLogs(StorageService.getAuditLogs());
            setSyncStatus(StorageService.getSyncStatus());
            const fresh = StorageService.getProducts().find((x) => x.id === transferProduct.id);
            setTransferProduct(fresh || null);
          }}
        />
      )}

      {/* انتخاب نوع حذف کالا */}
      {pendingDeleteProduct && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-2xl text-slate-900 dark:text-slate-100">
            <h3 className="text-base font-black">حذف کالا</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">برای «{pendingDeleteProduct.name}» نوع حذف را انتخاب کن.</p>
            <div className="mt-4 space-y-2">
              <button type="button" onClick={confirmSoftDeleteProduct} className="w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-right">
                <span className="block font-bold text-amber-800 dark:text-amber-200">حذف موقت</span>
                <span className="block mt-1 text-xs text-slate-600 dark:text-slate-300">کالا از فهرست فعال پنهان می‌شود و امکان بازیابی آن باقی می‌ماند.</span>
              </button>
              <button type="button" onClick={confirmPermanentDeleteProduct} className="w-full rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-right">
                <span className="block font-bold text-rose-700 dark:text-rose-300">حذف دائمی</span>
                <span className="block mt-1 text-xs text-slate-600 dark:text-slate-300">رکورد کالا از فهرست حذف می‌شود؛ سوابق فاکتورهای قبلی باقی می‌مانند. این کار قابل برگشت نیست.</span>
              </button>
            </div>
            <button type="button" onClick={() => setPendingDeleteProduct(null)} className="mt-3 w-full rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-sm font-bold">انصراف</button>
          </div>
        </div>
      )}

      {/* User Switch Modal */}
      <UserSwitchModal
        users={users}
        currentUser={currentUser}
        isOpen={isUserSwitchOpen}
        onClose={() => setIsUserSwitchOpen(false)}
        onSelectUser={handleUserSelect}
        onLogout={() => {
          setIsUserSwitchOpen(false);
          setIsLoggedIn(false);
        }}
      />

      {/* Product Detail & D3 Price Trend Modal */}
      {selectedDetailProduct && (
        <ProductDetailModal
          product={selectedDetailProduct}
          auditLogs={auditLogs}
          currentUser={currentUser}
          isOpen={!!selectedDetailProduct}
          onClose={() => setSelectedDetailProduct(null)}
          onQuickPrice={(p) => setQuickPriceProduct(p)}
          onQuickStock={(p) => setQuickStockProduct(p)}
          onEditFull={(p) => {
            setFormProduct(p);
            setIsFormOpen(true);
          }}
          onOpenAnalytics={(p) => {
            setSelectedDetailProduct(null);
            setAnalyticsProduct(p);
          }}
          onPriceRefreshed={() => {
            setProducts(StorageService.getProducts());
            setAuditLogs(StorageService.getAuditLogs());
            setNotifications(StorageService.getNotifications());
          }}
        />
      )}

      {/* Product Sales Analytics & Smart Restock Modal */}
      {analyticsProduct && (
        <ProductAnalyticsModal
          product={analyticsProduct}
          invoices={invoices}
          isOpen={!!analyticsProduct}
          onClose={() => setAnalyticsProduct(null)}
          onOpenPurchaseInvoice={(prod, qty) => {
            setAnalyticsProduct(null);
            setCreateInvoiceType('purchase');
          }}
          onUpdateProductParams={(productId, params) => {
            StorageService.updateProductAnalyticsParams(productId, params, currentUser);
            setProducts(StorageService.getProducts());
          }}
        />
      )}

      <InvoiceEditModal
        invoice={editingInvoice}
        products={products}
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onSave={handleUpdateInvoice}
      />

      {showQuickInvoice && (
        <QuickInvoiceModal
          isOpen={showQuickInvoice}
          products={products}
          currentUser={currentUser}
          onClose={() => setShowQuickInvoice(false)}
          onSave={handleSaveQuickInvoice}
          onSaveProduct={handleSaveQuickProduct}
        />
      )}

      {/* Create Invoice Modal for 5 Types */}
      {createInvoiceType && (
        <InvoiceFormModal
          type={createInvoiceType}
          products={products}
          customers={customers}
          existingInvoices={invoices}
          currentUser={currentUser}
          isOpen={!!createInvoiceType}
          onClose={() => setCreateInvoiceType(null)}
          onSubmit={handleCreateInvoice}
          onAddCustomer={handleAddCustomer}
          onPreviewInvoice={(inv) => setPreviewInvoice(inv)}
        />
      )}

      {/* Invoice 5-Template Print & Export Preview Modal */}
      {batchInvoice && (
        <InvoiceBatchAssignModal
          invoice={batchInvoice}
          currentUser={currentUser}
          onClose={() => setBatchInvoice(null)}
          onChanged={() => {
            setInvoices(StorageService.getInvoices());
            setProducts(StorageService.getProducts());
            setBatchInvoice(StorageService.getInvoices().find((i) => i.id === batchInvoice.id) || null);
          }}
        />
      )}

      {previewInvoice && (
        <ErrorBoundary onClose={() => setPreviewInvoice(null)} title="خطا در نمایش پیش‌نمایش فاکتور">
          <InvoicePrintModal
            invoice={previewInvoice}
            shopInfo={StorageService.getShopInfo()}
            currentUser={currentUser}
            isOpen={!!previewInvoice}
            onClose={() => setPreviewInvoice(null)}
            onOpenShare={(inv) => {
              setShareInvoice(inv);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Invoice Multi-Format Share Modal */}
      {shareInvoice && (
        <InvoiceShareModal
          invoice={shareInvoice}
          shopInfo={StorageService.getShopInfo()}
          currentUser={currentUser}
          isOpen={!!shareInvoice}
          onClose={() => setShareInvoice(null)}
        />
      )}

      {/* Invoice History & Audit Log Modal */}
      {auditInvoice && (
        <InvoiceAuditModal
          invoice={auditInvoice}
          isOpen={!!auditInvoice}
          onClose={() => setAuditInvoice(null)}
        />
      )}

      {/* Bulk Export Modal */}
      {bulkExportInvoices && (
        <BulkExportModal
          invoices={bulkExportInvoices}
          isOpen={!!bulkExportInvoices}
          onClose={() => setBulkExportInvoices(null)}
        />
      )}
    </div>
  );
}


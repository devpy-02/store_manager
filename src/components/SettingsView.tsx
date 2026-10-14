import React, { useState } from 'react';
import { User, SyncStatus, ShopInfo, InvoiceSettings, PrintTemplateId, PaymentMethod, AutoPricingSettings, ExpirySettings, NameUniquenessSettings } from '../types';
import { StorageService } from '../services/storageService';
import { AbzarrezaTester } from './AbzarrezaTester';
import { CustomerGroupsSettings } from './CustomerGroupsSettings';
import { soundManager } from '../utils/audio';
import { formatPersianDateTime, toPersianDigits } from '../utils/jalali';
import { AdvancedPricingSection } from './TagsView';
import { BackupSection } from './BackupSection';
import {
  Settings,
  User as UserIcon,
  RefreshCw,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Download,
  RotateCcw,
  Code,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Copy,
  ExternalLink,
  Smartphone,
  Store,
  FileText,
  Save,
  Sliders,
  Image as ImageIcon,
  Radio,
  DollarSign,
  Bell,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';


interface Props {
  currentUser: User;
  syncStatus: SyncStatus;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleOffline: () => void;
  onManualSync: () => void;
  onResetData: () => void;
  onOpenUserSwitch: () => void;
  onOpenKotlinViewer: () => void;
  onOpenTags?: () => void;
  onOpenCategoryManagement?: () => void;
}

export const SettingsView: React.FC<Props> = ({
  currentUser,
  syncStatus,
  isDarkMode,
  onToggleDarkMode,
  onToggleOffline,
  onManualSync,
  onResetData,
  onOpenUserSwitch,
  onOpenKotlinViewer,
  onOpenTags,
  onOpenCategoryManagement,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(soundManager.soundEnabled);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Shop Info & Invoice Settings State
  const [shopInfo, setShopInfo] = useState<ShopInfo>(() => StorageService.getShopInfo());
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(() => StorageService.getInvoiceSettings());
  const [autoPricingSettings, setAutoPricingSettings] = useState<AutoPricingSettings>(() => StorageService.getAutoPricingSettings());
  const [expirySettings, setExpirySettings] = useState<ExpirySettings>(() => StorageService.getDefaultExpirySettings());
  const [nameUniquenessSettings, setNameUniquenessSettings] = useState<NameUniquenessSettings>(() => StorageService.getNameUniquenessSettings());
  const [shopSaveSuccess, setShopSaveSuccess] = useState(false);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);
  const [autoPricingSaveSuccess, setAutoPricingSaveSuccess] = useState(false);
  const [expirySaveSuccess, setExpirySaveSuccess] = useState(false);
  const [nameUniquenessSaveSuccess, setNameUniquenessSaveSuccess] = useState(false);

  const handleSaveExpirySettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveDefaultExpirySettings(expirySettings, currentUser);
    setExpirySaveSuccess(true);
    setTimeout(() => setExpirySaveSuccess(false), 2500);
  };

  const handleSaveNameUniquenessSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveNameUniquenessSettings(nameUniquenessSettings, currentUser);
    setNameUniquenessSaveSuccess(true);
    setTimeout(() => setNameUniquenessSaveSuccess(false), 2500);
  };
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [batchUpdateResult, setBatchUpdateResult] = useState<{
    total: number;
    updated: number;
    unchanged: number;
    failed: number;
  } | null>(null);

  const handleSaveShopInfo = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveShopInfo(shopInfo);
    setShopSaveSuccess(true);
    setTimeout(() => setShopSaveSuccess(false), 2500);
  };

  const handleSaveInvoiceSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveInvoiceSettings(invoiceSettings);
    setSettingsSaveSuccess(true);
    setTimeout(() => setSettingsSaveSuccess(false), 2500);
  };

  const handleSaveAutoPricingSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveAutoPricingSettings(autoPricingSettings);
    setAutoPricingSaveSuccess(true);
    setTimeout(() => setAutoPricingSaveSuccess(false), 2500);
  };

  const handleRunBatchUpdate = async () => {
    setIsBatchUpdating(true);
    setBatchUpdateResult(null);
    try {
      const res = await StorageService.runBatchAbzarrezaUpdate(currentUser);
      setBatchUpdateResult(res);
    } finally {
      setIsBatchUpdating(false);
    }
  };


  const sharedAppUrl = 'https://ais-pre-rspotq2crmekjmmw2xh5zm-940638663530.europe-west2.run.app';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(sharedAppUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2500);
  };

  const toggleSound = () => {
    soundManager.soundEnabled = !soundManager.soundEnabled;
    setSoundEnabled(soundManager.soundEnabled);
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        products: JSON.parse(localStorage.getItem('hami_tools_products_v1') || '[]'),
        auditLogs: JSON.parse(localStorage.getItem('hami_tools_audit_logs_v1') || '[]'),
        users: JSON.parse(localStorage.getItem('hami_tools_users_v1') || '[]'),
        timestamp: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hami_tools_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            <span>تنظیمات و مدیریت برنامه</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            پیکربندی حساب کاربری، همگام‌سازی پایگاه داده و فایل‌های کاتلین
          </p>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl ${currentUser.avatarColor} text-white flex items-center justify-center font-bold text-lg shadow-sm`}
          >
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {currentUser.name}
              </h3>
              <span className="text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold">
                {currentUser.role === 'admin' ? 'مدیر ارشد' : 'فروشنده'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentUser.title} · <span className="font-mono">{currentUser.phone}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onOpenUserSwitch}
          className="min-h-[38px] px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
        >
          تغییر کاربر
        </button>
      </div>

      {/* 🗂️ Category Management Entry in Settings */}
      {onOpenCategoryManagement && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-md space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">مدیریت دسته‌بندی‌های کالا (دلخواه)</h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  افزودن دسته‌های نامحدود، زیردسته‌ها، آیکون و کنترل کسر موجودی
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onOpenCategoryManagement}
            className="w-full py-2.5 bg-white text-amber-900 hover:bg-amber-50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <span>ورود به صفحه مدیریت دسته‌بندی‌ها</span>
          </button>
        </div>
      )}

      <BackupSection />

      <AdvancedPricingSection onOpenTags={onOpenTags} />

      {/* Android Kotlin & Compose Source Code Button (Special Showcase) */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-md space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">پروژه نیتیو اندروید (Kotlin + Compose)</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                کدهای آماده Room Database، WorkManager و رابط Jetpack Compose
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onOpenKotlinViewer}
          className="w-full py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
        >
          <span>مشاهده و کپی کدهای Kotlin و Jetpack Compose</span>
        </button>
      </div>

      {/* Sync & Offline Architecture */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              معماری آفلاین-محور (Offline-First Sync)
            </h3>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              syncStatus.isOnline
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}
          >
            {syncStatus.isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{syncStatus.isOnline ? 'آنلاین (همگام)' : 'آفلاین (محلی)'}</span>
          </span>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pt-1">
          <div className="flex justify-between">
            <span>تغییرات در انتظار ارسال:</span>
            <span className="font-bold tabular-nums">
              {toPersianDigits(syncStatus.pendingChangesCount)} مورد
            </span>
          </div>
          <div className="flex justify-between">
            <span>آخرین همگام‌سازی ابری:</span>
            <span>
              {syncStatus.lastSyncedAt
                ? formatPersianDateTime(syncStatus.lastSyncedAt)
                : 'تاکنون انجام نشده'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onToggleOffline}
            className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border ${
              syncStatus.isOnline
                ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-600'
            }`}
          >
            {syncStatus.isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                <span>شبیه‌سازی قطعی نت</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>اتصال مجدد به اینترنت</span>
              </>
            )}
          </button>

          <button
            onClick={onManualSync}
            disabled={!syncStatus.isOnline}
            className="min-h-[40px] px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>همگام‌سازی فوری</span>
          </button>
        </div>
      </div>

      {/* App Preferences */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
          تنظیمات ظاهری و صدا
        </h3>

        <div className="space-y-2">
          {/* Dark Mode */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-2">
              {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                حالت تاریک (Dark Mode)
              </span>
            </div>
            <button
              onClick={onToggleDarkMode}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                isDarkMode ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isDarkMode ? '-translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                صداهای بازخورد لمسی و اعلان
              </span>
            </div>
            <button
              onClick={toggleSound}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                soundEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  soundEnabled ? '-translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 🏪 Shop Info Settings (Part 13) */}
      <form onSubmit={handleSaveShopInfo} className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              🏪 اطلاعات فروشگاه (Shop Info)
            </h3>
          </div>
          {shopSaveSuccess && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>ذخیره شد!</span>
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          این اطلاعات در سربرگ تمام قالب‌های ۵‌گانه چاپ، فایل‌های PDF، Word و Excel نمایش داده می‌شود.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">نام فروشگاه:</label>
            <input
              type="text"
              value={shopInfo.name}
              onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">تلفن ثابت:</label>
            <input
              type="text"
              value={shopInfo.phone}
              onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 ltr"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">تلفن همراه:</label>
            <input
              type="text"
              value={shopInfo.mobile}
              onChange={(e) => setShopInfo({ ...shopInfo, mobile: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 ltr"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">کد اقتصادی:</label>
            <input
              type="text"
              value={shopInfo.economicCode}
              onChange={(e) => setShopInfo({ ...shopInfo, economicCode: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 ltr"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">آدرس فروشگاه:</label>
            <input
              type="text"
              value={shopInfo.address}
              onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">وبسایت:</label>
            <input
              type="text"
              value={shopInfo.website}
              onChange={(e) => setShopInfo({ ...shopInfo, website: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 ltr"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">ایمیل:</label>
            <input
              type="text"
              value={shopInfo.email}
              onChange={(e) => setShopInfo({ ...shopInfo, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 ltr"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">لوگوی اختصاصی فروشگاه در قالب‌ها بارگذاری می‌شود</span>
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>ذخیره اطلاعات فروشگاه</span>
          </button>
        </div>
      </form>

      {/* ⚙️ Invoice Settings (Part 11) */}
      <form onSubmit={handleSaveInvoiceSettings} className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              ⚙️ تنظیمات فاکتور (Invoice Settings)
            </h3>
          </div>
          {settingsSaveSuccess && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>ذخیره شد!</span>
            </span>
          )}
        </div>

        {/* 1. شماره‌گذاری و پیشوندها */}
        <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">شماره‌گذاری و پیشوندها:</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">پیشوند خرید:</label>
              <input
                type="text"
                value={invoiceSettings.prefixes?.purchase || 'خ'}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    prefixes: { ...invoiceSettings.prefixes, purchase: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">پیشوند فروش:</label>
              <input
                type="text"
                value={invoiceSettings.prefixes?.sales || 'ف'}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    prefixes: { ...invoiceSettings.prefixes, sales: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">پیشوند خرده:</label>
              <input
                type="text"
                value={invoiceSettings.prefixes?.retail || 'خرده'}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    prefixes: { ...invoiceSettings.prefixes, retail: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">برگشت خرید:</label>
              <input
                type="text"
                value={invoiceSettings.prefixes?.purchase_return || 'ب-خ'}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    prefixes: { ...invoiceSettings.prefixes, purchase_return: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">برگشت فروش:</label>
              <input
                type="text"
                value={invoiceSettings.prefixes?.sales_return || 'ب-ف'}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    prefixes: { ...invoiceSettings.prefixes, sales_return: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">
              قالب پیش‌فرض چاپ:
            </label>
            <select
              value={invoiceSettings.defaultTemplate}
              onChange={(e) =>
                setInvoiceSettings({
                  ...invoiceSettings,
                  defaultTemplate: e.target.value as PrintTemplateId,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            >
              <option value="official">قالب رسمی (اداری و استاندارد)</option>
              <option value="simple">قالب ساده (تک‌رنگ، مناسب پرینت سریع)</option>
              <option value="colorful">قالب رنگی (مدرن با تم‌های اختصاصی)</option>
              <option value="classic">قالب کلاسیک (حاشیه سنتی و دوخط)</option>
              <option value="thermal">قالب حرارتی ۸۰mm (عرض رول فیش‌پریینتر)</option>
            </select>
          </div>
        </div>

        {/* 2. ویرایش و حذف */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">قوانین ویرایش:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.allowEdit}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, allowEdit: e.target.checked })}
                className="rounded text-amber-600"
              />
              <span>☑ اجازه ویرایش فاکتور</span>
            </label>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span>مهلت ویرایش:</span>
              <input
                type="number"
                min={1}
                max={72}
                value={invoiceSettings.editGracePeriodHours}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    editGracePeriodHours: Number(e.target.value) || 24,
                  })
                }
                className="w-14 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono font-bold"
              />
              <span>ساعت</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.logEditsInAudit}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, logEditsInAudit: e.target.checked })
                }
                className="rounded text-amber-600"
              />
              <span>☑ ثبت ویرایش در تاریخچه</span>
            </label>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">قوانین حذف:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.allowDelete}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, allowDelete: e.target.checked })
                }
                className="rounded text-amber-600"
              />
              <span>☑ اجازه حذف فاکتور</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.softDelete}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, softDelete: e.target.checked })
                }
                className="rounded text-amber-600"
              />
              <span>☑ نگه‌داشتن در تاریخچه (حذف نرم)</span>
            </label>
          </div>
        </div>

        {/* 3. نمایش اطلاعات در چاپ و خروجی */}
        <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">تنظیمات نمایش:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.showProfitInternal}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, showProfitInternal: e.target.checked })
                }
                className="rounded text-amber-600"
              />
              <span>☑ نمایش سود در فاکتور داخلی</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.showProfitCustomerPDF}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, showProfitCustomerPDF: e.target.checked })
                }
                className="rounded text-amber-600"
              />
              <span>☐ نمایش سود در PDF مشتری</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.showAccountBalance}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, showAccountBalance: e.target.checked })
                }
                className="rounded text-amber-600"
              />
              <span>☑ نمایش مانده حساب در فاکتور</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.showShopInfoInPDF}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, showShopInfoInPDF: e.target.checked })
                }
                className="rounded text-amber-600"
              />
              <span>☑ نمایش اطلاعات فروشگاه در PDF</span>
            </label>
          </div>
        </div>

        {/* 4. پیش‌فرض‌ها و هشدارها */}
        <div className="space-y-2 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">پیش‌فرض‌ها و هشدارها:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">مالیات پیش‌فرض:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={invoiceSettings.defaultTax}
                  onChange={(e) =>
                    setInvoiceSettings({ ...invoiceSettings, defaultTax: Number(e.target.value) || 0 })
                  }
                  className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
                />
                <span>٪</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">روش پرداخت پیش‌فرض:</span>
              <select
                value={invoiceSettings.defaultPaymentMethod}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    defaultPaymentMethod: e.target.value as PaymentMethod,
                  })
                }
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="cash">نقد</option>
                <option value="pos">دستگاه پوز</option>
                <option value="card_transfer">کارت به کارت</option>
                <option value="cheque">چک صیادی</option>
                <option value="credit">نسیه</option>
              </select>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.warnLowProfit}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, warnLowProfit: e.target.checked })
                }
                className="rounded text-amber-600"
              />
              <span>☑ هشدار سود کم (زیر {toPersianDigits(invoiceSettings.lowProfitThreshold)}٪)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.warnLowStock}
                onChange={(e) =>
                  setInvoiceSettings({ ...invoiceSettings, warnLowStock: e.target.checked })
                }
                className="rounded text-amber-600"
              />
              <span>☑ هشدار موجودی ناکافی هنگام صدور فاکتور</span>
            </label>
          </div>
        </div>

        <div className="pt-2 text-left border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors mr-auto"
          >
            <Save className="w-3.5 h-3.5" />
            <span>ذخیره تنظیمات فاکتور</span>
          </button>
        </div>
      </form>

      {/* 📡 Auto Pricing Settings (Part 3) */}
      <form onSubmit={handleSaveAutoPricingSettings} className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              📡 تنظیمات قیمت‌گذاری خودکار (ابزار رضا)
            </h3>
          </div>
          {autoPricingSaveSuccess && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>تنظیمات ذخیره شد!</span>
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          قوانین جستجو، استخراج قیمت از وب‌سایت abzarreza.com، فواصل بررسی دوره‌ای و حاشیه سود پیش‌فرض را تعیین کنید.
        </p>

        {/* 1. Supplier Configuration */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-amber-600" />
            <span>تأمین‌کننده (Supplier):</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">نوع قیمت پیش‌فرض:</label>
              <select
                value={autoPricingSettings.defaultPriceSource}
                onChange={(e) =>
                  setAutoPricingSettings({
                    ...autoPricingSettings,
                    defaultPriceSource: e.target.value as 'wholesale' | 'retail',
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="wholesale">قیمت عمده (پیش‌نهادی)</option>
                <option value="retail">قیمت تک (مصرف‌کننده)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">روش جستجو در سایت:</label>
              <select
                value={autoPricingSettings.searchMethod}
                onChange={(e) =>
                  setAutoPricingSettings({
                    ...autoPricingSettings,
                    searchMethod: e.target.value as 'code_first' | 'name_first' | 'only_code' | 'only_name',
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="code_first">کد اول، سپس نام (Code First)</option>
                <option value="name_first">نام اول، سپس کد (Name First)</option>
                <option value="only_code">فقط کد کالا (Only Code)</option>
                <option value="only_name">فقط نام کالا (Only Name)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">اولویت تطابق:</label>
              <select
                value={autoPricingSettings.matchPriority}
                onChange={(e) =>
                  setAutoPricingSettings({
                    ...autoPricingSettings,
                    matchPriority: e.target.value as 'exact' | 'fuzzy',
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="exact">دقیق‌ترین تطابق (Exact)</option>
                <option value="fuzzy">تطابق هوشمند و تقریبی (Fuzzy)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Update Configuration */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>به‌روزرسانی و زمان‌بندی (Update):</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">فاصله بررسی خودکار:</span>
              <select
                value={autoPricingSettings.autoCheckIntervalHours}
                onChange={(e) =>
                  setAutoPricingSettings({
                    ...autoPricingSettings,
                    autoCheckIntervalHours: Number(e.target.value),
                  })
                }
                className="px-2.5 py-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
              >
                <option value={1}>هر ۱ ساعت</option>
                <option value={3}>هر ۳ ساعت</option>
                <option value={6}>هر ۶ ساعت (استاندارد)</option>
                <option value={12}>هر ۱۲ ساعت</option>
                <option value={24}>هر ۲۴ ساعت (روزانه)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">حداقل فاصله بین دو بررسی:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={autoPricingSettings.minIntervalBetweenChecksSeconds}
                  onChange={(e) =>
                    setAutoPricingSettings({
                      ...autoPricingSettings,
                      minIntervalBetweenChecksSeconds: Number(e.target.value) || 30,
                    })
                  }
                  className="w-16 px-2 py-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
                />
                <span className="text-slate-500">ثانیه</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPricingSettings.autoUpdateEnabled}
                onChange={(e) =>
                  setAutoPricingSettings({ ...autoPricingSettings, autoUpdateEnabled: e.target.checked })
                }
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>بروزرسانی خودکار دوره‌ای در پس‌زمینه (ON)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPricingSettings.instantUpdateOnView}
                onChange={(e) =>
                  setAutoPricingSettings({ ...autoPricingSettings, instantUpdateOnView: e.target.checked })
                }
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>بروزرسانی لحظه‌ای هنگام مشاهده محصول (ON)</span>
            </label>
          </div>
        </div>

        {/* 3. Profit Configuration */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>محاسبه سود و فروش (Profit):</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">نوع سود پیش‌فرض:</label>
              <select
                value={autoPricingSettings.defaultProfitType}
                onChange={(e) =>
                  setAutoPricingSettings({
                    ...autoPricingSettings,
                    defaultProfitType: e.target.value as 'percent' | 'amount',
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="percent">درصدی (%)</option>
                <option value="amount">مقداری ثابت (تومان)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">مقدار سود پیش‌فرض:</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={autoPricingSettings.defaultProfitValue}
                  onChange={(e) =>
                    setAutoPricingSettings({
                      ...autoPricingSettings,
                      defaultProfitValue: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold tabular-nums"
                />
                <span className="text-slate-500">{autoPricingSettings.defaultProfitType === 'percent' ? '٪' : 'تومان'}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">گرد کردن قیمت فروش:</label>
              <select
                value={autoPricingSettings.roundToNearest}
                onChange={(e) =>
                  setAutoPricingSettings({
                    ...autoPricingSettings,
                    roundToNearest: Number(e.target.value),
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value={1000}>نزدیک‌ترین ۱,۰۰۰ تومان</option>
                <option value={5000}>نزدیک‌ترین ۵,۰۰۰ تومان</option>
                <option value={10000}>نزدیک‌ترین ۱۰,۰۰۰ تومان</option>
                <option value={0}>بدون گرد کردن</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Notification Configuration */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span>اعلان‌ها و هشدارها (Notification):</span>
          </span>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPricingSettings.notifyOnPriceChange}
                onChange={(e) =>
                  setAutoPricingSettings({ ...autoPricingSettings, notifyOnPriceChange: e.target.checked })
                }
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>اطلاع از تغییرات قیمت در اعلان‌ها (ON)</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400">حداقل درصد تغییر جهت هشدار:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0.5}
                  max={50}
                  step={0.5}
                  value={autoPricingSettings.alertThresholdPercent}
                  onChange={(e) =>
                    setAutoPricingSettings({
                      ...autoPricingSettings,
                      alertThresholdPercent: Number(e.target.value) || 2,
                    })
                  }
                  className="w-16 px-2 py-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold tabular-nums"
                />
                <span className="text-slate-500">٪</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Quick Test & Parser Diagnostics Tool (ابزار تست سریع و اعتبارسنجی پارسر) */}
        <AbzarrezaTester settings={autoPricingSettings} />

        {/* Batch action & Save footer */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleRunBatchUpdate}
            disabled={isBatchUpdating}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBatchUpdating ? 'animate-spin text-amber-600' : ''}`} />
            <span>{isBatchUpdating ? 'در حال استعلام دسته‌جمعی...' : '🔄 استعلام و بروزرسانی کلیه کالاهای ابزار رضا هم‌اکنون'}</span>
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>ذخیره تنظیمات قیمت‌گذاری</span>
          </button>
        </div>

        {/* Batch update result feedback */}
        {batchUpdateResult && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between flex-wrap gap-2">
            <span>نتیجه استعلام دسته‌جمعی ({toPersianDigits(batchUpdateResult.total)} کالا):</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {toPersianDigits(batchUpdateResult.updated)} بروزرسانی شد
              </span>
              <span className="text-slate-500">
                {toPersianDigits(batchUpdateResult.unchanged)} بدون تغییر
              </span>
              {batchUpdateResult.failed > 0 && (
                <span className="text-rose-500 font-bold">
                  {toPersianDigits(batchUpdateResult.failed)} ناموفق
                </span>
              )}
            </div>
          </div>
        )}
      </form>

      {/* ⚙️ تنظیمات نام و کد کالا (Part 3) */}
      <form onSubmit={handleSaveNameUniquenessSettings} className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">⚙️ تنظیمات نام و کد کالا</h3>
              <p className="text-[11px] text-slate-400">قواعد یکتایی، حساسیت به فاصله، حروف و نرمال‌سازی</p>
            </div>
          </div>
          {nameUniquenessSaveSuccess && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              <span>ذخیره شد!</span>
            </span>
          )}
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-3">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">📝 قواعد نام کالا:</span>

            <div className="space-y-1.5">
              <span className="font-medium text-slate-600 dark:text-slate-400">یکتایی:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="name_uniq"
                    checked={nameUniquenessSettings.globalNameUniqueness === 'unique'}
                    onChange={() => setNameUniquenessSettings({ ...nameUniquenessSettings, globalNameUniqueness: 'unique' })}
                    className="accent-amber-600"
                  />
                  <span>یکتا (بدون تکرار)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="name_uniq"
                    checked={nameUniquenessSettings.globalNameUniqueness === 'allow_duplicate'}
                    onChange={() => setNameUniquenessSettings({ ...nameUniquenessSettings, globalNameUniqueness: 'allow_duplicate' })}
                    className="accent-amber-600"
                  />
                  <span>تکرار مجاز</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="font-medium text-slate-600 dark:text-slate-400">حساسیت به حروف بزرگ/کوچک:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="name_case"
                    checked={nameUniquenessSettings.globalNameCaseSensitivity === 'case_insensitive'}
                    onChange={() => setNameUniquenessSettings({ ...nameUniquenessSettings, globalNameCaseSensitivity: 'case_insensitive' })}
                    className="accent-amber-600"
                  />
                  <span>غیرحساس (Screwdriver = screwdriver)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="name_case"
                    checked={nameUniquenessSettings.globalNameCaseSensitivity === 'case_sensitive'}
                    onChange={() => setNameUniquenessSettings({ ...nameUniquenessSettings, globalNameCaseSensitivity: 'case_sensitive' })}
                    className="accent-amber-600"
                  />
                  <span>حساس</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="font-medium text-slate-600 dark:text-slate-400">حساسیت به فاصله:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="name_space"
                    checked={nameUniquenessSettings.globalNameSpaceSensitivity === 'space_sensitive'}
                    onChange={() => setNameUniquenessSettings({ ...nameUniquenessSettings, globalNameSpaceSensitivity: 'space_sensitive' })}
                    className="accent-amber-600"
                  />
                  <span>مهم (پیچ گوشتی ≠ پیچگوشتی)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="name_space"
                    checked={nameUniquenessSettings.globalNameSpaceSensitivity === 'space_insensitive'}
                    onChange={() => setNameUniquenessSettings({ ...nameUniquenessSettings, globalNameSpaceSensitivity: 'space_insensitive' })}
                    className="accent-amber-600"
                  />
                  <span>مهم نیست</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="font-medium text-slate-600 dark:text-slate-400">حساسیت به نیم‌فاصله:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="name_halfspace"
                    checked={nameUniquenessSettings.globalNameHalfSpaceSensitivity === 'halfspace_insensitive'}
                    onChange={() => setNameUniquenessSettings({ ...nameUniquenessSettings, globalNameHalfSpaceSensitivity: 'halfspace_insensitive' })}
                    className="accent-amber-600"
                  />
                  <span>مهم نیست (پیچگوشتی = پیچ گوشتی)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="name_halfspace"
                    checked={nameUniquenessSettings.globalNameHalfSpaceSensitivity === 'halfspace_sensitive'}
                    onChange={() => setNameUniquenessSettings({ ...nameUniquenessSettings, globalNameHalfSpaceSensitivity: 'halfspace_sensitive' })}
                    className="accent-amber-600"
                  />
                  <span>مهم است</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="font-medium text-slate-600 dark:text-slate-400">نرمال‌سازی فارسی/عربی:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={nameUniquenessSettings.globalNamePersianNormalization}
                    onChange={(e) => setNameUniquenessSettings({ ...nameUniquenessSettings, globalNamePersianNormalization: e.target.checked })}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>فعال (ي = ی، ك = ک)</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="font-medium text-slate-600 dark:text-slate-400">نرمال‌سازی اعداد:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={nameUniquenessSettings.globalNameNumberNormalization}
                    onChange={(e) => setNameUniquenessSettings({ ...nameUniquenessSettings, globalNameNumberNormalization: e.target.checked })}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>فعال (۱۲۳ = 123)</span>
                </label>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic pt-2 border-t border-slate-100 dark:border-slate-800">
            💡 این تنظیمات برای همه کالاها اعمال می‌شوند. هر کالا می‌تواند قواعد اختصاصی خود را داشته باشد.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>ذخیره تنظیمات نام و کد</span>
          </button>
        </div>
      </form>

      {/* ⏰ تنظیمات انقضا (Expiry Settings Card - Part 4) */}
      <form onSubmit={handleSaveExpirySettings} className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">⏰ تنظیمات انقضا</h3>
              <p className="text-[11px] text-slate-400">مدیریت هشدارهای پیش‌فرض انقضای کالاها و بچ‌ها</p>
            </div>
          </div>
          {expirySaveSuccess && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              <span>ذخیره شد!</span>
            </span>
          )}
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={expirySettings.expiryEnabled}
              onChange={(e) => setExpirySettings({ ...expirySettings, expiryEnabled: e.target.checked })}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <span className="font-bold text-slate-800 dark:text-slate-200">فعال بودن هشدارهای انقضا</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">زمان بررسی روزانه:</label>
              <input
                type="text"
                value={expirySettings.dailyCheckTime}
                onChange={(e) => setExpirySettings({ ...expirySettings, dailyCheckTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                placeholder="08:00"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">📌 مقادیر پیش‌فرض (برای کالاهای جدید):</span>

            <div className="space-y-1.5">
              <label className="block text-slate-600 dark:text-slate-400 font-medium">هشدار پیش‌فرض قبل از انقضا:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={expirySettings.defaultExpiryWarningDays}
                  onChange={(e) => setExpirySettings({ ...expirySettings, defaultExpiryWarningDays: Number(e.target.value) || 30 })}
                  className="w-20 px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-bold"
                />
                <span>روز</span>
              </div>
              <div className="flex items-center gap-1 pt-1 flex-wrap">
                <span className="text-[11px] text-slate-400">انتخاب سریع:</span>
                {[7, 14, 30, 60, 90, 180].map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setExpirySettings({ ...expirySettings, defaultExpiryWarningDays: d })}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:bg-amber-50 hover:border-amber-300 transition-colors"
                  >
                    {toPersianDigits(d)} روز
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-slate-600 dark:text-slate-400 font-medium">هشدار بحرانی پیش‌فرض:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={expirySettings.defaultExpiryCriticalDays}
                  onChange={(e) => setExpirySettings({ ...expirySettings, defaultExpiryCriticalDays: Number(e.target.value) || 7 })}
                  className="w-20 px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-bold"
                />
                <span>روز</span>
              </div>
              <div className="flex items-center gap-1 pt-1 flex-wrap">
                <span className="text-[11px] text-slate-400">انتخاب سریع:</span>
                {[1, 3, 5, 7, 14, 30].map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setExpirySettings({ ...expirySettings, defaultExpiryCriticalDays: d })}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:bg-amber-50 hover:border-amber-300 transition-colors"
                  >
                    {toPersianDigits(d)} روز
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={expirySettings.defaultExpiryNotificationEnabled}
                onChange={(e) => setExpirySettings({ ...expirySettings, defaultExpiryNotificationEnabled: e.target.checked })}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>فعال بودن نوتیفیکیشن پیش‌فرض</span>
            </label>

            <p className="text-[11px] text-slate-500 italic">
              💡 این مقادیر روی کالاهای جدید اعمال می‌شوند. هر کالا می‌تواند مقدار خودش را داشته باشد.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">ارسال نوتیفیکیشن:</span>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={expirySettings.sendPushNotification}
                  onChange={(e) => setExpirySettings({ ...expirySettings, sendPushNotification: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Push Notification</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={expirySettings.sendInAppNotification}
                  onChange={(e) => setExpirySettings({ ...expirySettings, sendInAppNotification: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>In-App</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={expirySettings.soundEnabled}
                  onChange={(e) => setExpirySettings({ ...expirySettings, soundEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>صدا</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">🌙 ساعات سکوت:</span>
            <div className="flex items-center gap-2">
              <span>از</span>
              <input
                type="text"
                value={expirySettings.quietHoursStart}
                onChange={(e) => setExpirySettings({ ...expirySettings, quietHoursStart: e.target.value })}
                className="w-24 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-center text-xs"
              />
              <span>تا</span>
              <input
                type="text"
                value={expirySettings.quietHoursEnd}
                onChange={(e) => setExpirySettings({ ...expirySettings, quietHoursEnd: e.target.value })}
                className="w-24 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-center text-xs"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>ذخیره تنظیمات انقضا</span>
          </button>
        </div>
      </form>

      {/* 🏷️ Customer Groups Section in Settings */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <CustomerGroupsSettings currentUser={currentUser} />
      </div>

      {/* Backup and Data Management */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Download className="w-4 h-4 text-emerald-500" />
          <span>دانلود و ذخیره فایل اجرایی روی کامپیوتر</span>
        </h3>

        {/* PWABuilder Link Box */}
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                لینک برنامه جهت ساخت فایل APK در PWABuilder:
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={sharedAppUrl}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 ltr select-all focus:outline-none"
            />
            <button
              onClick={handleCopyUrl}
              className="min-h-[38px] px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              {urlCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{urlCopied ? 'کپی شد!' : 'کپی لینک'}</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            این لینک را در سایت <span className="font-mono text-amber-700 dark:text-amber-300">PWABuilder.com</span> در کادر ورودی پیست (Paste) کنید و روی دکمه <span className="font-bold">Start</span> بزنید تا فایل نصبی APK برای گوشی شما ساخته شود.
          </p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs space-y-2 border border-slate-200/70 dark:border-slate-700/60 leading-relaxed">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            برای اجرای برنامه روی کامپیوتر یا ساخت فایل نصبی (APK):
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
            <li>
              <strong>اجرا مانند نرم‌افزار ویندوز:</strong> در مرورگر Chrome یا Edge روی علامت نصب (Install) در نوار آدرس کلیک کنید تا برنامه به عنوان نرم‌افزار دسکتاپ مستقل با آیکون اختصاصی نصب شود و کاملاً آفلاین کار کند.
            </li>
            <li>
              <strong>خروجی APK برای اندروید:</strong> از دکمه سبز بالای همین صفحه کدهای کاتلین را کپی کرده و در Android Studio با گزینه <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">Build &gt; Build APK</span> خروجی APK را دریافت کنید.
            </li>
            <li>
              <strong>اجرای محلی با Node.js:</strong> کدهای این پروژه را دانلود کرده و با اجرای <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">npm run dev</span> روی کامپیوتر اجرا نمایید.
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleExportBackup}
            className="w-full min-h-[42px] px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700"
          >
            {exportSuccess ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Download className="w-4 h-4" />}
            <span>{exportSuccess ? 'فایل اطلاعات دانلود شد!' : 'دانلود نسخه پشتیبان انبار و کالاها (JSON)'}</span>
          </button>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full min-h-[42px] px-3 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-rose-200 dark:border-rose-900"
            >
              <RotateCcw className="w-4 h-4" />
              <span>بازنشانی به داده‌های نمونه اولیه (۱۰ ابزار)</span>
            </button>
          ) : (
            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl space-y-2 text-center">
              <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                آیا از بازنشانی داده‌ها اطمینان دارید؟
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 rounded-lg text-xs"
                >
                  انصراف
                </button>
                <button
                  onClick={() => {
                    onResetData();
                    setConfirmReset(false);
                  }}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold"
                >
                  بله، بازنشانی شود
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { StorageService } from '../services/storageService';

// یادآوری ثابت تا وقتی کاربر بازه‌های قیمت خرید را خودش تنظیم کند
export const ProfitBandsReminder: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  if (!StorageService.advancedPricingEnabled() || StorageService.profitBandsCustomized()) return null;
  return (
    <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2" dir="rtl">
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <p className="text-xs font-bold">بازه‌های سود هنوز پیش‌فرض هستند</p>
        <p className="text-[11px]">
          خرید ۱٬۰۰۰ تا ۱۰٬۰۰۰ تومان: ۵۰٪ سود، و بالای ۱۰٬۰۰۰: ۳۰٪ سود. لطفاً این اعداد را بر اساس فروشگاه خودت تنظیم کن.
        </p>
        <button type="button" onClick={onOpen} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold">
          تنظیم بازه‌ها
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { Package, FileText, Layers, BarChart3, Bell, Settings, Clock, Users, Truck } from 'lucide-react';
import { toPersianDigits } from '../utils/jalali';

export type NavTab =
  | 'products'
  | 'goods_receipt'
  | 'location_report'
  | 'tags'
  | 'price_import'
  | 'categories'
  | 'invoices'
  | 'customers'
  | 'analytics'
  | 'history'
  | 'notifications'
  | 'settings'
  | 'expiry_alerts'
  | 'expiry_reports'
  | 'debt_reports';

interface Props {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  unreadNotificationsCount: number;
}

export const BottomNav: React.FC<Props> = ({
  activeTab,
  onChangeTab,
  unreadNotificationsCount,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'products', label: 'محصولات', icon: Package },
    { id: 'goods_receipt', label: 'ورود کالا', icon: Truck },
    { id: 'invoices', label: 'فاکتورها', icon: FileText },
    { id: 'customers', label: 'مخاطبین', icon: Users },
    { id: 'expiry_alerts', label: 'انقضاها', icon: Clock },
    { id: 'categories', label: 'دسته‌ها', icon: Layers },
    { id: 'analytics', label: 'آمار', icon: BarChart3 },
    { id: 'settings', label: 'تنظیمات', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
      <div className="max-w-md mx-auto grid grid-cols-8 items-center h-16 px-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative min-h-[48px] flex flex-col items-center justify-center transition-colors py-1 ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {tab.id === 'notifications' && unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white dark:ring-slate-900">
                    {toPersianDigits(unreadNotificationsCount > 9 ? '+9' : unreadNotificationsCount)}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 bg-amber-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};


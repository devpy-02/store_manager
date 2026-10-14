import React from 'react';
import { Wrench, Wifi, WifiOff, Bell, Smartphone, Monitor } from 'lucide-react';
import { User, SyncStatus } from '../types';
import { toPersianDigits } from '../utils/jalali';

interface Props {
  currentUser: User;
  syncStatus: SyncStatus;
  unreadCount: number;
  onOpenUserSwitch: () => void;
  onToggleOffline: () => void;
  onNavigateToNotifications: () => void;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
}

export const Header: React.FC<Props> = ({
  currentUser,
  syncStatus,
  unreadCount,
  onOpenUserSwitch,
  onToggleOffline,
  onNavigateToNotifications,
  isMobileFrame,
  onToggleFrame,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        {/* Brand & Shop Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-white truncate flex items-center gap-1.5">
              <span>فروشگاه ابزار حامی</span>
            </h1>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>مدیریت انبار و قیمت</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400/90 font-medium">نسخه اندروید</span>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Online/Offline status button (functional toggle) */}
          <button
            onClick={onToggleOffline}
            title={syncStatus.isOnline ? 'کلیک جهت تست حالت آفلاین' : 'کلیک جهت بازگشت به حالت آنلاین'}
            className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              syncStatus.isOnline
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-rose-950/50 border-rose-600/70 text-rose-300 hover:bg-rose-900/60 animate-pulse'
            }`}
          >
            {syncStatus.isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
                <span>آنلاین</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>آفلاین</span>
                {syncStatus.pendingChangesCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] px-1 rounded">
                    {toPersianDigits(syncStatus.pendingChangesCount)}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Current User Quick Switcher */}
          <button
            onClick={onOpenUserSwitch}
            className="min-h-[38px] px-2 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg flex items-center gap-1.5 text-xs text-slate-200 transition-colors"
            title="تغییر کاربر (پدر / پسر / فروشنده)"
          >
            <span className={`w-6 h-6 rounded-md ${currentUser.avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
              {currentUser.name.charAt(0)}
            </span>
            <span className="hidden sm:inline font-medium max-w-[80px] truncate">
              {currentUser.name.split(' ')[0]}
            </span>
          </button>

          {/* Notification Bell */}
          <button
            onClick={onNavigateToNotifications}
            className="relative min-w-[38px] min-h-[38px] rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center justify-center text-slate-200 transition-colors"
            title="اعلان‌ها و هشدارها"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                {toPersianDigits(unreadCount > 9 ? '+9' : unreadCount)}
              </span>
            )}
          </button>

          {/* Viewport Frame Toggle (Mobile / Fullscreen) */}
          <button
            onClick={onToggleFrame}
            className="hidden lg:flex min-w-[38px] min-h-[38px] rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 items-center justify-center text-slate-300 transition-colors"
            title={isMobileFrame ? 'نمایش در حالت تمام‌صفحه' : 'نمایش در قاب گوشی اندروید'}
          >
            {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

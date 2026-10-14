import React from 'react';
import { AppNotification } from '../types';
import { formatPersianDateTime, timeAgoPersian } from '../utils/jalali';
import { Bell, CheckCheck, Trash2, TrendingUp, AlertTriangle, Info, BellRing } from 'lucide-react';

interface Props {
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationsView: React.FC<Props> = ({
  notifications,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const [permissionState, setPermissionState] = React.useState<NotificationPermission | 'unsupported'>('default');

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    } else {
      setPermissionState('unsupported');
    }
  }, []);

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPermissionState(perm);
      } catch {
        // Ignore
      }
    }
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'price_change':
        return <TrendingUp className="w-4 h-4 text-amber-500" />;
      case 'stock_change':
        return <AlertTriangle className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-emerald-500" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <span>مرکز اعلان‌ها و هشدارها</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            اطلاع‌رسانی فوری تغییرات قیمت و موجودی توسط پدر و پسر
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="min-h-[36px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                title="علامت‌گذاری همه به عنوان خوانده شده"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">خوانده شدند</span>
              </button>
            )}
            <button
              onClick={onClearAll}
              className="min-h-[36px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-rose-600 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="پاک کردن همه اعلان‌ها"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Push Notification Permission Box */}
      {permissionState !== 'granted' && permissionState !== 'unsupported' && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">
                فعال‌سازی نوتیفیکیشن اندروید
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                دریافت اعلان مستقیم هنگام تغییر قیمت توسط همکار
              </p>
            </div>
          </div>
          <button
            onClick={requestPushPermission}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shrink-0 shadow-xs"
          >
            فعال‌سازی
          </button>
        </div>
      )}

      {/* Notifications list */}
      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              هیچ اعلان جدیدی وجود ندارد
            </p>
            <p className="text-xs text-slate-400 mt-1">
              هنگامی که پدر یا پسر قیمتی را تغییر دهد، اعلان فوری اینجا ظاهر می‌شود.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                !n.read
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/70 dark:border-amber-800/60 shadow-xs'
                  : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {n.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {timeAgoPersian(n.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {n.body}
                  </p>

                  <div className="text-[10px] text-slate-400 mt-2">
                    {formatPersianDateTime(n.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

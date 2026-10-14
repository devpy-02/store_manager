import React from 'react';
import { AppNotification } from '../types';
import { Bell, X, TrendingUp, AlertTriangle } from 'lucide-react';
import { timeAgoPersian } from '../utils/jalali';

interface Props {
  notification: AppNotification | null;
  onDismiss: () => void;
  onView: () => void;
}

export const InAppNotificationToast: React.FC<Props> = ({
  notification,
  onDismiss,
  onView,
}) => {
  if (!notification) return null;

  return (
    <div className="fixed top-12 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-amber-500/40 backdrop-blur-md flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          {notification.type === 'price_change' ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-bold text-amber-400 truncate">
              {notification.title}
            </h4>
            <span className="text-[10px] text-slate-400">
              {timeAgoPersian(notification.createdAt)}
            </span>
          </div>
          <p className="text-xs text-slate-200 mt-0.5 leading-snug line-clamp-2">
            {notification.body}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

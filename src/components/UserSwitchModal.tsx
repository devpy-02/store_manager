import React, { useState } from 'react';
import { User } from '../types';
import { X, Check, ShieldCheck, UserCheck, Phone, LogOut } from 'lucide-react';

interface Props {
  users: User[];
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
  onLogout: () => void;
}

export const UserSwitchModal: React.FC<Props> = ({
  users,
  currentUser,
  isOpen,
  onClose,
  onSelectUser,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              تغییر حساب کاربری (پدر / پسر)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              برای آزمایش نوتیفیکیشن‌ها و همگام‌سازی، کاربر را تغییر دهید
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User list */}
        <div className="p-4 space-y-2.5 overflow-y-auto">
          {users.map((user) => {
            const isSelected = user.id === currentUser.id;
            return (
              <button
                key={user.id}
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-right flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl ${user.avatarColor} text-white flex items-center justify-center font-bold text-base shadow-xs`}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {user.name}
                      </h3>
                      {user.role === 'admin' ? (
                        <span className="text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                          مدیر کل (Admin)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600 bg-slate-200 dark:bg-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium">
                          فروشنده (Seller)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{user.title}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] ltr">{user.phone}</span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            onClick={onLogout}
            className="w-full min-h-[44px] px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج از حساب و ورود با شماره دیگر</span>
          </button>
        </div>
      </div>
    </div>
  );
};

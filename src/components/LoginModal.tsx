import React, { useState } from 'react';
import { User } from '../types';
import { Wrench, Phone, Lock, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { toEnglishDigits } from '../utils/jalali';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
}

export const LoginModal: React.FC<Props> = ({ users, onLogin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = toEnglishDigits(phone).trim();
    const user = users.find((u) => u.phone === cleanPhone);
    if (!user) {
      setError('کاربری با این شماره تلفن یافت نشد.');
      return;
    }
    onLogin(user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        {/* Logo and Shop Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-md">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-slate-100">
            فروشگاه ابزار حامی
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ورود به سامانه انبار و قیمت‌گذاری چندکاربره (آفلاین / آنلاین)
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              شماره تلفن همراه:
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError('');
                }}
                placeholder="۰۹۱۲۱۱۱۲۲۳۳"
                className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ltr text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              رمز عبور یا کد ورود:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ltr text-left"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] mt-2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-600/20"
          >
            <span>ورود به برنامه</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Login */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 text-center mb-2.5">
            یا انتخاب سریع حساب جهت ورود:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onLogin(users[0])}
              className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex flex-col items-center gap-1 hover:bg-emerald-100/50 transition-colors"
            >
              <span>حاج آقا حامی</span>
              <span className="text-[10px] text-emerald-600 font-normal">پدر (مدیر کل)</span>
            </button>

            <button
              type="button"
              onClick={() => onLogin(users[1])}
              className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 text-xs font-bold flex flex-col items-center gap-1 hover:bg-blue-100/50 transition-colors"
            >
              <span>محمد حامی</span>
              <span className="text-[10px] text-blue-600 font-normal">پسر (مدیر فروش)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

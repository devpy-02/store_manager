import React, { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BackupFile, downloadBackup, lastBackupAt, parseBackup, restoreBackup, storageSizeKb } from '../utils/backup';
import { toPersianDigits } from '../utils/jalali';

// بخش پشتیبان‌گیری در تنظیمات: ذخیره‌ی همه‌ی داده‌ها در یک فایل و بازیابی از آن
export const BackupSection: React.FC = () => {
  const [lastAt, setLastAt] = useState<string | null>(lastBackupAt());
  const [sizeKb] = useState<number>(storageSizeKb());
  const [pending, setPending] = useState<{ name: string; backup: BackupFile } | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    setError('');
    const b = downloadBackup();
    setLastAt(b.exportedAt);
    setMsg(`پشتیبان ساخته شد (${toPersianDigits(b.keyCount)} بخش داده).`);
  };

  const onFile = async (file: File | undefined) => {
    setError('');
    setMsg('');
    setPending(null);
    if (!file) return;
    const text = await file.text();
    const r = parseBackup(text);
    if (!r.ok) {
      setError(r.reason || 'فایل نامعتبر است.');
      return;
    }
    setPending({ name: file.name, backup: r.backup as BackupFile });
  };

  const restore = () => {
    if (!pending) return;
    const n = restoreBackup(pending.backup);
    setPending(null);
    setMsg(`بازیابی انجام شد (${toPersianDigits(n)} بخش). برنامه دوباره باز می‌شود.`);
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <section className="space-y-3 bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">پشتیبان‌گیری و بازیابی</h3>
      <p className="text-[11px] text-slate-500">
        همه‌ی داده‌های برنامه (کالا، فاکتور، انبار، تگ، مشتری و تنظیمات) در یک فایل ذخیره می‌شوند.
        حجم فعلی داده‌ها: {toPersianDigits(sizeKb)} کیلوبایت.
      </p>
      <p className="text-[11px] text-slate-500">
        آخرین پشتیبان: {lastAt ? new Date(lastAt).toLocaleString('fa-IR') : 'هنوز گرفته نشده'}
      </p>

      <button type="button" onClick={save} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold">
        <Download className="w-4 h-4" />
        ذخیره پشتیبان (فایل JSON)
      </button>

      <div className="space-y-2">
        <label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900 text-xs font-bold cursor-pointer">
          <Upload className="w-4 h-4" />
          انتخاب فایل پشتیبان برای بازیابی
          <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>

        {pending && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[11px] space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-700">بازیابی، داده‌های فعلی را کامل جایگزین می‌کند.</p>
                <p>فایل: {pending.name} · ساخته‌شده: {new Date(pending.backup.exportedAt).toLocaleString('fa-IR')} · {toPersianDigits(pending.backup.keyCount)} بخش</p>
                <p className="text-slate-600 dark:text-slate-300">اگر داده‌های فعلی مهم است، اول پشتیبان فعلی را بگیر.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPending(null)} className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold">انصراف</button>
              <button type="button" onClick={restore} className="flex-1 py-2 rounded-lg bg-rose-600 text-white font-bold">بازیابی و جایگزینی</button>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{msg}</span>
        </div>
      )}
      {error && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg">{error}</p>}
    </section>
  );
};

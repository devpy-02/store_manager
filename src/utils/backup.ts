// پشتیبان‌گیری و بازیابی کامل داده‌ها در یک فایل JSON
// همه‌ی کلیدهای برنامه با پیشوند hami_tools_ ذخیره می‌شوند.

const PREFIX = 'hami_tools_';
const APP_ID = 'hami-tools-backup';
const FORMAT_VERSION = 1;
const LAST_BACKUP_KEY = 'hami_last_backup_v1';

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  keyCount: number;
  data: Record<string, string>;
}

/** همه‌ی داده‌های برنامه را جمع می‌کند */
export function createBackup(): BackupFile {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    }
  }
  return {
    app: APP_ID,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    keyCount: Object.keys(data).length,
    data,
  };
}

/** نام فایل: hami-backup-۲۰۲۶-۱۰-۱۲-۱۴۳۰.json */
export function backupFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `hami-backup-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}.json`;
}

/** دانلود فایل پشتیبان */
export function downloadBackup(): BackupFile {
  const backup = createBackup();
  const json = JSON.stringify(backup);
  const name = backupFileName();
  const bridge = (window as any).AndroidBridge;
  if (bridge && typeof bridge.saveTextFile === 'function') {
    // داخل اپ اندروید: فایل مستقیم در پوشه‌ی Downloads ذخیره می‌شود
    bridge.saveTextFile(name, 'application/json', json);
  } else {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  localStorage.setItem(LAST_BACKUP_KEY, backup.exportedAt);
  return backup;
}

export function lastBackupAt(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY);
}

/** حجم تقریبی داده‌های برنامه به کیلوبایت (هر کاراکتر حدود ۲ بایت) */
export function storageSizeKb(): number {
  let chars = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) chars += (localStorage.getItem(key) || '').length + key.length;
  }
  return Math.round((chars * 2) / 1024);
}

/** خواندن و اعتبارسنجی فایل. قبل از هر تغییری، همه‌ی بررسی‌ها انجام می‌شود. */
export function parseBackup(text: string): { ok: boolean; reason?: string; backup?: BackupFile } {
  let obj: any;
  try {
    obj = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'فایل JSON معتبر نیست.' };
  }
  if (!obj || obj.app !== APP_ID) return { ok: false, reason: 'این فایل پشتیبان ابزار حامی نیست.' };
  if (obj.version !== FORMAT_VERSION) return { ok: false, reason: 'نسخه‌ی این پشتیبان با برنامه سازگار نیست.' };
  if (!obj.data || typeof obj.data !== 'object') return { ok: false, reason: 'داده‌ای در فایل پیدا نشد.' };
  const keys = Object.keys(obj.data);
  if (keys.length === 0) return { ok: false, reason: 'فایل خالی است.' };
  for (const k of keys) {
    if (!k.startsWith(PREFIX) || typeof obj.data[k] !== 'string') {
      return { ok: false, reason: 'ساختار داده‌های فایل درست نیست.' };
    }
  }
  return { ok: true, backup: obj as BackupFile };
}

/** جایگزین کردن همه‌ی داده‌های برنامه با داده‌های پشتیبان. تعداد کلیدهای بازیابی‌شده را برمی‌گرداند. */
export function restoreBackup(backup: BackupFile): number {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) toRemove.push(key);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
  let n = 0;
  Object.entries(backup.data).forEach(([k, v]) => {
    localStorage.setItem(k, v);
    n++;
  });
  return n;
}

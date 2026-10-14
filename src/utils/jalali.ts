/**
 * Jalali (Shamsi) Date & Persian formatting utilities
 */

// Convert Gregorian to Jalali (Solar Hijri)
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

const persianMonthNames = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/**
 * Format a timestamp into Persian Shamsi date string
 * Example: ۱۶ مهر ۱۴۰۳ - ساعت ۱۴:۳۰
 */
export function formatPersianDateTime(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'نامشخص';

  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  const monthName = persianMonthNames[jm - 1] || '';
  const dateStr = `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
  const timeStr = `${toPersianDigits(hours)}:${toPersianDigits(minutes)}`;

  return `${dateStr} · ${timeStr}`;
}

export function formatPersianDateShort(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'نامشخص';

  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${toPersianDigits(jy)}/${toPersianDigits(jm.toString().padStart(2, '0'))}/${toPersianDigits(jd.toString().padStart(2, '0'))}`;
}

/**
 * Convert English digits to Persian digits
 */
export function toPersianDigits(value: string | number): string {
  if (value === undefined || value === null) return '';
  const str = value.toString();
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

/**
 * Convert Persian/Arabic digits to English digits
 */
export function toEnglishDigits(value: string): string {
  if (!value) return '';
  return value
    .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString())
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
}

/**
 * Format currency in Toman with thousand separator and Persian digits
 * Example: 2500000 -> ۲,۵۰۰,۰۰۰ تومان
 */
export function formatToman(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '۰ تومان';

  const parsed = typeof amount === 'string' ? parseInt(toEnglishDigits(amount), 10) : amount;

  if (typeof parsed !== 'number' || isNaN(parsed)) return '۰ تومان';

  const formatted = parsed.toLocaleString('en-US');
  return `${toPersianDigits(formatted)} تومان`;
}

/**
 * Clean numeric string with commas for input fields
 */
export function formatNumberWithCommas(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '';
  const clean = toEnglishDigits(val.toString()).replace(/[^0-9]/g, '');
  if (!clean) return '';
  const num = parseInt(clean, 10);
  if (isNaN(num)) return '';
  return toPersianDigits(num.toLocaleString('en-US'));
}

/**
 * Relative time in Persian (چند لحظه پیش، ۵ دقیقه پیش، ۲ ساعت پیش)
 */
export function timeAgoPersian(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 45) return 'همین الان';
  if (diffSec < 90) return '۱ دقیقه پیش';
  if (diffSec < 3600) return `${toPersianDigits(Math.floor(diffSec / 60))} دقیقه پیش`;
  if (diffSec < 7200) return '۱ ساعت پیش';
  if (diffSec < 86400) return `${toPersianDigits(Math.floor(diffSec / 3600))} ساعت پیش`;
  if (diffSec < 172800) return 'دیروز';
  if (diffSec < 604800) return `${toPersianDigits(Math.floor(diffSec / 86400))} روز پیش`;

  return formatPersianDateShort(dateInput);
}

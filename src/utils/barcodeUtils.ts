// EAN-13: تولید و اعتبارسنجی بارکد، و ساخت SVG برای چاپ. بدون کتابخانه‌ی خارجی.

// الگوهای استاندارد EAN-13
const L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G_CODES = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R_CODES = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
// الگوی پاریتی ارقام ۲ تا ۷ بر اساس رقم اول
const FIRST_DIGIT_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** رقم کنترلی از ۱۲ رقم اول */
export function ean13CheckDigit(base12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(base12[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

/** آیا ۱۳ رقم با رقم کنترلی درست است؟ */
export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  return ean13CheckDigit(code.slice(0, 12)) === code[12];
}

/**
 * بارکد داخلی: پیشوند ۲۰۰ (محدوده‌ی آزاد GS1 برای استفاده‌ی داخلی فروشگاه)
 * به‌همراه ۹ رقم شماره‌ی ترتیبی و رقم کنترلی.
 */
export function buildInternalEan13(sequence: number): string {
  const base = '200' + String(sequence).padStart(9, '0');
  return base + ean13CheckDigit(base);
}

/** SVG بارکد EAN-13 با اعداد زیر آن. اگر کد نامعتبر باشد، رشته‌ی خالی برمی‌گرداند. */
export function buildEan13Svg(code: string): string {
  if (!isValidEan13(code)) return '';

  const parity = FIRST_DIGIT_PARITY[Number(code[0])];
  let bits = '101';
  for (let i = 1; i <= 6; i++) {
    const d = Number(code[i]);
    bits += parity[i - 1] === 'L' ? L_CODES[d] : G_CODES[d];
  }
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R_CODES[Number(code[i])];
  bits += '101';

  const quiet = 11; // حاشیه‌ی سفید سمت چپ (بر حسب ماژول)
  const rects: string[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== '1') continue;
    const isGuard = i < 3 || (i >= 45 && i < 50) || i >= 92;
    const h = isGuard ? 62 : 54;
    rects.push(`<rect x="${quiet + i}" y="2" width="1" height="${h}"/>`);
  }

  const texts: string[] = [];
  texts.push(`<text x="5.5" y="68" font-size="8" text-anchor="middle">${code[0]}</text>`);
  for (let i = 0; i < 6; i++) {
    texts.push(`<text x="${quiet + 3 + 3.5 + i * 7}" y="68" font-size="8" text-anchor="middle">${code[i + 1]}</text>`);
  }
  for (let i = 0; i < 6; i++) {
    texts.push(`<text x="${quiet + 50 + 3.5 + i * 7}" y="68" font-size="8" text-anchor="middle">${code[i + 7]}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 113 72" width="100%" font-family="monospace">` +
    `<rect width="113" height="72" fill="#fff"/>` +
    `<g fill="#000" shape-rendering="crispEdges">${rects.join('')}</g>` +
    `<g fill="#000">${texts.join('')}</g>` +
    `</svg>`;
}

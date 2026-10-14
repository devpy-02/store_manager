// تحلیل متن لیست قیمت تامین‌کننده و تطبیق آن با کالاهای انبار

export interface PriceListRow {
  code: string;
  name: string;
  wholesale: number | null; // قیمت عمده (قیمت خرید)
  minQty: number | null; // حداقل تعداد برای قیمت عمده
  retail: number | null; // قیمت تک (مرجع)
  duplicate: boolean;    // کد تکراری در همین فایل
}

export type MatchStatus = 'exact' | 'sure' | 'maybe' | 'none';

export interface MatchResult {
  row: PriceListRow;
  productId: string | null;
  score: number;
  status: MatchStatus;
}

// حذف نشانه‌های جهت‌نما و نیم‌فاصله، و تبدیل اعداد فارسی/عربی به لاتین
export function cleanText(s: string): string {
  return s
    .replace(/[\u200c\u200d\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

const toNum = (s: string) => Number(s.replace(/,/g, ''));

/** خطوط خام PDF را به ردیف‌های کالا تبدیل می‌کند */
export function parsePriceListLines(lines: string[]): PriceListRow[] {
  const rows: PriceListRow[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = cleanText(raw).replace(/\s+/g, ' ');
    const codeM = /کد\s*(\d{3,7})\s*:?/.exec(line);
    const whM = /عمده\s*([\d,]+)\s*:?/.exec(line);
    if (!codeM || !whM) continue;
    const retM = /تک\s*([\d,]+)\s*:?/.exec(line);
    const qtyM = /خرید باالی\s*(\d+)\s*عدد/.exec(line);
    const afterPrice = Math.max(
      whM.index + whM[0].length,
      retM ? retM.index + retM[0].length : 0
    );
    const name = line.slice(afterPrice, codeM.index).replace(/[:|]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name) continue;
    const code = codeM[1];
    rows.push({
      code,
      name,
      wholesale: toNum(whM[1]),
      minQty: qtyM ? Number(qtyM[1]) : null,
      retail: retM ? toNum(retM[1]) : null,
      duplicate: seen.has(code),
    });
    seen.add(code);
  }
  return rows;
}

/** نرمال‌سازی نام برای مقایسه */
export function normalizeName(s: string): string {
  return cleanText(s)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ۀ/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// شباهت Dice روی کلمات: بین ۰ و ۱
export function similarity(a: string, b: string): number {
  const A = new Set(normalizeName(a).split(' ').filter(Boolean));
  const B = new Set(normalizeName(b).split(' ').filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  let score = (2 * inter) / (A.size + B.size);
  // اگر عددهای دو نام (سایز، تعداد، ابعاد) فرق دارند، تطبیق مطمئن نیست
  const numsA = [...A].filter((t) => /\d/.test(t)).sort().join(' ');
  const numsB = [...B].filter((t) => /\d/.test(t)).sort().join(' ');
  if ((numsA || numsB) && numsA !== numsB) score *= 0.6;
  return score;
}

/** تطبیق ردیف‌ها با کالاهای انبار: اول کد دقیق، بعد نام */
export function matchRows(
  rows: PriceListRow[],
  products: { id: string; name: string; code?: string; supplierCode?: string; deleted?: boolean }[]
): MatchResult[] {
  const active = products.filter((p) => !p.deleted);
  const byCode = new Map<string, string>();
  active.forEach((p) => { if (p.supplierCode) byCode.set(cleanText(p.supplierCode).trim(), p.id); if (p.code) byCode.set(cleanText(p.code).trim(), p.id); });

  return rows.map((row) => {
    const exactId = byCode.get(cleanText(row.code).trim());
    if (exactId) return { row, productId: exactId, score: 1, status: 'exact' as MatchStatus };
    let bestId: string | null = null;
    let bestScore = 0;
    for (const p of active) {
      const score = similarity(row.name, p.name);
      if (score > bestScore) { bestScore = score; bestId = p.id; }
    }
    if (!bestId || bestScore < 0.5) return { row, productId: null, score: bestScore, status: 'none' as MatchStatus };
    return {
      row,
      productId: bestId,
      score: bestScore,
      status: (bestScore >= 0.8 ? 'sure' : 'maybe') as MatchStatus,
    };
  });
}


/** خواندن ردیف‌های فایل Excel/CSV با تشخیص نام ستون‌ها به فارسی یا انگلیسی */
export async function parseSpreadsheetFile(file: File): Promise<PriceListRow[]> {
  const XLSX = await import('xlsx');
  const isCsv = file.name.toLowerCase().endsWith('.csv');
  const data = isCsv ? await file.text() : await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: isCsv ? 'string' : 'array', raw: false, cellDates: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  const sheet = workbook.Sheets[firstSheet];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
  const normalizeHeader = (v: unknown) => normalizeName(cleanText(String(v ?? ''))).replace(/تومان|ریال|تومانی|ریالی/g, '').replace(/[\s_\-]/g, '');
  const aliases = {
    code: ['کد', 'کدکالا', 'کدتامینکننده', 'کدکالای تامینکننده', 'suppliercode', 'productcode', 'itemcode', 'sku', 'code'],
    name: ['نام', 'نامکالا', 'شرح', 'شرحکالا', 'عنوان', 'productname', 'itemname', 'name', 'description', 'title'],
    buy: ['قیمتخرید', 'قیمتعمده', 'عمده', 'خرید', 'wholesale', 'wholesaleprice', 'buyprice', 'purchaseprice', 'cost', 'costprice'],
    sell: ['قیمتفروش', 'قیمتتک', 'تک', 'خرده', 'فروش', 'retail', 'retailprice', 'sellprice', 'saleprice', 'price'],
  };
  const findCol = (headers: string[], names: string[]) => headers.findIndex((h) => names.includes(h));
  let headerRow = -1;
  let cols = { code: -1, name: -1, buy: -1, sell: -1 };
  for (let r = 0; r < Math.min(matrix.length, 20); r++) {
    const headers = (matrix[r] || []).map(normalizeHeader);
    const candidate = {
      code: findCol(headers, aliases.code),
      name: findCol(headers, aliases.name),
      buy: findCol(headers, aliases.buy),
      sell: findCol(headers, aliases.sell),
    };
    if ((candidate.name >= 0 || candidate.code >= 0) && (candidate.buy >= 0 || candidate.sell >= 0 || candidate.name >= 0)) {
      headerRow = r;
      cols = candidate;
      break;
    }
  }
  if (headerRow < 0) throw new Error('سطر عنوان ستون‌ها پیدا نشد. ستون نام کالا یا کد و ستون قیمت را مشخص کن.');
  const readNum = (v: unknown): number | null => {
    const raw = cleanText(String(v ?? '')).replace(/[٬،,\s]/g, '').replace(/[^0-9.\-]/g, '');
    if (!raw || raw === '-' || raw === '.') return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  const rows: PriceListRow[] = [];
  const seen = new Set<string>();
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    const at = (idx: number) => idx >= 0 ? String(line[idx] ?? '').trim() : '';
    const name = at(cols.name);
    const code = cleanText(at(cols.code)).replace(/\s/g, '');
    const wholesale = readNum(at(cols.buy));
    const retail = readNum(at(cols.sell));
    if (!name && !code) continue;
    // ردیف‌های صرفاً نام/کد هم برای حالت محاسبهٔ قیمت فروش از سود کالا معتبرند.
    const rowCode = code || `ROW${r + 1}`;
    rows.push({ code: rowCode, name: name || `کد ${rowCode}`, wholesale, minQty: null, retail, duplicate: seen.has(rowCode) });
    seen.add(rowCode);
  }
  return rows;
}

import * as pdfjsLib from 'pdfjs-dist';

// فایل کارگر pdf.js را از همان پکیج می‌گیرد
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// استخراج خطوط متنی PDF: هر خط از کنار هم گذاشتن قطعات هم‌ارتفاع ساخته می‌شود
export async function extractPdfLines(file: File): Promise<string[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const byY = new Map<number, { x: number; s: string }[]>();
    (content.items as any[]).forEach((it) => {
      if (!('str' in it) || !String(it.str).trim()) return;
      const y = Math.round(it.transform[5] / 3) * 3;
      const list = byY.get(y) || [];
      list.push({ x: it.transform[4], s: it.str });
      byY.set(y, list);
    });
    [...byY.keys()].sort((a, b) => b - a).forEach((y) => {
      const parts = (byY.get(y) || []).sort((a, b) => a.x - b.x).map((q) => q.s);
      lines.push(parts.join(' '));
    });
  }
  return lines;
}

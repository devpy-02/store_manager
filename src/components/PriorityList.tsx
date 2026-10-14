import React, { useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

export interface PriorityItem {
  id: string;
  label: string;
}

interface Props {
  items: PriorityItem[];
  onChange: (ids: string[]) => void;
}

// فهرست اولویت با کشیدن (انگشت یا ماوس) و دکمه‌های بالا/پایین
export const PriorityList: React.FC<Props> = ({ items, onChange }) => {
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next.map((i) => i.id));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const row = el?.closest('[data-prio-index]') as HTMLElement | null;
    if (row) setOver(Number(row.dataset.prioIndex));
  };

  const onPointerUp = () => {
    if (drag !== null && over !== null) move(drag, over);
    setDrag(null);
    setOver(null);
  };

  return (
    <div className="space-y-1.5" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      {items.map((it, i) => {
        const isTarget = drag !== null && over === i && drag !== i;
        return (
          <div
            key={it.id}
            data-prio-index={i}
            className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition-colors ${
              drag === i ? 'opacity-60' : ''
            } ${isTarget ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}
          >
            <span className="w-6 text-center font-bold text-slate-500">{i + 1}</span>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                setDrag(i);
                setOver(i);
              }}
              style={{ touchAction: 'none' }}
              className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 cursor-grab"
              aria-label="کشیدن برای تغییر ترتیب"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <span className="flex-1 font-bold truncate">{it.label}</span>
            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="p-1 disabled:opacity-30" aria-label="بالا">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="p-1 disabled:opacity-30" aria-label="پایین">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

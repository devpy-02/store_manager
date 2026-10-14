import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, BatteryCharging, Signal } from 'lucide-react';
import { toPersianDigits } from '../utils/jalali';

interface Props {
  isOffline: boolean;
}

export const AndroidStatusBar: React.FC<Props> = ({ isOffline }) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${toPersianDigits(h)}:${toPersianDigits(m)}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between select-none border-b border-slate-800/80">
      <div className="font-semibold text-slate-200 tracking-wider">
        {timeStr || '۱۴:۳۵'}
      </div>
      <div className="flex items-center gap-2">
        {isOffline ? (
          <span className="flex items-center gap-1 text-rose-400 font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            <span className="text-[10px]">آفلاین</span>
          </span>
        ) : (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <Signal className="w-3.5 h-3.5 text-slate-300" />
        <div className="flex items-center gap-0.5 text-slate-300">
          <span className="text-[10px]">{toPersianDigits('85')}%</span>
          <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      </div>
    </div>
  );
};

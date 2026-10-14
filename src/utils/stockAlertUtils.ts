import { Product, StockStatusLevel } from '../types';

/**
 * Determines stock level status according to Part 3:
 * - normal: stock > minStock
 * - low: stock <= minStock && stock > criticalStock
 * - critical: stock <= criticalStock && stock > 0
 * - out_of_stock: stock <= 0
 */
export function getProductStockStatus(product: {
  stock: number;
  minStock?: number;
  criticalStock?: number;
}): StockStatusLevel {
  const stock = product.stock;
  const minStock = product.minStock !== undefined ? product.minStock : 5;
  const criticalStock = product.criticalStock !== undefined ? product.criticalStock : 0;

  if (stock <= 0) {
    return 'out_of_stock';
  }
  if (stock <= criticalStock) {
    return 'critical';
  }
  if (stock <= minStock) {
    return 'low';
  }
  return 'normal';
}

export interface StockStatusConfig {
  label: string;
  badgeText: string;
  badgeClass: string;
  bgLightClass: string;
  borderClass: string;
  icon: string;
  colorHex: string;
}

export const STOCK_STATUS_CONFIG: Record<StockStatusLevel, StockStatusConfig> = {
  normal: {
    label: 'عادی',
    badgeText: '✅ عادی',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/20',
    borderClass: 'border-emerald-200 dark:border-emerald-900',
    icon: 'Check',
    colorHex: '#10B981',
  },
  low: {
    label: 'کم',
    badgeText: '⚠️ کم',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    bgLightClass: 'bg-amber-50 dark:bg-amber-950/20',
    borderClass: 'border-amber-200 dark:border-amber-900',
    icon: 'AlertTriangle',
    colorHex: '#F59E0B',
  },
  critical: {
    label: 'بحرانی',
    badgeText: '🔴 بحرانی',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse',
    bgLightClass: 'bg-rose-50/70 dark:bg-rose-950/30',
    borderClass: 'border-rose-300 dark:border-rose-900',
    icon: 'AlertCircle',
    colorHex: '#EF4444',
  },
  out_of_stock: {
    label: 'ناموجود',
    badgeText: '❌ ناموجود',
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    bgLightClass: 'bg-slate-100 dark:bg-slate-850',
    borderClass: 'border-slate-300 dark:border-slate-800',
    icon: 'XCircle',
    colorHex: '#64748B',
  },
};

import {
  Invoice,
  Product,
  Category,
  RestockSuggestion,
  ProductSalesMetric,
  DailySalesPoint,
  CategorySalesSummary,
  AnalyticsSummary,
  RestockUrgency,
} from '../types';
import { formatPersianDateShort, toPersianDigits, timeAgoPersian } from './jalali';

// Helper to determine if an invoice is an effective sales invoice
export function isSalesInvoice(inv: Invoice): boolean {
  return inv.type === 'sales' || inv.type === 'retail';
}

/**
 * Calculates high-level summary cards (Today, This Week, This Month, Comparisons)
 */
export function calculateAnalyticsSummary(
  invoices: Invoice[],
  products: Product[]
): AnalyticsSummary {
  const salesInvoices = invoices.filter(isSalesInvoice);
  const now = new Date();

  // Define date thresholds
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfThisWeek = startOfToday - 7 * 86400000;
  const startOfLastWeek = startOfToday - 14 * 86400000;
  const startOfThisMonth = startOfToday - 30 * 86400000;
  const startOfLastMonth = startOfToday - 60 * 86400000;

  let todayRevenue = 0;
  let yesterdayRevenue = 0;
  let thisWeekRevenue = 0;
  let lastWeekRevenue = 0;
  let thisMonthRevenue = 0;
  let lastMonthRevenue = 0;
  let thisMonthInvoiceCount = 0;
  let thisMonthTotalProfit = 0;

  // Product sales counts in the last 30 days
  const productMonthlySales: Record<string, { unitsSold: number; revenue: number }> = {};

  salesInvoices.forEach((inv) => {
    const invTime = new Date(inv.createdAt).getTime();
    const amount = inv.finalTotal;
    const profit = inv.totalProfit || 0;

    // Today
    if (invTime >= startOfToday) {
      todayRevenue += amount;
    } else if (invTime >= startOfYesterday && invTime < startOfToday) {
      yesterdayRevenue += amount;
    }

    // Week
    if (invTime >= startOfThisWeek) {
      thisWeekRevenue += amount;
    } else if (invTime >= startOfLastWeek && invTime < startOfThisWeek) {
      lastWeekRevenue += amount;
    }

    // Month (30 days)
    if (invTime >= startOfThisMonth) {
      thisMonthRevenue += amount;
      thisMonthInvoiceCount += 1;
      thisMonthTotalProfit += profit;

      inv.items.forEach((item) => {
        if (!productMonthlySales[item.productId]) {
          productMonthlySales[item.productId] = { unitsSold: 0, revenue: 0 };
        }
        productMonthlySales[item.productId].unitsSold += item.quantity;
        productMonthlySales[item.productId].revenue += item.totalPrice;
      });
    } else if (invTime >= startOfLastMonth && invTime < startOfThisMonth) {
      lastMonthRevenue += amount;
    }
  });

  // Calculate percentage growth with bounds
  const calcGrowth = (curr: number, prev: number) => {
    if (prev <= 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const todayGrowthPercent = calcGrowth(todayRevenue, yesterdayRevenue);
  const weekGrowthPercent = calcGrowth(thisWeekRevenue, lastWeekRevenue);
  const monthGrowthPercent = calcGrowth(thisMonthRevenue, lastMonthRevenue);

  const avgInvoiceValue =
    thisMonthInvoiceCount > 0 ? Math.round(thisMonthRevenue / thisMonthInvoiceCount) : 0;

  const overallProfitMargin =
    thisMonthRevenue > 0 ? Math.round((thisMonthTotalProfit / thisMonthRevenue) * 100) : 0;

  // Find top product of the month
  let topSellingProductMonth: AnalyticsSummary['topSellingProductMonth'] = null;
  let highestRevenue = -1;

  Object.entries(productMonthlySales).forEach(([pId, stats]) => {
    if (stats.revenue > highestRevenue) {
      highestRevenue = stats.revenue;
      const p = products.find((prod) => prod.id === pId);
      topSellingProductMonth = {
        productId: pId,
        productName: p ? p.name : 'کالای حذف شده',
        unitsSold: stats.unitsSold,
        revenue: stats.revenue,
      };
    }
  });

  return {
    todayRevenue,
    yesterdayRevenue,
    todayGrowthPercent,
    thisWeekRevenue,
    lastWeekRevenue,
    weekGrowthPercent,
    thisMonthRevenue,
    lastMonthRevenue,
    monthGrowthPercent,
    thisMonthInvoiceCount,
    avgInvoiceValue,
    topSellingProductMonth,
    totalProfitMonth: thisMonthTotalProfit,
    overallProfitMargin,
  };
}

/**
 * Computes 30-day daily sales history points for the line/bar chart
 */
export function calculateDailySalesChart(
  invoices: Invoice[],
  daysCount: number = 30
): DailySalesPoint[] {
  const salesInvoices = invoices.filter(isSalesInvoice);
  const daysMap: Record<string, DailySalesPoint> = {};

  const persianWeekDays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
  const now = new Date();

  // Initialize slots for each day back to `daysCount` days
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const dayName = persianWeekDays[d.getDay()];

    daysMap[dateKey] = {
      date: dateKey,
      jalaliDate: formatPersianDateShort(d.toISOString()),
      dayName,
      revenue: 0,
      profit: 0,
      unitsSold: 0,
      invoiceCount: 0,
    };
  }

  // Populate from invoices
  salesInvoices.forEach((inv) => {
    const d = new Date(inv.createdAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

    if (daysMap[dateKey]) {
      daysMap[dateKey].revenue += inv.finalTotal;
      daysMap[dateKey].profit += inv.totalProfit || 0;
      daysMap[dateKey].invoiceCount += 1;
      inv.items.forEach((item) => {
        daysMap[dateKey].unitsSold += item.quantity;
      });
    }
  });

  return Object.values(daysMap);
}

/**
 * Calculates Smart Restock Suggestions per Part 7 & 9
 * Algorithm:
 * 1. ADS (Average Daily Sales) = units sold in period / periodDays
 * 2. Lead Time = product.leadTimeDays || 7
 * 3. Safety Stock = ADS * (product.safetyFactor || 1.5)
 * 4. Reorder Point = (ADS * leadTime) + safetyStock
 * 5. Suggested Quantity = (ADS * 30) - currentStock (bounded >= 0)
 */
export function calculateRestockSuggestions(
  products: Product[],
  invoices: Invoice[],
  defaultPeriod: number = 30
): RestockSuggestion[] {
  const salesInvoices = invoices.filter(isSalesInvoice);
  const now = Date.now();

  return products
    .filter((p) => !p.deleted)
    .map((product) => {
      const periodDays = product.analysisPeriodDays || defaultPeriod;
      const thresholdTime = now - periodDays * 86400000;

      let unitsSoldInPeriod = 0;
      let lastSoldTime = 0;
      let lastSoldDate: string | undefined = undefined;

      salesInvoices.forEach((inv) => {
        const invTime = new Date(inv.createdAt).getTime();
        inv.items.forEach((it) => {
          if (it.productId === product.id) {
            if (invTime >= thresholdTime) {
              unitsSoldInPeriod += it.quantity;
            }
            if (invTime > lastSoldTime) {
              lastSoldTime = invTime;
              lastSoldDate = inv.createdAt;
            }
          }
        });
      });

      // 1. ADS (Average Daily Sales)
      const avgDailySales = Math.round((unitsSoldInPeriod / periodDays) * 10) / 10;

      // 2. Lead Time (default 7 days)
      const leadTimeDays = product.leadTimeDays || 7;

      // 3. Safety Stock = ADS * safetyFactor (default 1.5)
      const safetyFactor = product.safetyFactor || 1.5;
      const safetyStock = Math.ceil(avgDailySales * safetyFactor);

      // 4. Reorder Point = (ADS * leadTime) + safetyStock
      const reorderPoint = Math.ceil(avgDailySales * leadTimeDays + safetyStock);

      // 5. Suggested Order Quantity = (ADS * 30) - currentStock
      const targetMonthlyStock = Math.ceil(avgDailySales * 30);
      const suggestedQuantity = Math.max(
        0,
        targetMonthlyStock > product.stock ? targetMonthlyStock - product.stock : 0
      );

      // 6. Days until stockout estimation
      const daysUntilStockout =
        product.stock <= 0
          ? 0
          : avgDailySales > 0
          ? Math.floor(product.stock / avgDailySales)
          : 999;

      // 7. Urgency Level
      let urgency: RestockUrgency = 'sufficient';
      if (product.stock <= 0 || daysUntilStockout <= 2 || product.stock <= (product.criticalStock ?? 0)) {
        urgency = 'critical'; // 🔴 فوری
      } else if (product.stock <= reorderPoint || daysUntilStockout <= leadTimeDays) {
        urgency = 'urgent'; // 🟠 نیاز فوری
      } else if (daysUntilStockout <= leadTimeDays + 6) {
        urgency = 'soon'; // 🟡 به زودی
      } else {
        urgency = 'sufficient'; // ✅ کافی
      }

      const daysSinceLastSale = lastSoldTime > 0 ? Math.floor((now - lastSoldTime) / 86400000) : 999;
      const buyPrice = product.buyPrice || Math.round(product.price * 0.75);

      return {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        category: product.category,
        currentStock: product.stock,
        unit: product.unit,
        price: product.price,
        buyPrice,
        avgDailySales,
        leadTimeDays,
        safetyFactor,
        safetyStock,
        reorderPoint,
        suggestedQuantity,
        daysUntilStockout,
        urgency,
        estimatedOrderCost: suggestedQuantity * buyPrice,
        lastSoldDate,
        daysSinceLastSale,
      };
    })
    .sort((a, b) => {
      // Sort priority: critical first, then urgent, then soon, then sufficient
      const orderMap: Record<RestockUrgency, number> = {
        critical: 0,
        urgent: 1,
        soon: 2,
        sufficient: 3,
      };
      if (orderMap[a.urgency] !== orderMap[b.urgency]) {
        return orderMap[a.urgency] - orderMap[b.urgency];
      }
      return a.daysUntilStockout - b.daysUntilStockout;
    });
}

/**
 * Calculates in-depth metrics for an individual product (Part 6 & 12)
 */
export function calculateProductMetrics(
  product: Product,
  invoices: Invoice[],
  periodDays: number = 30
): ProductSalesMetric {
  const salesInvoices = invoices.filter(isSalesInvoice);
  const now = Date.now();
  const threshold = now - periodDays * 86400000;

  let totalUnitsSold = 0;
  let totalRevenue = 0;
  let totalProfit = 0;
  let salesCount = 0;
  let lastSaleDate: string | null = null;
  let lastSaleTime = 0;

  const dayOfWeekCounts: Record<string, number> = {
    شنبه: 0,
    یکشنبه: 0,
    دوشنبه: 0,
    سه‌شنبه: 0,
    چهارشنبه: 0,
    پنج‌شنبه: 0,
    جمعه: 0,
  };
  const persianWeekDays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

  const hourBuckets: Record<string, number> = {
    '۸ - ۱۰ صبح': 0,
    '۱۰ - ۱۲ صبح': 0,
    '۱۲ - ۱۴ ظهر': 0,
    '۱۴ - ۱۷ عصر': 0,
    '۱۷ - ۲۱ شب': 0,
    'سایر ساعات': 0,
  };

  salesInvoices.forEach((inv) => {
    const invTime = new Date(inv.createdAt).getTime();
    inv.items.forEach((it) => {
      if (it.productId === product.id) {
        if (invTime > lastSaleTime) {
          lastSaleTime = invTime;
          lastSaleDate = inv.createdAt;
        }

        if (invTime >= threshold) {
          totalUnitsSold += it.quantity;
          totalRevenue += it.totalPrice;
          totalProfit += it.profit || (it.buyPrice ? (it.unitPrice - it.buyPrice) * it.quantity : 0);
          salesCount += 1;

          // Track Day of Week
          const d = new Date(inv.createdAt);
          const dayName = persianWeekDays[d.getDay()];
          dayOfWeekCounts[dayName] = (dayOfWeekCounts[dayName] || 0) + it.quantity;

          // Track Hour Range
          const h = d.getHours();
          if (h >= 8 && h < 10) hourBuckets['۸ - ۱۰ صبح'] += it.quantity;
          else if (h >= 10 && h < 12) hourBuckets['۱۰ - ۱۲ صبح'] += it.quantity;
          else if (h >= 12 && h < 14) hourBuckets['۱۲ - ۱۴ ظهر'] += it.quantity;
          else if (h >= 14 && h < 17) hourBuckets['۱۴ - ۱۷ عصر'] += it.quantity;
          else if (h >= 17 && h < 21) hourBuckets['۱۷ - ۲۱ شب'] += it.quantity;
          else hourBuckets['سایر ساعات'] += it.quantity;
        }
      }
    });
  });

  // Profit margin
  const profitMarginPercent =
    totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  // Velocity & Averages
  const avgDailySales = Math.round((totalUnitsSold / periodDays) * 10) / 10;
  const avgWeeklySales = Math.round(avgDailySales * 7 * 10) / 10;
  const salesVelocity = avgDailySales; // units per day

  // Turnover rate: units sold / average stock
  const turnoverRate =
    product.stock > 0 ? Math.round((totalUnitsSold / product.stock) * 10) / 10 : 0;

  // Days of Inventory
  const daysOfInventory =
    avgDailySales > 0 ? Math.round(product.stock / avgDailySales) : 999;

  // Peak Day
  let peakDayOfWeek = 'پنج‌شنبه';
  let maxDayCount = -1;
  Object.entries(dayOfWeekCounts).forEach(([day, count]) => {
    if (count > maxDayCount) {
      maxDayCount = count;
      peakDayOfWeek = day;
    }
  });

  // Peak Hour
  let peakHourRange = '۱۰ - ۱۲ صبح';
  let maxHourCount = -1;
  Object.entries(hourBuckets).forEach(([bucket, count]) => {
    if (count > maxHourCount) {
      maxHourCount = count;
      peakHourRange = bucket;
    }
  });

  const daysSinceLastSale = lastSaleTime > 0 ? Math.floor((now - lastSaleTime) / 86400000) : 999;

  // Calculate Restock Suggestion for this product
  const suggestions = calculateRestockSuggestions([product], invoices, periodDays);
  const suggestedReorder = suggestions[0];

  return {
    productId: product.id,
    productName: product.name,
    productCode: product.code,
    category: product.category,
    currentStock: product.stock,
    unit: product.unit,
    price: product.price,
    buyPrice: product.buyPrice || Math.round(product.price * 0.75),
    totalUnitsSold,
    totalRevenue,
    totalProfit,
    profitMarginPercent,
    avgDailySales,
    avgWeeklySales,
    lastSaleDate,
    daysSinceLastSale,
    salesCount,
    salesVelocity,
    turnoverRate,
    daysOfInventory,
    peakDayOfWeek,
    peakHourRange,
    suggestedReorder,
  };
}

/**
 * Category-level sales breakdown
 */
export function calculateCategorySales(
  invoices: Invoice[],
  products: Product[],
  categories: Category[]
): CategorySalesSummary[] {
  const salesInvoices = invoices.filter(isSalesInvoice);
  const catMap: Record<string, { revenue: number; unitsSold: number; profit: number }> = {};

  let totalAllRevenue = 0;

  salesInvoices.forEach((inv) => {
    inv.items.forEach((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const catName = prod ? prod.category : 'سایر';

      if (!catMap[catName]) {
        catMap[catName] = { revenue: 0, unitsSold: 0, profit: 0 };
      }
      catMap[catName].revenue += it.totalPrice;
      catMap[catName].unitsSold += it.quantity;
      catMap[catName].profit += it.profit || 0;
      totalAllRevenue += it.totalPrice;
    });
  });

  return Object.entries(catMap)
    .map(([categoryName, data]) => {
      const catObj = categories.find((c) => c.name === categoryName);
      const percentage =
        totalAllRevenue > 0 ? Math.round((data.revenue / totalAllRevenue) * 100) : 0;
      return {
        categoryId: catObj?.id,
        categoryName,
        color: catObj?.color || '#3B82F6',
        revenue: data.revenue,
        unitsSold: data.unitsSold,
        profit: data.profit,
        percentage,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Dead stock identification (Report 3: No sales in 30/60/90 days)
 */
export interface DeadStockItem {
  product: Product;
  daysWithoutSale: number;
  lastSoldDate?: string;
  stuckCapital: number; // stock * buyPrice
  statusBadge: string;
}

export function calculateDeadStock(
  products: Product[],
  invoices: Invoice[],
  minDaysWithoutSale: number = 30
): DeadStockItem[] {
  const salesInvoices = invoices.filter(isSalesInvoice);
  const now = Date.now();

  const results: DeadStockItem[] = [];

  products
    .filter((p) => !p.deleted && p.stock > 0)
    .forEach((p) => {
      let lastSoldTime = 0;
      let lastSoldDate: string | undefined = undefined;

      salesInvoices.forEach((inv) => {
        const invTime = new Date(inv.createdAt).getTime();
        inv.items.forEach((it) => {
          if (it.productId === p.id && invTime > lastSoldTime) {
            lastSoldTime = invTime;
            lastSoldDate = inv.createdAt;
          }
        });
      });

      const daysWithoutSale = lastSoldTime > 0 ? Math.floor((now - lastSoldTime) / 86400000) : 999;
      if (daysWithoutSale >= minDaysWithoutSale) {
        const buyPrice = p.buyPrice || Math.round(p.price * 0.75);
        const stuckCapital = p.stock * buyPrice;

        let statusBadge = 'راکد';
        if (daysWithoutSale >= 90) statusBadge = 'بسیار راکد (+۹۰ روز)';
        else if (daysWithoutSale >= 60) statusBadge = 'راکد (+۶۰ روز)';
        else statusBadge = 'کم‌گردش (+۳۰ روز)';

        results.push({
          product: p,
          daysWithoutSale,
          lastSoldDate,
          stuckCapital,
          statusBadge,
        });
      }
    });

  return results.sort((a, b) => b.stuckCapital - a.stuckCapital);
}

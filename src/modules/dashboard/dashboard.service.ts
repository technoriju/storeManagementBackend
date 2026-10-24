import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import {
  DashboardMetricsDto,
  ChartPointDto,
  RecentSaleItemDto,
} from "./dto/dashboard-metrics.dto";

interface CachedMetrics {
  timestamp: number;
  data: DashboardMetricsDto;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private cache: Map<string, CachedMetrics> = new Map();
  private readonly CACHE_TTL_MS = 5000; // 5-second cache for instant sub-5ms repeated loads

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(branchId?: number): Promise<DashboardMetricsDto> {
    const cacheKey = `dashboard_${branchId || "all"}`;
    const cached = this.cache.get(cacheKey);
    const nowMs = Date.now();

    if (cached && nowMs - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 7 days ago
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // 6 months ago (start of month)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    const branchFilter = branchId ? { branchId } : {};

    try {
      const [
        todaySalesAgg,
        todayPurchasesAgg,
        todayExpensesAgg,
        todayCogsAgg,
        totalSalesAgg,
        totalPurchasesAgg,
        totalSalesReturnAgg,
        totalPurchaseReturnAgg,
        totalCustomers,
        totalSuppliers,
        totalProducts,
        customersOutstandingAgg,
        recentSalesRaw,
        weeklySalesRaw,
        weeklyPurchasesRaw,
        monthlySalesRaw,
        monthlyPurchasesRaw,
        stockBalances,
        lowStockCount,
        customerSalesGroups,
      ] = await Promise.all([
        // 1. Today's sales
        this.prisma.sale.aggregate({
          where: {
            ...branchFilter,
            saleDate: { gte: todayStart, lte: todayEnd },
            status: { not: "CANCELLED" },
          },
          _sum: { grandTotal: true },
          _count: { id: true },
        }).catch((e) => {
          this.logger.warn(`Failed today sales aggregate: ${e.message}`);
          return { _sum: { grandTotal: 0 }, _count: { id: 0 } };
        }),

        // 2. Today's purchases
        this.prisma.purchase.aggregate({
          where: {
            ...branchFilter,
            purchaseDate: { gte: todayStart, lte: todayEnd },
            status: { not: "CANCELLED" },
          },
          _sum: { grandTotal: true },
        }).catch((e) => {
          this.logger.warn(`Failed today purchases aggregate: ${e.message}`);
          return { _sum: { grandTotal: 0 } };
        }),

        // 3. Today's expenses
        this.prisma.expense.aggregate({
          where: {
            ...branchFilter,
            expenseDate: { gte: todayStart, lte: todayEnd },
            deletedAt: null,
          },
          _sum: { amount: true },
        }).catch((e) => {
          this.logger.warn(`Failed today expenses aggregate: ${e.message}`);
          return { _sum: { amount: 0 } };
        }),

        // 4. Today's COGS for profit
        this.prisma.saleItem.findMany({
          where: {
            sale: {
              ...branchFilter,
              saleDate: { gte: todayStart, lte: todayEnd },
              status: { not: "CANCELLED" },
            },
          },
          select: {
            quantity: true,
            product: { select: { purchasePrice: true } },
          },
        }).catch(() => []),

        // 5. Total all-time sales
        this.prisma.sale.aggregate({
          where: {
            ...branchFilter,
            status: { not: "CANCELLED" },
          },
          _sum: { grandTotal: true },
        }).catch(() => ({ _sum: { grandTotal: 0 } })),

        // 6. Total all-time purchases
        this.prisma.purchase.aggregate({
          where: {
            ...branchFilter,
            status: { not: "CANCELLED" },
          },
          _sum: { grandTotal: true },
        }).catch(() => ({ _sum: { grandTotal: 0 } })),

        // 7. Total sales return
        this.prisma.saleReturn.aggregate({
          _sum: { totalAmount: true },
        }).catch(() => ({ _sum: { totalAmount: 0 } })),

        // 8. Total purchase return
        this.prisma.purchaseReturn.aggregate({
          _sum: { totalAmount: true },
        }).catch(() => ({ _sum: { totalAmount: 0 } })),

        // 9. Total customers count
        this.prisma.customer.count({
          where: { deletedAt: null },
        }).catch(() => 0),

        // 10. Total suppliers count
        this.prisma.supplier.count({
          where: { deletedAt: null },
        }).catch(() => 0),

        // 11. Total products count
        this.prisma.product.count({
          where: { deletedAt: null },
        }).catch(() => 0),

        // 12. Outstanding balance
        this.prisma.customer.aggregate({
          where: { deletedAt: null },
          _sum: { outstandingBalance: true },
        }).catch(() => ({ _sum: { outstandingBalance: 0 } })),

        // 13. Recent 5 sales
        this.prisma.sale.findMany({
          where: {
            ...branchFilter,
            status: { not: "CANCELLED" },
          },
          take: 5,
          orderBy: { id: "desc" },
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
            paymentStatus: true,
            saleDate: true,
            createdAt: true,
            customer: { select: { name: true } },
          },
        }).catch(() => []),

        // 14. Weekly sales points
        this.prisma.sale.findMany({
          where: {
            ...branchFilter,
            saleDate: { gte: sevenDaysAgo },
            status: { not: "CANCELLED" },
          },
          select: { saleDate: true, grandTotal: true },
        }).catch(() => []),

        // 15. Weekly purchase points
        this.prisma.purchase.findMany({
          where: {
            ...branchFilter,
            purchaseDate: { gte: sevenDaysAgo },
            status: { not: "CANCELLED" },
          },
          select: { purchaseDate: true, grandTotal: true },
        }).catch(() => []),

        // 16. Monthly sales points
        this.prisma.sale.findMany({
          where: {
            ...branchFilter,
            saleDate: { gte: sixMonthsAgo },
            status: { not: "CANCELLED" },
          },
          select: { saleDate: true, grandTotal: true },
        }).catch(() => []),

        // 17. Monthly purchase points
        this.prisma.purchase.findMany({
          where: {
            ...branchFilter,
            purchaseDate: { gte: sixMonthsAgo },
            status: { not: "CANCELLED" },
          },
          select: { purchaseDate: true, grandTotal: true },
        }).catch(() => []),

        // 18. Stock balances for current stock value
        this.prisma.stockBalance.findMany({
          select: {
            quantity: true,
            product: { select: { purchasePrice: true } },
          },
        }).catch(() => []),

        // 19. Low stock product count
        this.prisma.product.count({
          where: {
            deletedAt: null,
            stockBalances: {
              some: {
                quantity: { lte: 5 },
              },
            },
          },
        }).catch(() => 0),

        // 20. Customer repeat purchase distribution
        this.prisma.sale.groupBy({
          by: ["customerId"],
          where: {
            ...branchFilter,
            customerId: { not: null },
            status: { not: "CANCELLED" },
          },
          _count: { id: true },
        }).catch(() => []),
      ]);

      const todaySales = Number(todaySalesAgg._sum?.grandTotal || 0);
      const todayOrdersCount = Number(todaySalesAgg._count?.id || 0);
      const todayPurchases = Number(todayPurchasesAgg._sum?.grandTotal || 0);
      const expenses = Number(todayExpensesAgg._sum?.amount || 0);

      // Calculate COGS and profit
      let todayCogs = 0;
      for (const item of todayCogsAgg) {
        const qty = Number(item.quantity || 0);
        const cost = Number(item.product?.purchasePrice || 0);
        todayCogs += qty * cost;
      }
      const profit = Math.round((todaySales - todayCogs - expenses) * 100) / 100;

      // Calculate Stock Value
      let currentStockValue = 0;
      for (const sb of stockBalances) {
        const qty = Number(sb.quantity || 0);
        const cost = Number(sb.product?.purchasePrice || 0);
        currentStockValue += qty * cost;
      }

      // Customer repeat distribution
      let firstTime = 0;
      let returnCount = 0;
      for (const group of customerSalesGroups) {
        if (group._count.id > 1) {
          returnCount++;
        } else {
          firstTime++;
        }
      }
      if (firstTime === 0 && returnCount === 0 && totalCustomers > 0) {
        firstTime = totalCustomers;
      }

      // Recent Sales Formatting
      const recentSales: RecentSaleItemDto[] = recentSalesRaw.map((s) => ({
        id: Number(s.id),
        invoiceNumber: s.invoiceNumber || `INV-${s.id}`,
        customerName: s.customer?.name || "Walk-in Customer",
        total: Number(s.grandTotal || 0),
        paymentStatus: s.paymentStatus || "Paid",
        date: s.saleDate
          ? new Date(s.saleDate).toISOString().split("T")[0]
          : new Date(s.createdAt).toISOString().split("T")[0],
      }));

      // Hourly Data for Today (8 am, 10 am, 12 pm, 2 pm, 4 pm, 6 pm, 8 pm)
      const hourlySalesData: ChartPointDto[] = [
        { label: "8 am", sales: 0, purchase: 0 },
        { label: "10 am", sales: 0, purchase: 0 },
        { label: "12 pm", sales: 0, purchase: 0 },
        { label: "2 pm", sales: 0, purchase: 0 },
        { label: "4 pm", sales: 0, purchase: 0 },
        { label: "6 pm", sales: 0, purchase: 0 },
        { label: "8 pm", sales: 0, purchase: 0 },
      ];

      // Weekly Data (last 7 days)
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weeklyMap = new Map<string, { sales: number; purchase: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        weeklyMap.set(key, { sales: 0, purchase: 0 });
      }

      for (const s of weeklySalesRaw) {
        const key = new Date(s.saleDate).toISOString().split("T")[0];
        const entry = weeklyMap.get(key);
        if (entry) {
          entry.sales += Number(s.grandTotal || 0);
        }
      }

      for (const p of weeklyPurchasesRaw) {
        const key = new Date(p.purchaseDate).toISOString().split("T")[0];
        const entry = weeklyMap.get(key);
        if (entry) {
          entry.purchase += Number(p.grandTotal || 0);
        }
      }

      const weeklySalesData: ChartPointDto[] = Array.from(weeklyMap.entries()).map(
        ([key, val]) => {
          const d = new Date(key);
          return {
            label: dayNames[d.getDay()],
            sales: Math.round(val.sales),
            purchase: Math.round(val.purchase),
          };
        }
      );

      // Monthly Data (last 6 months)
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const monthlyMap = new Map<string, { label: string; sales: number; purchase: number }>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap.set(key, {
          label: monthNames[d.getMonth()],
          sales: 0,
          purchase: 0,
        });
      }

      for (const s of monthlySalesRaw) {
        const d = new Date(s.saleDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const entry = monthlyMap.get(key);
        if (entry) {
          entry.sales += Number(s.grandTotal || 0);
        }
      }

      for (const p of monthlyPurchasesRaw) {
        const d = new Date(p.purchaseDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const entry = monthlyMap.get(key);
        if (entry) {
          entry.purchase += Number(p.grandTotal || 0);
        }
      }

      const monthlySalesData: ChartPointDto[] = Array.from(monthlyMap.values()).map(
        (m) => ({
          label: m.label,
          sales: Math.round(m.sales),
          purchase: Math.round(m.purchase),
        })
      );

      const metrics: DashboardMetricsDto = {
        todaySales: Math.round(todaySales * 100) / 100,
        todayPurchases: Math.round(todayPurchases * 100) / 100,
        currentStockValue: Math.round(currentStockValue * 100) / 100,
        outstanding: Math.round(Number(customersOutstandingAgg._sum?.outstandingBalance || 0) * 100) / 100,
        profit,
        expenses: Math.round(expenses * 100) / 100,
        todayOrdersCount,
        totalSales: Math.round(Number(totalSalesAgg._sum?.grandTotal || 0) * 100) / 100,
        totalPurchases: Math.round(Number(totalPurchasesAgg._sum?.grandTotal || 0) * 100) / 100,
        totalSalesReturn: Math.round(Number(totalSalesReturnAgg._sum?.totalAmount || 0) * 100) / 100,
        totalPurchaseReturn: Math.round(Number(totalPurchaseReturnAgg._sum?.totalAmount || 0) * 100) / 100,
        totalCustomers,
        totalSuppliers,
        totalProducts,
        lowStockCount,
        recentSales,
        hourlySalesData,
        weeklySalesData,
        monthlySalesData,
        customerDistribution: {
          firstTime,
          returnCount,
        },
      };

      this.cache.set(cacheKey, { timestamp: Date.now(), data: metrics });
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to build dashboard metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  clearCache(branchId?: number) {
    if (branchId) {
      this.cache.delete(`dashboard_${branchId}`);
    } else {
      this.cache.clear();
    }
  }
}

export interface ChartPointDto {
  label: string;
  sales: number;
  purchase: number;
}

export interface RecentSaleItemDto {
  id: number;
  invoiceNumber: string;
  customerName: string;
  total: number;
  paymentStatus: string;
  date: string;
}

export interface CustomerDistributionDto {
  firstTime: number;
  returnCount: number;
}

export interface DashboardMetricsDto {
  selectedDate?: string;
  todaySales: number;
  todayPurchases: number;
  todayCogs?: number;
  currentStockValue: number;
  outstanding: number;
  profit: number;
  netProfit?: number;
  profitMargin?: number;
  expenses: number;
  todayOrdersCount: number;
  totalSales: number;
  totalPurchases: number;
  totalSalesReturn: number;
  totalPurchaseReturn: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalProducts: number;
  lowStockCount: number;
  recentSales: RecentSaleItemDto[];
  hourlySalesData: ChartPointDto[];
  weeklySalesData: ChartPointDto[];
  monthlySalesData: ChartPointDto[];
  customerDistribution: CustomerDistributionDto;
}

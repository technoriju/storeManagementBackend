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
  todaySales: number;
  todayPurchases: number;
  currentStockValue: number;
  outstanding: number;
  profit: number;
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

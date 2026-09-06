import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/data-access/prisma/prisma.service';
import { ReportFiltersDto } from './dto/report-filters.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private parseDateRange(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;
    const filter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        s.setHours(0, 0, 0, 0);
        filter.gte = s;
      }
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        filter.lte = e;
      }
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private getPagination(pageParam?: number, limitParam?: number) {
    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.max(1, Math.min(500, Number(limitParam) || 10));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  private toNumber(val: any, decimals = 2): number {
    if (val === null || val === undefined) return 0;
    const num = typeof val === 'object' && 'toNumber' in val ? val.toNumber() : Number(val);
    return isNaN(num) ? 0 : Number(num.toFixed(decimals));
  }

  // ==========================================
  // 1. SALES REPORT
  // ==========================================
  async getSalesReport(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);
    const dateRange = this.parseDateRange(filters.startDate, filters.endDate);

    const where: any = {
      deletedAt: null,
      ...(dateRange && { saleDate: dateRange }),
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.search && {
        OR: [
          { invoiceNumber: { contains: filters.search } },
          { customer: { name: { contains: filters.search } } },
        ],
      }),
    };

    // Database Aggregation
    const [aggregate, totalRecords, sales] = await Promise.all([
      this.prisma.sale.aggregate({
        where,
        _count: { id: true },
        _sum: {
          subTotal: true,
          taxTotal: true,
          discountTotal: true,
          grandTotal: true,
        },
      }),
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { saleDate: filters.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          branch: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          payments: {
            include: {
              payment: { select: { id: true, amount: true, paymentMethod: true, paymentDate: true } },
            },
          },
          _count: { select: { items: true } },
        },
      }),
    ]);

    const formattedData = sales.map((sale) => {
      const paidAmount = sale.payments.reduce(
        (acc, p) => acc + this.toNumber(p.payment?.amount),
        0,
      );
      const grandTotal = this.toNumber(sale.grandTotal);
      return {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate,
        customerName: sale.customer?.name || 'Walk-in Customer',
        customerPhone: sale.customer?.phone || '',
        branchName: sale.branch?.name || '',
        warehouseName: sale.warehouse?.name || '',
        itemCount: sale._count.items,
        status: sale.status,
        subTotal: this.toNumber(sale.subTotal),
        taxTotal: this.toNumber(sale.taxTotal),
        discountTotal: this.toNumber(sale.discountTotal),
        grandTotal,
        paidAmount,
        dueAmount: Number((grandTotal - paidAmount).toFixed(2)),
      };
    });

    return {
      summary: {
        totalSalesCount: aggregate._count.id,
        totalSubTotal: this.toNumber(aggregate._sum.subTotal),
        totalTaxTotal: this.toNumber(aggregate._sum.taxTotal),
        totalDiscountTotal: this.toNumber(aggregate._sum.discountTotal),
        totalGrandTotal: this.toNumber(aggregate._sum.grandTotal),
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: formattedData,
    };
  }

  // ==========================================
  // 2. PURCHASE REPORT
  // ==========================================
  async getPurchaseReport(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);
    const dateRange = this.parseDateRange(filters.startDate, filters.endDate);

    const where: any = {
      deletedAt: null,
      ...(dateRange && { purchaseDate: dateRange }),
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.search && {
        OR: [
          { invoiceNumber: { contains: filters.search } },
          { supplier: { name: { contains: filters.search } } },
        ],
      }),
    };

    const [aggregate, totalRecords, purchases] = await Promise.all([
      this.prisma.purchase.aggregate({
        where,
        _count: { id: true },
        _sum: {
          subTotal: true,
          taxTotal: true,
          discountTotal: true,
          grandTotal: true,
        },
      }),
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchaseDate: filters.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          payments: {
            include: {
              payment: { select: { id: true, amount: true, paymentMethod: true, paymentDate: true } },
            },
          },
          _count: { select: { items: true } },
        },
      }),
    ]);

    const formattedData = purchases.map((purchase) => {
      const paidAmount = purchase.payments.reduce(
        (acc, p) => acc + this.toNumber(p.payment?.amount),
        0,
      );
      const grandTotal = this.toNumber(purchase.grandTotal);
      return {
        id: purchase.id,
        invoiceNumber: purchase.invoiceNumber,
        purchaseDate: purchase.purchaseDate,
        supplierName: purchase.supplier?.name || '',
        supplierPhone: purchase.supplier?.phone || '',
        branchName: purchase.branch?.name || '',
        warehouseName: purchase.warehouse?.name || '',
        itemCount: purchase._count.items,
        status: purchase.status,
        subTotal: this.toNumber(purchase.subTotal),
        taxTotal: this.toNumber(purchase.taxTotal),
        discountTotal: this.toNumber(purchase.discountTotal),
        grandTotal,
        paidAmount,
        dueAmount: Number((grandTotal - paidAmount).toFixed(2)),
      };
    });

    return {
      summary: {
        totalPurchasesCount: aggregate._count.id,
        totalSubTotal: this.toNumber(aggregate._sum.subTotal),
        totalTaxTotal: this.toNumber(aggregate._sum.taxTotal),
        totalDiscountTotal: this.toNumber(aggregate._sum.discountTotal),
        totalGrandTotal: this.toNumber(aggregate._sum.grandTotal),
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: formattedData,
    };
  }

  // ==========================================
  // 3. PROFIT REPORT
  // ==========================================
  async getProfitReport(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);
    const dateRange = this.parseDateRange(filters.startDate, filters.endDate);

    const salesWhere: any = {
      deletedAt: null,
      ...(dateRange && { saleDate: dateRange }),
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
    };

    const expenseWhere: any = {
      deletedAt: null,
      ...(dateRange && { expenseDate: dateRange }),
      ...(filters.branchId && { branchId: filters.branchId }),
    };

    // Aggregate sales and expenses
    const [salesAgg, expensesAgg, totalSalesRecords] = await Promise.all([
      this.prisma.sale.aggregate({
        where: salesWhere,
        _count: { id: true },
        _sum: {
          subTotal: true,
          grandTotal: true,
          taxTotal: true,
          discountTotal: true,
        },
      }),
      this.prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      }),
      this.prisma.sale.count({ where: salesWhere }),
    ]);

    // Fetch paginated sales with items and products to calculate COGS & profit
    const sales = await this.prisma.sale.findMany({
      where: salesWhere,
      skip,
      take: limit,
      orderBy: { saleDate: 'desc' },
      include: {
        customer: { select: { name: true } },
        items: {
          include: {
            product: {
              include: {
                prices: true,
              },
            },
          },
        },
      },
    });

    // Calculate item costs and profit
    const formattedData = sales.map((sale) => {
      const revenue = this.toNumber(sale.grandTotal);
      let estimatedCost = 0;

      sale.items.forEach((item) => {
        const qty = this.toNumber(item.quantity, 4);
        const purchasePrice =
          item.product?.prices?.find((p) => p.priceType === 'PURCHASE')?.price;
        const unitCost = purchasePrice ? this.toNumber(purchasePrice) : this.toNumber(item.unitPrice) * 0.7;
        estimatedCost += qty * unitCost;
      });

      const grossProfit = Number((revenue - estimatedCost).toFixed(2));
      const margin = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0;

      return {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate,
        customerName: sale.customer?.name || 'Walk-in',
        revenue,
        estimatedCost: Number(estimatedCost.toFixed(2)),
        grossProfit,
        profitMargin: margin,
      };
    });

    const totalRevenue = this.toNumber(salesAgg._sum.grandTotal);
    // Approximate overall COGS from paginated sample ratio or items
    const sampleRevenue = formattedData.reduce((acc, s) => acc + s.revenue, 0);
    const sampleCost = formattedData.reduce((acc, s) => acc + s.estimatedCost, 0);
    const costRatio = sampleRevenue > 0 ? sampleCost / sampleRevenue : 0.7;
    const totalCOGS = Number((totalRevenue * costRatio).toFixed(2));
    const grossProfit = Number((totalRevenue - totalCOGS).toFixed(2));
    const totalExpenses = this.toNumber(expensesAgg._sum.amount);
    const netProfit = Number((grossProfit - totalExpenses).toFixed(2));

    return {
      summary: {
        totalRevenue,
        costOfGoodsSold: totalCOGS,
        grossProfit,
        grossProfitMargin: totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0,
        totalExpenses,
        netProfit,
        netProfitMargin: totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalSalesRecords / limit),
        totalRecords: totalSalesRecords,
      },
      data: formattedData,
    };
  }

  // ==========================================
  // 4. STOCK REPORT
  // ==========================================
  async getStockReport(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);

    const where: any = {
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
      product: {
        deletedAt: null,
        isActive: true,
        ...(filters.productId && { id: filters.productId }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.brandId && { brandId: filters.brandId }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search } },
            { sku: { contains: filters.search } },
            { productCode: { contains: filters.search } },
          ],
        }),
      },
    };

    const [aggregate, totalRecords, balances] = await Promise.all([
      this.prisma.stockBalance.aggregate({
        where,
        _count: { id: true },
        _sum: { quantity: true },
      }),
      this.prisma.stockBalance.count({ where }),
      this.prisma.stockBalance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { quantity: filters.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          warehouse: { select: { id: true, name: true } },
          product: {
            include: {
              category: { select: { id: true, name: true } },
              brand: { select: { id: true, name: true } },
              baseUnit: { select: { id: true, name: true, shortName: true } },
              prices: true,
            },
          },
        },
      }),
    ]);

    let estimatedStockValue = 0;
    const formattedData = balances.map((b) => {
      const quantity = this.toNumber(b.quantity, 4);
      const purchasePrice =
        b.product?.prices?.find((p) => p.priceType === 'PURCHASE')?.price;
      const unitCost = purchasePrice ? this.toNumber(purchasePrice) : 0;
      const stockValue = Number((quantity * unitCost).toFixed(2));
      estimatedStockValue += stockValue;

      return {
        id: b.id,
        productId: b.productId,
        productCode: b.product.productCode,
        productName: b.product.name,
        sku: b.product.sku,
        category: b.product.category?.name || '',
        brand: b.product.brand?.name || '',
        warehouseName: b.warehouse.name,
        quantity,
        unit: b.product.baseUnit.shortName || b.product.baseUnit.name,
        unitCost,
        stockValue,
        lowStockLevel: b.product.lowStockLevel ? this.toNumber(b.product.lowStockLevel, 4) : null,
      };
    });

    return {
      summary: {
        totalRecords,
        totalQuantity: this.toNumber(aggregate._sum.quantity, 4),
        estimatedStockValue: Number(estimatedStockValue.toFixed(2)),
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: formattedData,
    };
  }

  // ==========================================
  // 5. STOCK LEDGER
  // ==========================================
  async getStockLedger(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);
    const dateRange = this.parseDateRange(filters.startDate, filters.endDate);

    const where: any = {
      ...(filters.productId && { productId: filters.productId }),
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters.transactionType && { transactionType: filters.transactionType }),
      ...(dateRange && { createdAt: dateRange }),
      ...(filters.search && {
        product: {
          OR: [
            { name: { contains: filters.search } },
            { sku: { contains: filters.search } },
          ],
        },
      }),
    };

    const [totalRecords, transactions] = await Promise.all([
      this.prisma.stockTransaction.count({ where }),
      this.prisma.stockTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: filters.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true, productCode: true } },
          warehouse: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true, shortName: true } },
        },
      }),
    ]);

    let totalIn = 0;
    let totalOut = 0;

    const formattedData = transactions.map((tx) => {
      const qty = this.toNumber(tx.baseQuantity, 4);
      const isNegative =
        ['SALE', 'OUT', 'TRANSFER_OUT', 'RETURN_OUT', 'ADJUSTMENT_SUB'].includes(
          tx.transactionType.toUpperCase(),
        ) || qty < 0;

      if (isNegative) {
        totalOut += Math.abs(qty);
      } else {
        totalIn += Math.abs(qty);
      }

      return {
        id: tx.id,
        createdAt: tx.createdAt,
        productName: tx.product.name,
        productCode: tx.product.productCode,
        sku: tx.product.sku,
        warehouseName: tx.warehouse.name,
        transactionType: tx.transactionType,
        referenceId: tx.referenceId,
        quantity: qty,
        unit: tx.unit.shortName || tx.unit.name,
        direction: isNegative ? 'OUT' : 'IN',
      };
    });

    return {
      summary: {
        totalTransactions: totalRecords,
        totalQuantityIn: Number(totalIn.toFixed(4)),
        totalQuantityOut: Number(totalOut.toFixed(4)),
        netChange: Number((totalIn - totalOut).toFixed(4)),
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: formattedData,
    };
  }

  // ==========================================
  // 6. CUSTOMER OUTSTANDING
  // ==========================================
  async getCustomerOutstanding(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);

    const where: any = {
      deletedAt: null,
      ...(filters.customerId && { id: filters.customerId }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search } },
          { phone: { contains: filters.search } },
          { gstin: { contains: filters.search } },
        ],
      }),
    };

    const customers = await this.prisma.customer.findMany({
      where,
      include: {
        sales: {
          where: {
            deletedAt: null,
            ...(filters.branchId && { branchId: filters.branchId }),
            ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
          },
          include: {
            payments: {
              include: {
                payment: { select: { amount: true } },
              },
            },
            returns: { select: { totalAmount: true } },
          },
        },
      },
    });

    let overallBilled = 0;
    let overallPaid = 0;
    let overallOutstanding = 0;
    let customersWithDue = 0;

    const formattedList = customers.map((customer) => {
      let totalBilled = 0;
      let totalPaid = 0;
      let totalReturned = 0;

      customer.sales.forEach((sale) => {
        totalBilled += this.toNumber(sale.grandTotal);
        sale.payments.forEach((p) => {
          totalPaid += this.toNumber(p.payment?.amount);
        });
        sale.returns.forEach((r) => {
          totalReturned += this.toNumber(r.totalAmount);
        });
      });

      const outstanding = Number((totalBilled - totalPaid - totalReturned).toFixed(2));
      if (outstanding > 0) customersWithDue++;

      overallBilled += totalBilled;
      overallPaid += totalPaid;
      overallOutstanding += outstanding;

      return {
        customerId: customer.id,
        name: customer.name,
        phone: customer.phone || '',
        gstin: customer.gstin || '',
        creditLimit: customer.creditLimit ? this.toNumber(customer.creditLimit) : null,
        totalSalesCount: customer.sales.length,
        totalBilled: Number(totalBilled.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        totalReturned: Number(totalReturned.toFixed(2)),
        outstandingBalance: outstanding,
        isOverCreditLimit: customer.creditLimit
          ? outstanding > this.toNumber(customer.creditLimit)
          : false,
      };
    });

    // Sort by outstanding descending
    formattedList.sort((a, b) => b.outstandingBalance - a.outstandingBalance);

    const totalRecords = formattedList.length;
    const paginatedData = formattedList.slice(skip, skip + limit);

    return {
      summary: {
        totalCustomers: totalRecords,
        customersWithOutstanding: customersWithDue,
        totalBilled: Number(overallBilled.toFixed(2)),
        totalPaid: Number(overallPaid.toFixed(2)),
        totalOutstanding: Number(overallOutstanding.toFixed(2)),
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: paginatedData,
    };
  }

  // ==========================================
  // 7. SUPPLIER OUTSTANDING
  // ==========================================
  async getSupplierOutstanding(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);

    const where: any = {
      deletedAt: null,
      ...(filters.supplierId && { id: filters.supplierId }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search } },
          { phone: { contains: filters.search } },
          { gstin: { contains: filters.search } },
        ],
      }),
    };

    const suppliers = await this.prisma.supplier.findMany({
      where,
      include: {
        purchases: {
          where: {
            deletedAt: null,
            ...(filters.branchId && { branchId: filters.branchId }),
            ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
          },
          include: {
            payments: {
              include: {
                payment: { select: { amount: true } },
              },
            },
            returns: { select: { totalAmount: true } },
          },
        },
      },
    });

    let overallPurchased = 0;
    let overallPaid = 0;
    let overallOutstanding = 0;
    let suppliersWithDue = 0;

    const formattedList = suppliers.map((supplier) => {
      let totalPurchased = 0;
      let totalPaid = 0;
      let totalReturned = 0;

      supplier.purchases.forEach((purchase) => {
        totalPurchased += this.toNumber(purchase.grandTotal);
        purchase.payments.forEach((p) => {
          totalPaid += this.toNumber(p.payment?.amount);
        });
        purchase.returns.forEach((r) => {
          totalReturned += this.toNumber(r.totalAmount);
        });
      });

      const outstanding = Number((totalPurchased - totalPaid - totalReturned).toFixed(2));
      if (outstanding > 0) suppliersWithDue++;

      overallPurchased += totalPurchased;
      overallPaid += totalPaid;
      overallOutstanding += outstanding;

      return {
        supplierId: supplier.id,
        name: supplier.name,
        phone: supplier.phone || '',
        gstin: supplier.gstin || '',
        totalPurchasesCount: supplier.purchases.length,
        totalPurchased: Number(totalPurchased.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        totalReturned: Number(totalReturned.toFixed(2)),
        outstandingBalance: outstanding,
      };
    });

    formattedList.sort((a, b) => b.outstandingBalance - a.outstandingBalance);

    const totalRecords = formattedList.length;
    const paginatedData = formattedList.slice(skip, skip + limit);

    return {
      summary: {
        totalSuppliers: totalRecords,
        suppliersWithPayable: suppliersWithDue,
        totalPurchased: Number(overallPurchased.toFixed(2)),
        totalPaid: Number(overallPaid.toFixed(2)),
        totalOutstandingPayable: Number(overallOutstanding.toFixed(2)),
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: paginatedData,
    };
  }

  // ==========================================
  // 8. PAYMENT REPORT
  // ==========================================
  async getPaymentReport(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);
    const dateRange = this.parseDateRange(filters.startDate, filters.endDate);

    const where: any = {
      deletedAt: null,
      ...(dateRange && { paymentDate: dateRange }),
      ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
      ...(filters.search && {
        OR: [
          { referenceNumber: { contains: filters.search } },
          { paymentMethod: { contains: filters.search } },
        ],
      }),
    };

    // Method breakdown aggregation
    const [aggregate, methodGroups, totalRecords, payments] = await Promise.all([
      this.prisma.payment.aggregate({
        where,
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: filters.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          salePayments: {
            include: {
              sale: {
                select: {
                  invoiceNumber: true,
                  customer: { select: { name: true } },
                },
              },
            },
          },
          purchasePayments: {
            include: {
              purchase: {
                select: {
                  invoiceNumber: true,
                  supplier: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedData = payments.map((p) => {
      const isSale = p.salePayments.length > 0;
      const isPurchase = p.purchasePayments.length > 0;

      let type = 'OTHER';
      let partyName = '';
      let invoiceNumber = '';

      if (isSale) {
        type = 'RECEIVED';
        partyName = p.salePayments[0]?.sale?.customer?.name || 'Customer';
        invoiceNumber = p.salePayments[0]?.sale?.invoiceNumber || '';
      } else if (isPurchase) {
        type = 'PAID';
        partyName = p.purchasePayments[0]?.purchase?.supplier?.name || 'Supplier';
        invoiceNumber = p.purchasePayments[0]?.purchase?.invoiceNumber || '';
      }

      return {
        id: p.id,
        paymentDate: p.paymentDate,
        amount: this.toNumber(p.amount),
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber || '',
        type,
        partyName,
        invoiceNumber,
      };
    });

    const paymentMethodsSummary: Record<string, number> = {};
    methodGroups.forEach((g) => {
      paymentMethodsSummary[g.paymentMethod] = this.toNumber(g._sum.amount);
    });

    return {
      summary: {
        totalPaymentsCount: aggregate._count.id,
        totalAmount: this.toNumber(aggregate._sum.amount),
        byMethod: paymentMethodsSummary,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: formattedData,
    };
  }

  // ==========================================
  // 9. EXPENSE REPORT
  // ==========================================
  async getExpenseReport(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);
    const dateRange = this.parseDateRange(filters.startDate, filters.endDate);

    const where: any = {
      deletedAt: null,
      ...(dateRange && { expenseDate: dateRange }),
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.categoryId && { category: filters.categoryId }),
      ...(filters.search && {
        OR: [
          { category: { contains: filters.search } },
          { description: { contains: filters.search } },
        ],
      }),
    };

    const [aggregate, categoryGroups, totalRecords, expenses] = await Promise.all([
      this.prisma.expense.aggregate({
        where,
        _count: { id: true },
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: filters.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true, username: true } },
        },
      }),
    ]);

    const formattedData = expenses.map((exp) => ({
      id: exp.id,
      expenseDate: exp.expenseDate,
      category: exp.category,
      amount: this.toNumber(exp.amount),
      description: exp.description || '',
      branchName: exp.branch?.name || '',
      userName: exp.user?.fullName || exp.user?.username || '',
    }));

    const byCategory: Record<string, { total: number; count: number }> = {};
    categoryGroups.forEach((cg) => {
      byCategory[cg.category] = {
        total: this.toNumber(cg._sum.amount),
        count: cg._count.id,
      };
    });

    return {
      summary: {
        totalExpenseCount: aggregate._count.id,
        totalAmount: this.toNumber(aggregate._sum.amount),
        averageAmount: this.toNumber(aggregate._avg.amount),
        byCategory,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: formattedData,
    };
  }

  // ==========================================
  // 10. GST SUMMARY
  // ==========================================
  async getGstSummary(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);
    const dateRange = this.parseDateRange(filters.startDate, filters.endDate);

    const salesWhere: any = {
      deletedAt: null,
      ...(dateRange && { saleDate: dateRange }),
      ...(filters.branchId && { branchId: filters.branchId }),
    };

    const purchaseWhere: any = {
      deletedAt: null,
      ...(dateRange && { purchaseDate: dateRange }),
      ...(filters.branchId && { branchId: filters.branchId }),
    };

    const [salesAgg, purchasesAgg, totalSalesRecords, sales] = await Promise.all([
      this.prisma.sale.aggregate({
        where: salesWhere,
        _count: { id: true },
        _sum: { subTotal: true, taxTotal: true, grandTotal: true },
      }),
      this.prisma.purchase.aggregate({
        where: purchaseWhere,
        _count: { id: true },
        _sum: { subTotal: true, taxTotal: true, grandTotal: true },
      }),
      this.prisma.sale.count({ where: salesWhere }),
      this.prisma.sale.findMany({
        where: salesWhere,
        skip,
        take: limit,
        orderBy: { saleDate: 'desc' },
        include: {
          customer: { select: { name: true, gstin: true } },
        },
      }),
    ]);

    const outputTax = this.toNumber(salesAgg._sum.taxTotal);
    const inputTax = this.toNumber(purchasesAgg._sum.taxTotal);
    const netGstPayable = Number((outputTax - inputTax).toFixed(2));

    // Formatted Tax Invoices
    const data = sales.map((s) => {
      const tax = this.toNumber(s.taxTotal);
      return {
        id: s.id,
        invoiceNumber: s.invoiceNumber,
        date: s.saleDate,
        partyName: s.customer?.name || 'Walk-in',
        gstin: s.customer?.gstin || 'Unregistered',
        taxableValue: this.toNumber(s.subTotal),
        cgst: Number((tax / 2).toFixed(2)),
        sgst: Number((tax / 2).toFixed(2)),
        igst: 0,
        totalTax: tax,
        totalAmount: this.toNumber(s.grandTotal),
      };
    });

    return {
      summary: {
        outputGst: {
          taxableValue: this.toNumber(salesAgg._sum.subTotal),
          totalTax: outputTax,
          cgst: Number((outputTax / 2).toFixed(2)),
          sgst: Number((outputTax / 2).toFixed(2)),
          igst: 0,
        },
        inputGst: {
          taxableValue: this.toNumber(purchasesAgg._sum.subTotal),
          totalTax: inputTax,
          cgst: Number((inputTax / 2).toFixed(2)),
          sgst: Number((inputTax / 2).toFixed(2)),
          igst: 0,
        },
        netGstLiability: netGstPayable,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalSalesRecords / limit),
        totalRecords: totalSalesRecords,
      },
      data,
    };
  }

  // ==========================================
  // 11. DAILY SALES
  // ==========================================
  async getDailySalesReport(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);
    const dateRange = this.parseDateRange(filters.startDate, filters.endDate);

    const where: any = {
      deletedAt: null,
      ...(dateRange && { saleDate: dateRange }),
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
    };

    const sales = await this.prisma.sale.findMany({
      where,
      select: {
        saleDate: true,
        subTotal: true,
        taxTotal: true,
        discountTotal: true,
        grandTotal: true,
      },
      orderBy: { saleDate: 'desc' },
    });

    const dayMap = new Map<
      string,
      {
        date: string;
        invoicesCount: number;
        subTotal: number;
        taxTotal: number;
        discountTotal: number;
        grandTotal: number;
      }
    >();

    sales.forEach((s) => {
      const dateKey = s.saleDate.toISOString().split('T')[0];
      const existing = dayMap.get(dateKey) || {
        date: dateKey,
        invoicesCount: 0,
        subTotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: 0,
      };

      existing.invoicesCount++;
      existing.subTotal += this.toNumber(s.subTotal);
      existing.taxTotal += this.toNumber(s.taxTotal);
      existing.discountTotal += this.toNumber(s.discountTotal);
      existing.grandTotal += this.toNumber(s.grandTotal);

      dayMap.set(dateKey, existing);
    });

    const dailyList = Array.from(dayMap.values()).map((d) => ({
      ...d,
      subTotal: Number(d.subTotal.toFixed(2)),
      taxTotal: Number(d.taxTotal.toFixed(2)),
      discountTotal: Number(d.discountTotal.toFixed(2)),
      grandTotal: Number(d.grandTotal.toFixed(2)),
    }));

    // Summary calculations
    const totalDays = dailyList.length;
    const totalRevenue = dailyList.reduce((acc, d) => acc + d.grandTotal, 0);
    const totalInvoices = dailyList.reduce((acc, d) => acc + d.invoicesCount, 0);
    const avgDailySales = totalDays > 0 ? totalRevenue / totalDays : 0;
    const highestSalesDay = dailyList.length
      ? dailyList.reduce((max, d) => (d.grandTotal > max.grandTotal ? d : max), dailyList[0])
      : null;

    const totalRecords = dailyList.length;
    const paginatedData = dailyList.slice(skip, skip + limit);

    return {
      summary: {
        totalDays,
        totalInvoices,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        averageDailySales: Number(avgDailySales.toFixed(2)),
        highestSalesDay,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: paginatedData,
    };
  }

  // ==========================================
  // 12. MONTHLY SALES
  // ==========================================
  async getMonthlySalesReport(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);
    const dateRange = this.parseDateRange(filters.startDate, filters.endDate);

    const where: any = {
      deletedAt: null,
      ...(dateRange && { saleDate: dateRange }),
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
    };

    const sales = await this.prisma.sale.findMany({
      where,
      select: {
        saleDate: true,
        subTotal: true,
        taxTotal: true,
        discountTotal: true,
        grandTotal: true,
      },
      orderBy: { saleDate: 'desc' },
    });

    const monthMap = new Map<
      string,
      {
        month: string;
        invoicesCount: number;
        subTotal: number;
        taxTotal: number;
        discountTotal: number;
        grandTotal: number;
      }
    >();

    sales.forEach((s) => {
      const monthKey = s.saleDate.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthMap.get(monthKey) || {
        month: monthKey,
        invoicesCount: 0,
        subTotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: 0,
      };

      existing.invoicesCount++;
      existing.subTotal += this.toNumber(s.subTotal);
      existing.taxTotal += this.toNumber(s.taxTotal);
      existing.discountTotal += this.toNumber(s.discountTotal);
      existing.grandTotal += this.toNumber(s.grandTotal);

      monthMap.set(monthKey, existing);
    });

    const monthlyList = Array.from(monthMap.values()).map((m) => ({
      ...m,
      subTotal: Number(m.subTotal.toFixed(2)),
      taxTotal: Number(m.taxTotal.toFixed(2)),
      discountTotal: Number(m.discountTotal.toFixed(2)),
      grandTotal: Number(m.grandTotal.toFixed(2)),
    }));

    const totalMonths = monthlyList.length;
    const totalRevenue = monthlyList.reduce((acc, m) => acc + m.grandTotal, 0);
    const totalInvoices = monthlyList.reduce((acc, m) => acc + m.invoicesCount, 0);
    const avgMonthlySales = totalMonths > 0 ? totalRevenue / totalMonths : 0;
    const bestMonth = monthlyList.length
      ? monthlyList.reduce((max, m) => (m.grandTotal > max.grandTotal ? m : max), monthlyList[0])
      : null;

    const totalRecords = monthlyList.length;
    const paginatedData = monthlyList.slice(skip, skip + limit);

    return {
      summary: {
        totalMonths,
        totalInvoices,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        averageMonthlySales: Number(avgMonthlySales.toFixed(2)),
        bestMonth,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: paginatedData,
    };
  }

  // ==========================================
  // 13. TOP PRODUCTS
  // ==========================================
  async getTopProductsReport(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);
    const dateRange = this.parseDateRange(filters.startDate, filters.endDate);

    const saleWhere: any = {
      deletedAt: null,
      ...(dateRange && { saleDate: dateRange }),
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
    };

    // Group sale items by product ID with aggregate sums
    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: saleWhere,
        product: {
          deletedAt: null,
          ...(filters.categoryId && { categoryId: filters.categoryId }),
          ...(filters.brandId && { brandId: filters.brandId }),
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
    });

    const totalRecords = grouped.length;
    const paginatedGroups = grouped.slice(skip, skip + limit);

    const productIds = paginatedGroups.map((g) => g.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        baseUnit: { select: { shortName: true, name: true } },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const data = paginatedGroups.map((g, idx) => {
      const product = productMap.get(g.productId);
      return {
        rank: skip + idx + 1,
        productId: g.productId,
        productCode: product?.productCode || '',
        name: product?.name || 'Unknown Product',
        sku: product?.sku || '',
        category: product?.category?.name || '',
        brand: product?.brand?.name || '',
        unit: product?.baseUnit?.shortName || product?.baseUnit?.name || '',
        totalQuantitySold: this.toNumber(g._sum.quantity, 4),
        totalRevenue: this.toNumber(g._sum.total),
        orderCount: g._count.id,
      };
    });

    const totalQuantityAll = grouped.reduce(
      (acc, g) => acc + this.toNumber(g._sum.quantity, 4),
      0,
    );
    const totalRevenueAll = grouped.reduce(
      (acc, g) => acc + this.toNumber(g._sum.total),
      0,
    );

    return {
      summary: {
        totalUniqueProductsSold: totalRecords,
        totalQuantitySold: Number(totalQuantityAll.toFixed(4)),
        totalRevenue: Number(totalRevenueAll.toFixed(2)),
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data,
    };
  }

  // ==========================================
  // 14. LOW STOCK REPORT
  // ==========================================
  async getLowStockReport(filters: ReportFiltersDto) {
    const { page, limit, skip } = this.getPagination(filters.page, filters.limit);

    const where: any = {
      deletedAt: null,
      isActive: true,
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.brandId && { brandId: filters.brandId }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search } },
          { sku: { contains: filters.search } },
          { productCode: { contains: filters.search } },
        ],
      }),
    };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        baseUnit: { select: { shortName: true, name: true } },
        stockBalances: {
          where: {
            ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
          },
          include: {
            warehouse: { select: { name: true } },
          },
        },
      },
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;

    const alertProducts: any[] = [];

    products.forEach((p) => {
      const currentStock = p.stockBalances.reduce(
        (sum, b) => sum + this.toNumber(b.quantity, 4),
        0,
      );

      const lowStockLevel = p.lowStockLevel ? this.toNumber(p.lowStockLevel, 4) : 10;
      const reorderLevel = p.reorderLevel ? this.toNumber(p.reorderLevel, 4) : lowStockLevel;

      if (currentStock <= lowStockLevel) {
        const isOutOfStock = currentStock <= 0;
        if (isOutOfStock) {
          outOfStockCount++;
        } else {
          lowStockCount++;
        }

        alertProducts.push({
          id: p.id,
          productCode: p.productCode,
          name: p.name,
          sku: p.sku,
          category: p.category?.name || '',
          brand: p.brand?.name || '',
          unit: p.baseUnit?.shortName || p.baseUnit?.name || '',
          currentStock,
          lowStockLevel,
          reorderLevel,
          status: isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        });
      }
    });

    alertProducts.sort((a, b) => a.currentStock - b.currentStock);

    const totalRecords = alertProducts.length;
    const paginatedData = alertProducts.slice(skip, skip + limit);

    return {
      summary: {
        totalAlertProducts: totalRecords,
        lowStockCount,
        outOfStockCount,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
      data: paginatedData,
    };
  }
}

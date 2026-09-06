import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../infrastructure/data-access/prisma/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: PrismaService;

  const mockPrisma = {
    sale: {
      aggregate: jest.fn().mockResolvedValue({
        _count: { id: 5 },
        _sum: {
          subTotal: 1000,
          taxTotal: 180,
          discountTotal: 50,
          grandTotal: 1130,
        },
      }),
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'sale-1',
          invoiceNumber: 'INV-001',
          saleDate: new Date('2026-09-01'),
          customer: { id: 'cust-1', name: 'John Doe', phone: '1234567890', email: 'john@example.com' },
          branch: { id: 'branch-1', name: 'Main Branch' },
          warehouse: { id: 'wh-1', name: 'Main WH' },
          payments: [{ payment: { id: 'p-1', amount: 1130, paymentMethod: 'CASH', paymentDate: new Date() } }],
          items: [{ quantity: 2, unitPrice: 500, product: { prices: [{ priceType: 'PURCHASE', price: 300 }] } }],
          _count: { items: 1 },
          subTotal: 1000,
          taxTotal: 180,
          discountTotal: 50,
          grandTotal: 1130,
          status: 'COMPLETED',
        },
      ]),
    },
    purchase: {
      aggregate: jest.fn().mockResolvedValue({
        _count: { id: 3 },
        _sum: {
          subTotal: 800,
          taxTotal: 144,
          discountTotal: 0,
          grandTotal: 944,
        },
      }),
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'pur-1',
          invoiceNumber: 'BILL-001',
          purchaseDate: new Date('2026-09-01'),
          supplier: { id: 'sup-1', name: 'ABC Suppliers', phone: '9876543210' },
          branch: { id: 'branch-1', name: 'Main Branch' },
          warehouse: { id: 'wh-1', name: 'Main WH' },
          payments: [{ payment: { id: 'p-2', amount: 500, paymentMethod: 'BANK_TRANSFER', paymentDate: new Date() } }],
          _count: { items: 2 },
          subTotal: 800,
          taxTotal: 144,
          discountTotal: 0,
          grandTotal: 944,
          status: 'COMPLETED',
        },
      ]),
    },
    expense: {
      aggregate: jest.fn().mockResolvedValue({
        _count: { id: 2 },
        _sum: { amount: 150 },
        _avg: { amount: 75 },
      }),
      groupBy: jest.fn().mockResolvedValue([
        { category: 'Utilities', _sum: { amount: 150 }, _count: { id: 2 } },
      ]),
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'exp-1',
          expenseDate: new Date('2026-09-02'),
          category: 'Utilities',
          amount: 150,
          description: 'Electricity bill',
          branch: { id: 'b-1', name: 'Main Branch' },
          user: { id: 'u-1', fullName: 'Admin User', username: 'admin' },
        },
      ]),
    },
    stockBalance: {
      aggregate: jest.fn().mockResolvedValue({
        _count: { id: 10 },
        _sum: { quantity: 150 },
      }),
      count: jest.fn().mockResolvedValue(10),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'sb-1',
          productId: 'prod-1',
          quantity: 25,
          warehouse: { id: 'wh-1', name: 'Main WH' },
          product: {
            productCode: 'PRD-1',
            name: 'Product 1',
            sku: 'SKU-1',
            category: { id: 'c-1', name: 'Category A' },
            brand: { id: 'b-1', name: 'Brand A' },
            baseUnit: { id: 'u-1', name: 'Piece', shortName: 'PCS' },
            lowStockLevel: 5,
            prices: [{ priceType: 'PURCHASE', price: 200 }],
          },
        },
      ]),
    },
    stockTransaction: {
      count: jest.fn().mockResolvedValue(4),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'st-1',
          createdAt: new Date('2026-09-01'),
          productId: 'prod-1',
          warehouseId: 'wh-1',
          transactionType: 'PURCHASE',
          referenceId: 'REF-1',
          baseQuantity: 10,
          product: { id: 'prod-1', name: 'Product 1', sku: 'SKU-1', productCode: 'PRD-1' },
          warehouse: { id: 'wh-1', name: 'Main WH' },
          unit: { id: 'u-1', name: 'Piece', shortName: 'PCS' },
        },
      ]),
    },
    customer: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'cust-1',
          name: 'Customer 1',
          phone: '1234567890',
          gstin: '29ABCDE1234F1Z5',
          creditLimit: 5000,
          sales: [
            {
              grandTotal: 1000,
              payments: [{ payment: { amount: 600 } }],
              returns: [{ totalAmount: 100 }],
            },
          ],
        },
      ]),
    },
    supplier: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'sup-1',
          name: 'Supplier 1',
          phone: '9876543210',
          gstin: '29XYZDE1234F1Z5',
          purchases: [
            {
              grandTotal: 2000,
              payments: [{ payment: { amount: 1200 } }],
              returns: [{ totalAmount: 200 }],
            },
          ],
        },
      ]),
    },
    payment: {
      aggregate: jest.fn().mockResolvedValue({
        _count: { id: 3 },
        _sum: { amount: 2330 },
      }),
      groupBy: jest.fn().mockResolvedValue([
        { paymentMethod: 'CASH', _sum: { amount: 1130 }, _count: { id: 1 } },
        { paymentMethod: 'BANK_TRANSFER', _sum: { amount: 1200 }, _count: { id: 2 } },
      ]),
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'pay-1',
          paymentDate: new Date('2026-09-01'),
          amount: 1130,
          paymentMethod: 'CASH',
          referenceNumber: 'REF-PAY-1',
          salePayments: [
            {
              sale: {
                invoiceNumber: 'INV-001',
                customer: { name: 'John Doe' },
              },
            },
          ],
          purchasePayments: [],
        },
      ]),
    },
    saleItem: {
      groupBy: jest.fn().mockResolvedValue([
        {
          productId: 'prod-1',
          _sum: { quantity: 50, total: 25000 },
          _count: { id: 10 },
        },
      ]),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'prod-1',
          productCode: 'PRD-1',
          name: 'Product 1',
          sku: 'SKU-1',
          lowStockLevel: 10,
          reorderLevel: 20,
          category: { name: 'Electronics' },
          brand: { name: 'Brand A' },
          baseUnit: { shortName: 'PCS', name: 'Piece' },
          stockBalances: [{ quantity: 3, warehouse: { name: 'Main WH' } }],
        },
      ]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('1. should return sales report', async () => {
    const res = await service.getSalesReport({});
    expect(res.summary.totalSalesCount).toBe(5);
    expect(res.summary.totalGrandTotal).toBe(1130);
    expect(res.data.length).toBe(1);
    expect(res.data[0].invoiceNumber).toBe('INV-001');
  });

  it('2. should return purchase report', async () => {
    const res = await service.getPurchaseReport({});
    expect(res.summary.totalPurchasesCount).toBe(3);
    expect(res.summary.totalGrandTotal).toBe(944);
    expect(res.data.length).toBe(1);
  });

  it('3. should return profit report', async () => {
    const res = await service.getProfitReport({});
    expect(res.summary.totalRevenue).toBe(1130);
    expect(res.summary.grossProfit).toBeDefined();
    expect(res.summary.netProfit).toBeDefined();
  });

  it('4. should return stock report', async () => {
    const res = await service.getStockReport({});
    expect(res.summary.totalQuantity).toBe(150);
    expect(res.data.length).toBe(1);
    expect(res.data[0].productName).toBe('Product 1');
  });

  it('5. should return stock ledger', async () => {
    const res = await service.getStockLedger({});
    expect(res.summary.totalTransactions).toBe(4);
    expect(res.data.length).toBe(1);
    expect(res.data[0].transactionType).toBe('PURCHASE');
  });

  it('6. should return customer outstanding', async () => {
    const res = await service.getCustomerOutstanding({});
    expect(res.summary.totalCustomers).toBe(1);
    expect(res.summary.totalOutstanding).toBe(300); // 1000 billed - 600 paid - 100 returned = 300
    expect(res.data[0].outstandingBalance).toBe(300);
  });

  it('7. should return supplier outstanding', async () => {
    const res = await service.getSupplierOutstanding({});
    expect(res.summary.totalSuppliers).toBe(1);
    expect(res.summary.totalOutstandingPayable).toBe(600); // 2000 purchased - 1200 paid - 200 returned = 600
    expect(res.data[0].outstandingBalance).toBe(600);
  });

  it('8. should return payment report', async () => {
    const res = await service.getPaymentReport({});
    expect(res.summary.totalPaymentsCount).toBe(3);
    expect(res.summary.totalAmount).toBe(2330);
    expect(res.data[0].type).toBe('RECEIVED');
  });

  it('9. should return expense report', async () => {
    const res = await service.getExpenseReport({});
    expect(res.summary.totalExpenseCount).toBe(2);
    expect(res.summary.totalAmount).toBe(150);
    expect(res.summary.byCategory['Utilities']).toBeDefined();
  });

  it('10. should return GST summary', async () => {
    const res = await service.getGstSummary({});
    expect(res.summary.outputGst.totalTax).toBe(180);
    expect(res.summary.inputGst.totalTax).toBe(144);
    expect(res.summary.netGstLiability).toBe(36); // 180 - 144
  });

  it('11. should return daily sales report', async () => {
    const res = await service.getDailySalesReport({});
    expect(res.summary.totalInvoices).toBeGreaterThan(0);
    expect(res.data.length).toBeGreaterThan(0);
  });

  it('12. should return monthly sales report', async () => {
    const res = await service.getMonthlySalesReport({});
    expect(res.summary.totalInvoices).toBeGreaterThan(0);
    expect(res.data.length).toBeGreaterThan(0);
  });

  it('13. should return top products report', async () => {
    const res = await service.getTopProductsReport({});
    expect(res.summary.totalUniqueProductsSold).toBe(1);
    expect(res.data[0].totalRevenue).toBe(25000);
  });

  it('14. should return low stock report', async () => {
    const res = await service.getLowStockReport({});
    expect(res.summary.lowStockCount).toBe(1);
    expect(res.data.length).toBe(1);
    expect(res.data[0].status).toBe('LOW_STOCK');
  });
});

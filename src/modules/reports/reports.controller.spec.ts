import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ExcelService } from './excel.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: ReportsService;
  let excelService: ExcelService;

  const mockReportsService = {
    getSalesReport: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getPurchaseReport: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getProfitReport: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getStockReport: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getStockLedger: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getCustomerOutstanding: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getSupplierOutstanding: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getPaymentReport: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getExpenseReport: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getGstSummary: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getDailySalesReport: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getMonthlySalesReport: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getTopProductsReport: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
    getLowStockReport: jest.fn().mockResolvedValue({ summary: {}, pagination: {}, data: [] }),
  };

  const mockExcelService = {
    exportProducts: jest.fn().mockResolvedValue(Buffer.from('fake-excel-data')),
    importProducts: jest.fn().mockResolvedValue({ success: true, totalRows: 1, importedCount: 1, updatedCount: 0, errors: [] }),
    exportReportToExcel: jest.fn().mockResolvedValue(Buffer.from('fake-report-excel')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: mockReportsService },
        { provide: ExcelService, useValue: mockExcelService },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    reportsService = module.get<ReportsService>(ReportsService);
    excelService = module.get<ExcelService>(ExcelService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getSalesReport', async () => {
    await controller.getSalesReport({});
    expect(reportsService.getSalesReport).toHaveBeenCalled();
  });

  it('should call getPurchaseReport', async () => {
    await controller.getPurchaseReport({});
    expect(reportsService.getPurchaseReport).toHaveBeenCalled();
  });

  it('should call getProfitReport', async () => {
    await controller.getProfitReport({});
    expect(reportsService.getProfitReport).toHaveBeenCalled();
  });

  it('should call getStockReport', async () => {
    await controller.getStockReport({});
    expect(reportsService.getStockReport).toHaveBeenCalled();
  });

  it('should call getStockLedger', async () => {
    await controller.getStockLedger({});
    expect(reportsService.getStockLedger).toHaveBeenCalled();
  });

  it('should call getCustomerOutstanding', async () => {
    await controller.getCustomerOutstanding({});
    expect(reportsService.getCustomerOutstanding).toHaveBeenCalled();
  });

  it('should call getSupplierOutstanding', async () => {
    await controller.getSupplierOutstanding({});
    expect(reportsService.getSupplierOutstanding).toHaveBeenCalled();
  });

  it('should call getPaymentReport', async () => {
    await controller.getPaymentReport({});
    expect(reportsService.getPaymentReport).toHaveBeenCalled();
  });

  it('should call getExpenseReport', async () => {
    await controller.getExpenseReport({});
    expect(reportsService.getExpenseReport).toHaveBeenCalled();
  });

  it('should call getGstSummary', async () => {
    await controller.getGstSummary({});
    expect(reportsService.getGstSummary).toHaveBeenCalled();
  });

  it('should call getDailySalesReport', async () => {
    await controller.getDailySalesReport({});
    expect(reportsService.getDailySalesReport).toHaveBeenCalled();
  });

  it('should call getMonthlySalesReport', async () => {
    await controller.getMonthlySalesReport({});
    expect(reportsService.getMonthlySalesReport).toHaveBeenCalled();
  });

  it('should call getTopProductsReport', async () => {
    await controller.getTopProductsReport({});
    expect(reportsService.getTopProductsReport).toHaveBeenCalled();
  });

  it('should call getLowStockReport', async () => {
    await controller.getLowStockReport({});
    expect(reportsService.getLowStockReport).toHaveBeenCalled();
  });

  it('should export products to excel stream', async () => {
    const res: any = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    await controller.exportProducts({}, res);
    expect(excelService.exportProducts).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.end).toHaveBeenCalled();
  });

  it('should import products from uploaded file', async () => {
    const mockFile: any = {
      buffer: Buffer.from('test-excel'),
    };
    const result = await controller.importProducts(mockFile);
    expect(excelService.importProducts).toHaveBeenCalledWith(mockFile.buffer);
    expect(result.success).toBe(true);
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { ExcelService } from "./excel.service";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { Workbook } from "exceljs";

describe("ExcelService", () => {
  let service: ExcelService;
  let prisma: PrismaService;

  const mockPrisma = {
    product: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "p-1",
          productCode: "PRD-001",
          name: "Wireless Mouse",
          sku: "SKU-001",
          barcode: "8901234567890",
          taxType: "GST",
          isActive: true,
          lowStockLevel: 5,
          reorderLevel: 10,
          description: "Optical mouse",
          hsnCode: "8471",
          category: { name: "Electronics" },
          brand: { name: "Logitech" },
          baseUnit: { name: "Piece", shortName: "PCS" },
          taxRate: { cgstRate: 9, sgstRate: 9, igstRate: 18 },
          stockBalances: [
            { quantity: 50, warehouse: { name: "Main Warehouse" } },
          ],
          prices: [
            { priceType: "PURCHASE", price: 400 },
            { priceType: "RETAIL", price: 650 },
          ],
        },
      ]),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      const tx = {
        warehouse: { findFirst: jest.fn().mockResolvedValue({ id: "wh-1" }) },
        unit: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: "u-1", name: "PCS" }),
        },
        category: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest
            .fn()
            .mockResolvedValue({ id: "c-1", name: "Electronics" }),
        },
        brand: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: "b-1", name: "Logitech" }),
        },
        taxRate: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: "t-1" }),
        },
        product: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: "new-p-1",
            productCode: "PRD-002",
            sku: "SKU-002",
          }),
          update: jest.fn().mockResolvedValue({ id: "p-1" }),
        },
        productUnit: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: "pu-1" }),
        },
        productPrice: {
          upsert: jest.fn().mockResolvedValue({ id: "pp-1" }),
        },
        stockBalance: {
          upsert: jest.fn().mockResolvedValue({ id: "sb-1" }),
        },
      };
      return callback(tx);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExcelService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ExcelService>(ExcelService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should export products to an Excel buffer", async () => {
    const buffer = await service.exportProducts({});
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify generated workbook can be reloaded
    const wb = new Workbook();
    await wb.xlsx.load(buffer as any);
    const sheet = wb.getWorksheet("Products");
    expect(sheet).toBeDefined();
    expect(sheet?.rowCount).toBeGreaterThanOrEqual(2);
    expect(sheet?.getRow(2).getCell(2).value).toBe("Wireless Mouse");
  });

  it("should export general report to an Excel buffer", async () => {
    const buffer = await service.exportReportToExcel(
      "Sample_Report",
      [
        { header: "ID", key: "id" },
        { header: "Name", key: "name" },
      ],
      [{ id: 1, name: "Item 1" }],
    );

    expect(buffer).toBeInstanceOf(Buffer);
    const wb = new Workbook();
    await wb.xlsx.load(buffer as any);
    const sheet = wb.getWorksheet("Sample_Report");
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(2).getCell(2).value).toBe("Item 1");
  });

  it("should import products from Excel file buffer in a transaction", async () => {
    // Generate a valid import workbook in memory
    const wb = new Workbook();
    const sheet = wb.addWorksheet("Sheet1");
    sheet.columns = [
      { header: "Product Code", key: "productCode" },
      { header: "Product Name", key: "name" },
      { header: "SKU", key: "sku" },
      { header: "Category", key: "category" },
      { header: "Unit", key: "unit" },
      { header: "Purchase Price", key: "purchasePrice" },
      { header: "Selling Price", key: "sellingPrice" },
      { header: "Stock", key: "stock" },
    ];
    sheet.addRow({
      productCode: "PRD-TEST-1",
      name: "Keyboard Test",
      sku: "SKU-TEST-1",
      category: "Electronics",
      unit: "PCS",
      purchasePrice: 500,
      sellingPrice: 800,
      stock: 20,
    });

    const fileBuffer = Buffer.from(await wb.xlsx.writeBuffer());
    const res = await service.importProducts(fileBuffer);

    expect(res.success).toBe(true);
    expect(res.totalRows).toBe(1);
    expect(res.importedCount).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

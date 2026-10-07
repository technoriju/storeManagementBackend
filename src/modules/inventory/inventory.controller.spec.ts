import { Test, TestingModule } from "@nestjs/testing";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { StockAdjustmentType } from "./dto/adjust-stock.dto";

describe("InventoryController", () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventoryService = {
    getStocks: jest.fn(),
    getSummary: jest.fn(),
    addStock: jest.fn(),
    adjustStock: jest.fn(),
    getTransactions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should call getStocks on getStocksRoute()", async () => {
    mockInventoryService.getStocks.mockResolvedValue({ items: [], summary: {} });
    const res = await controller.getStocksRoute({});
    expect(service.getStocks).toHaveBeenCalledWith({});
    expect(res).toEqual({ items: [], summary: {} });
  });

  it("should call addStock on addStock()", async () => {
    const dto = { productId: 1, quantity: 15, reason: "Restock" };
    mockInventoryService.addStock.mockResolvedValue({ success: true });
    const res = await controller.addStock(dto);
    expect(service.addStock).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ success: true });
  });

  it("should call adjustStock on adjustStock()", async () => {
    const dto = {
      productId: 1,
      adjustmentType: StockAdjustmentType.SET,
      quantity: 50,
    };
    mockInventoryService.adjustStock.mockResolvedValue({ success: true });
    const res = await controller.adjustStock(dto);
    expect(service.adjustStock).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ success: true });
  });

  it("should call getTransactions on getTransactions()", async () => {
    mockInventoryService.getTransactions.mockResolvedValue([]);
    const res = await controller.getTransactions("1", 1, "ADD_STOCK", 20);
    expect(service.getTransactions).toHaveBeenCalledWith({
      productId: "1",
      warehouseId: 1,
      transactionType: "ADD_STOCK",
      limit: 20,
    });
    expect(res).toEqual([]);
  });

  it("should call getSummary on getSummary()", async () => {
    mockInventoryService.getSummary.mockResolvedValue({ totalProducts: 10 });
    const res = await controller.getSummary();
    expect(service.getSummary).toHaveBeenCalled();
    expect(res).toEqual({ totalProducts: 10 });
  });
});

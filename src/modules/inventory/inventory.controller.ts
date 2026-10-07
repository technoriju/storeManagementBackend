import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { InventoryService } from "./inventory.service";
import { AddStockDto } from "./dto/add-stock.dto";
import { AdjustStockDto } from "./dto/adjust-stock.dto";
import { QueryStockDto } from "./dto/query-stock.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Inventory & Stocks")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(["inventory", "stocks"])
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: "Get stock overview across products" })
  @Get("stocks")
  getStocksRoute(@Query() query: QueryStockDto) {
    return this.inventoryService.getStocks(query);
  }

  @ApiOperation({ summary: "Get stock overview alias" })
  @Get()
  findAll(@Query() query: QueryStockDto) {
    return this.inventoryService.getStocks(query);
  }

  @ApiOperation({ summary: "Get inventory summary KPI metrics" })
  @Get("summary")
  getSummary() {
    return this.inventoryService.getSummary();
  }

  @ApiOperation({ summary: "Add stock to a product" })
  @Post("add-stock")
  addStock(@Body() addStockDto: AddStockDto) {
    return this.inventoryService.addStock(addStockDto);
  }

  @ApiOperation({ summary: "Adjust stock for a product" })
  @Post("adjust-stock")
  adjustStock(@Body() adjustStockDto: AdjustStockDto) {
    return this.inventoryService.adjustStock(adjustStockDto);
  }

  @ApiOperation({ summary: "Get stock transaction history audit log" })
  @Get("transactions")
  getTransactions(
    @Query("productId") productId?: string,
    @Query("warehouseId") warehouseId?: number,
    @Query("transactionType") transactionType?: string,
    @Query("limit") limit?: number,
  ) {
    return this.inventoryService.getTransactions({
      productId,
      warehouseId,
      transactionType,
      limit,
    });
  }
}

@ApiTags("Stock Direct Aliases")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class StockDirectController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: "Get stock transactions alias (/api/v1/transactions)" })
  @Get("transactions")
  getDirectTransactions(
    @Query("productId") productId?: string,
    @Query("warehouseId") warehouseId?: number,
    @Query("transactionType") transactionType?: string,
    @Query("limit") limit?: number,
  ) {
    return this.inventoryService.getTransactions({
      productId,
      warehouseId,
      transactionType,
      limit,
    });
  }

  @ApiOperation({ summary: "Add stock alias (/api/v1/add-stock)" })
  @Post("add-stock")
  addDirectStock(@Body() addStockDto: AddStockDto) {
    return this.inventoryService.addStock(addStockDto);
  }

  @ApiOperation({ summary: "Adjust stock alias (/api/v1/adjust-stock)" })
  @Post("adjust-stock")
  adjustDirectStock(@Body() adjustStockDto: AdjustStockDto) {
    return this.inventoryService.adjustStock(adjustStockDto);
  }
}

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class QueryStockDto {
  @ApiPropertyOptional({ description: "Search query for product name, SKU, code, or barcode" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by category ID" })
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ description: "Filter by brand ID" })
  @IsOptional()
  @Type(() => Number)
  brandId?: number;

  @ApiPropertyOptional({ description: "Filter by warehouse ID" })
  @IsOptional()
  @Type(() => Number)
  warehouseId?: number;

  @ApiPropertyOptional({ description: "Filter by status: IN_STOCK, LOW_STOCK, OUT_OF_STOCK" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "Page number" })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "Items per page" })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

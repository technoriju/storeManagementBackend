import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";
import { IsNumericId } from "../../../common/validators/is-numeric-id.validator";

export class AddStockDto {
  @ApiProperty({ description: "Product ID", example: 1 })
  @IsNumericId()
  productId: string | number;

  @ApiPropertyOptional({ description: "Warehouse ID (optional, defaults to primary warehouse)", example: 1 })
  @IsOptional()
  @IsNumericId()
  warehouseId?: string | number;

  @ApiProperty({ description: "Quantity to add", example: 10, minimum: 0.0001 })
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiPropertyOptional({ description: "Reason for stock addition", example: "Direct stock in" })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: "Reference number or batch code", example: "REF-2026-001" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: "Unit cost/price for this stock in", example: 120.5 })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiPropertyOptional({ description: "Optional notes", example: "Manual restocking" })
  @IsOptional()
  @IsString()
  notes?: string;
}

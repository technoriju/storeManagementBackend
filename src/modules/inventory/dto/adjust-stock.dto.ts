import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { IsNumericId } from "../../../common/validators/is-numeric-id.validator";

export enum StockAdjustmentType {
  ADD = "ADD",
  SUBTRACT = "SUBTRACT",
  SET = "SET",
}

export class AdjustStockDto {
  @ApiProperty({ description: "Product ID", example: 1 })
  @IsNumericId()
  productId: string | number;

  @ApiPropertyOptional({ description: "Warehouse ID (optional)", example: 1 })
  @IsOptional()
  @IsNumericId()
  warehouseId?: string | number;

  @ApiProperty({
    description: "Type of adjustment: ADD (increase), SUBTRACT (decrease), or SET (recount/overwrite)",
    enum: StockAdjustmentType,
    example: StockAdjustmentType.SET,
  })
  @IsEnum(StockAdjustmentType)
  adjustmentType: StockAdjustmentType;

  @ApiProperty({ description: "Quantity value for adjustment", example: 50, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: "Reason for adjustment", example: "Damaged goods / Physical audit" })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: "Optional notes", example: "Quarterly stock audit reconciliation" })
  @IsOptional()
  @IsString()
  notes?: string;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class BulkImportProductItemDto {
  @ApiProperty({ description: "Product name" })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  productCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  categoryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  brandName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  brandId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  unitName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  baseUnitName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  baseUnitId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  subunit?: any;

  @ApiPropertyOptional()
  @IsOptional()
  subUnitId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  conversionRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  purchasePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  wholesalePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  retailPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  mrp?: any;

  @ApiPropertyOptional()
  @IsOptional()
  openingStock?: any;

  @ApiPropertyOptional()
  @IsOptional()
  stockQuantity?: any;

  @ApiPropertyOptional()
  @IsOptional()
  lowStockLevel?: any;

  @ApiPropertyOptional()
  @IsOptional()
  lowStockThreshold?: any;

  @ApiPropertyOptional()
  @IsOptional()
  reorderLevel?: any;

  @ApiPropertyOptional()
  @IsOptional()
  hsn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  hsnCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  gst?: any;

  @ApiPropertyOptional()
  @IsOptional()
  taxRateId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  taxType?: "GST" | "NON_GST";

  @ApiPropertyOptional()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  isPriceInclusive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  batchTracking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  expiryTracking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  serialTracking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  status?: string;

  @IsOptional()
  id?: any;
}

export class BulkImportProductsDto {
  @ApiProperty({ type: [BulkImportProductItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportProductItemDto)
  items: BulkImportProductItemDto[];
}

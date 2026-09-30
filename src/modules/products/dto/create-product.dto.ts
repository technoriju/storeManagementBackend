import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
} from "class-validator";

export class CreateProductsDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  subCategoryId?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  brandId?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taxRateId?: number;

  @ApiProperty()
  @IsNumber()
  baseUnitId: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  defaultPurchaseUnitId?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  defaultSalesUnitId?: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  productCode: string;

  @ApiProperty()
  @IsString()
  sku: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hsnCode?: string;

  @ApiPropertyOptional()
  @IsEnum(["GST", "NON_GST"])
  @IsOptional()
  taxType?: "GST" | "NON_GST";

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPriceInclusive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  batchTracking?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  expiryTracking?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  serialTracking?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  lowStockLevel?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  reorderLevel?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  purchasePrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  wholesalePrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  retailPrice?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  // Added for mobile sync compatibility
  @IsOptional()
  id?: any;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsNumber()
  unitId?: number;

  @IsOptional()
  @IsNumber()
  subUnitId?: number;

  @IsOptional()
  @IsNumber()
  subunitId?: number;

  @IsOptional()
  @IsNumber()
  conversionRate?: number;

  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @IsOptional()
  @IsNumber()
  lowStockThreshold?: number;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  @IsOptional()
  @IsString()
  syncStatus?: string;
}

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
}

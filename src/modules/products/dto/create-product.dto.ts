import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';

export class CreateProductsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subCategoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taxRateId?: string;

  @ApiProperty()
  @IsString()
  baseUnitId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defaultPurchaseUnitId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defaultSalesUnitId?: string;

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
  @IsEnum(['GST', 'NON_GST'])
  @IsOptional()
  taxType?: 'GST' | 'NON_GST';

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

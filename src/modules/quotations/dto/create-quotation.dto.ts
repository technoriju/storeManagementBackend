import { IsString, IsInt, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuotationItemDto {
  @IsNumber()
  productId: any;

  @IsOptional()
  productUnitId?: any;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsNumber()
  total: number;
}

export class CreateQuotationDto {
  @IsString()
  quotationNumber: string;

  @IsInt()
  customerId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  warehouseId?: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsNumber()
  subTotal: number;

  @IsOptional()
  @IsNumber()
  taxTotal?: number;

  @IsOptional()
  @IsNumber()
  discountTotal?: number;

  @IsOptional()
  @IsNumber()
  shipping?: number;

  @IsNumber()
  grandTotal: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}

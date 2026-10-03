import { IsString, IsInt, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SaleReturnItemDto {
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

export class CreateSaleReturnDto {
  @IsNumber()
  saleId: any;

  @IsOptional()
  @IsString()
  returnNumber?: string;

  @IsDateString()
  returnDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  subTotal?: number;

  @IsOptional()
  @IsNumber()
  taxTotal?: number;

  @IsOptional()
  @IsNumber()
  discountTotal?: number;

  @IsNumber()
  totalAmount: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleReturnItemDto)
  items: SaleReturnItemDto[];
}

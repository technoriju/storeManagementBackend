import { IsString, IsInt, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @IsNumber()
  productId: any;

  @IsOptional()
  productUnitId?: any;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  discount: number;

  @IsNumber()
  taxAmount: number;

  @IsNumber()
  total: number;
}

export class CreateSaleDto {
  @IsInt()
  branchId: number;

  @IsInt()
  warehouseId: number;

  @IsInt()
  customerId: number;

  @IsString()
  invoiceNumber: string;

  @IsDateString()
  saleDate: string;

  @IsString()
  status: string;

  @IsNumber()
  subTotal: number;

  @IsNumber()
  taxTotal: number;

  @IsNumber()
  discountTotal: number;

  @IsNumber()
  grandTotal: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsOptional()
  @IsNumber()
  paymentAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

import { IsString, IsInt, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumericId } from '../../../common/validators/is-numeric-id.validator';

export class SaleItemDto {
  @IsNumericId()
  productId: string | number;

  @IsOptional()
  @IsNumericId()
  productUnitId?: string | number;

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

import { IsString, IsInt, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumericId } from '../../../common/validators/is-numeric-id.validator';

export class PurchaseItemDto {
  @IsNumericId()
  productId: string | number;

  @IsOptional()
  @IsNumericId()
  productUnitId?: string | number;

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

export class CreatePurchaseDto {
  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  warehouseId?: number;

  @IsOptional()
  @IsInt()
  supplierId?: number;

  @IsString()
  invoiceNumber: string;

  @IsDateString()
  purchaseDate: string;

  @IsOptional()
  @IsString()
  status?: string;

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
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsOptional()
  @IsNumber()
  paymentAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

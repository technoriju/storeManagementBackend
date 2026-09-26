import { IsString, IsInt, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @IsNumber()
  productId: any;

  @IsNumber()
  productUnitId: any;

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

export class CreatePurchaseDto {
  @IsInt()
  branchId: number;

  @IsInt()
  warehouseId: number;

  @IsInt()
  supplierId: number;

  @IsString()
  invoiceNumber: string;

  @IsDateString()
  purchaseDate: string;

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
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsOptional()
  @IsNumber()
  paymentAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

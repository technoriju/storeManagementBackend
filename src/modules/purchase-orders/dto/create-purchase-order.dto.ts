import { IsString, IsInt, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
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

export class CreatePurchaseOrderDto {
  @IsString()
  orderNumber: string;

  @IsInt()
  supplierId: number;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsInt()
  warehouseId?: number;

  @IsDateString()
  orderDate: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

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
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

import { IsOptional, IsString, IsInt, Min, IsNumber } from "class-validator";
import { Type } from "class-transformer";

export class ReportFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "desc";

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  brandId?: number;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsNumber()
  warehouseId?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  transactionType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  month?: number;

  @IsOptional()
  @Type(() => Number)
  minQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  maxQuantity?: number;

  @IsOptional()
  @IsString()
  exportFormat?: "excel" | "csv" | "pdf"; // if this is present, we return file instead of json
}

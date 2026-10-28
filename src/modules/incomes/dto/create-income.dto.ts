import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateIncomeDto {
  @ApiProperty({ description: "Income amount" })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: "Category of the income" })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: "Date of income (ISO 8601 string)" })
  @IsDateString()
  @IsOptional()
  incomeDate?: string;

  @ApiPropertyOptional({ description: "Description or notes" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Payment reference or transaction ID" })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ description: "Branch ID" })
  @IsNumber()
  @IsOptional()
  branchId?: number;

  @ApiPropertyOptional({ description: "User ID" })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ description: "Status" })
  @IsString()
  @IsOptional()
  status?: string;
}

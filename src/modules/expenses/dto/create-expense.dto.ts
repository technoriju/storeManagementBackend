import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateExpenseDto {
  @ApiProperty({ description: "Expense amount" })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: "Category of the expense" })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: "Date of expense (ISO 8601 string)" })
  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @ApiPropertyOptional({ description: "Description or notes" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Payment reference or invoice ref" })
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

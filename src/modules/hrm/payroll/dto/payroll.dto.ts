import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePayrollDto {
  @ApiProperty({ description: "Employee ID" })
  @IsNumber()
  @IsNotEmpty()
  employeeId: number;

  @ApiPropertyOptional({ description: "Employee name" })
  @IsString()
  @IsOptional()
  employeeName?: string;

  @ApiPropertyOptional({ description: "Department name" })
  @IsString()
  @IsOptional()
  departmentName?: string;

  @ApiPropertyOptional({ description: "Designation name" })
  @IsString()
  @IsOptional()
  designationName?: string;

  @ApiProperty({ description: "Pay period month (e.g. October)" })
  @IsString()
  @IsNotEmpty()
  month: string;

  @ApiProperty({ description: "Pay period year (e.g. 2026)" })
  @IsNumber()
  @IsNotEmpty()
  year: number;

  @ApiProperty({ description: "Base salary amount" })
  @IsNumber()
  @IsNotEmpty()
  basicSalary: number;

  @ApiPropertyOptional({ description: "Allowances amount", default: 0 })
  @IsNumber()
  @IsOptional()
  allowances?: number;

  @ApiPropertyOptional({ description: "Deductions amount", default: 0 })
  @IsNumber()
  @IsOptional()
  deductions?: number;

  @ApiPropertyOptional({ description: "Net salary amount" })
  @IsNumber()
  @IsOptional()
  netSalary?: number;

  @ApiPropertyOptional({ description: "Voucher status: PENDING | GENERATED | PAID", default: "GENERATED" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Remarks or notes" })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class MarkPayrollPaidDto {
  @ApiPropertyOptional({ description: "Disbursal date (YYYY-MM-DD)" })
  @IsString()
  @IsOptional()
  paymentDate?: string;

  @ApiPropertyOptional({ description: "Payment method: BANK_TRANSFER | CASH | CHEQUE", default: "BANK_TRANSFER" })
  @IsString()
  @IsOptional()
  paymentMethod?: string;
}

import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateLeaveTypeDto {
  @ApiProperty({ description: "Leave category name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Days allowed per year", default: 12 })
  @IsNumber()
  @IsNotEmpty()
  daysAllowed: number;

  @ApiPropertyOptional({ description: "Policy guidelines" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Status", default: "ACTIVE" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class CreateLeaveRequestDto {
  @ApiProperty({ description: "Employee ID" })
  @IsNumber()
  @IsNotEmpty()
  employeeId: number;

  @ApiProperty({ description: "Leave Type ID" })
  @IsNumber()
  @IsNotEmpty()
  leaveTypeId: number;

  @ApiProperty({ description: "Start date (YYYY-MM-DD)" })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: "End date (YYYY-MM-DD)" })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ description: "Number of leave days", default: 1 })
  @IsNumber()
  @IsOptional()
  days?: number;

  @ApiProperty({ description: "Reason for taking leave" })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: "Approval status", default: "PENDING" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class UpdateLeaveStatusDto {
  @ApiProperty({ description: "New status: APPROVED | REJECTED | PENDING" })
  @IsString()
  @IsNotEmpty()
  status: "APPROVED" | "REJECTED" | "PENDING";

  @ApiPropertyOptional({ description: "Approver name" })
  @IsString()
  @IsOptional()
  approvedBy?: string;
}

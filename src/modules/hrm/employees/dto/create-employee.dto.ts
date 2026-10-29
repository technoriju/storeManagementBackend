import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEmail } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateEmployeeDto {
  @ApiPropertyOptional({ description: "Employee code. Auto-generated if not provided" })
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @ApiProperty({ description: "First name" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: "Last name" })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: "Work email" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "Phone number" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: "Department ID" })
  @IsNumber()
  @IsOptional()
  departmentId?: number;

  @ApiPropertyOptional({ description: "Department name cache" })
  @IsString()
  @IsOptional()
  departmentName?: string;

  @ApiPropertyOptional({ description: "Designation ID" })
  @IsNumber()
  @IsOptional()
  designationId?: number;

  @ApiPropertyOptional({ description: "Designation name cache" })
  @IsString()
  @IsOptional()
  designationName?: string;

  @ApiPropertyOptional({ description: "Shift ID" })
  @IsNumber()
  @IsOptional()
  shiftId?: number;

  @ApiPropertyOptional({ description: "Shift name cache" })
  @IsString()
  @IsOptional()
  shiftName?: string;

  @ApiPropertyOptional({ description: "Joining date (YYYY-MM-DD)" })
  @IsString()
  @IsOptional()
  joiningDate?: string;

  @ApiPropertyOptional({ description: "Monthly base salary" })
  @IsNumber()
  @IsOptional()
  salary?: number;

  @ApiPropertyOptional({ description: "Employment type", default: "FULL_TIME" })
  @IsString()
  @IsOptional()
  employmentType?: string;

  @ApiPropertyOptional({ description: "Status", default: "ACTIVE" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Home address" })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: "Emergency contact phone" })
  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

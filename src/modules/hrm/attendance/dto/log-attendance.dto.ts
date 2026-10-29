import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LogAttendanceDto {
  @ApiProperty({ description: "Employee ID" })
  @IsNumber()
  @IsNotEmpty()
  employeeId: number;

  @ApiProperty({ description: "Date of record (YYYY-MM-DD)" })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: "Clock in time (HH:mm)" })
  @IsString()
  @IsOptional()
  clockIn?: string;

  @ApiPropertyOptional({ description: "Clock out time (HH:mm)" })
  @IsString()
  @IsOptional()
  clockOut?: string;

  @ApiPropertyOptional({ description: "Attendance status", default: "PRESENT" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Total work hours" })
  @IsNumber()
  @IsOptional()
  totalHours?: number;

  @ApiPropertyOptional({ description: "Notes or remark" })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

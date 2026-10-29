import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateShiftDto {
  @ApiProperty({ description: "Shift title" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Shift code" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: "Start time (HH:mm)" })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: "End time (HH:mm)" })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ description: "Grace period for late check-in (minutes)", default: 15 })
  @IsNumber()
  @IsOptional()
  lateToleranceMinutes?: number;

  @ApiPropertyOptional({ description: "Break duration (minutes)", default: 60 })
  @IsNumber()
  @IsOptional()
  breakDurationMinutes?: number;

  @ApiPropertyOptional({ description: "Status", default: "ACTIVE" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

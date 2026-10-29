import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDesignationDto {
  @ApiProperty({ description: "Designation title" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Designation unique code" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: "Department ID" })
  @IsNumber()
  @IsOptional()
  departmentId?: number;

  @ApiPropertyOptional({ description: "Department name cache" })
  @IsString()
  @IsOptional()
  departmentName?: string;

  @ApiPropertyOptional({ description: "Role description" })
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

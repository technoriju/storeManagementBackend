import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDepartmentDto {
  @ApiProperty({ description: "Department name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Department unique code" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: "Department head or manager" })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional({ description: "Department description" })
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

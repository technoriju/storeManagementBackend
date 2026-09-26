import { IsString, IsOptional, IsNotEmpty, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUnitDto {
  @ApiProperty({ description: "Name of the unit" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Short name of the unit" })
  @IsString()
  @IsNotEmpty()
  shortName: string;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ description: "Status" })
  @IsString()
  @IsOptional()
  status?: string;
}

import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateHolidayDto {
  @ApiProperty({ description: "Holiday name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Date (YYYY-MM-DD)" })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: "Classification: PUBLIC | COMPANY | OPTIONAL", default: "PUBLIC" })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: "Holiday details" })
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

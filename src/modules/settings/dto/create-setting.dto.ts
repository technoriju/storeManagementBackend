import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateSettingDto {
  @ApiProperty({ description: "Setting key" })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiPropertyOptional({ description: "Setting value" })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

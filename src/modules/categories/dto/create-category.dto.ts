import { IsString, IsOptional, IsNotEmpty, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({ description: "The name of the category" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Description of the category" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Device ID associated with the creation",
  })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
} from "class-validator";

export class CreateSubCategoriesDto {
  @ApiProperty()
  @IsNumber()
  categoryId: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

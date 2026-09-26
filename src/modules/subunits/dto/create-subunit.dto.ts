import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateSubUnitDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  parentUnitId: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  multiplier?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

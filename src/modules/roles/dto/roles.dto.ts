import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt } from "class-validator";
import { Type } from "class-transformer";

export class CreateRoleDto {
  @ApiProperty({ example: "Manager", description: "Unique name of the role" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "Store manager with access to sales and inventory" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: [1, 2, 3], type: [Number], description: "List of permission IDs to assign" })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  permissionIds?: number[];

  @ApiPropertyOptional({ example: ["dashboard:view", "sales:view"], type: [String], description: "List of permission action strings" })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: "Senior Manager" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "Updated description for the role" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: [1, 2, 5, 6], type: [Number], description: "Synced list of permission IDs" })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  permissionIds?: number[];

  @ApiPropertyOptional({ example: ["dashboard:view", "sales:view"], type: [String], description: "Synced list of permission action strings" })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}

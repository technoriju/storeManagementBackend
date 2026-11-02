import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsInt,
  IsBoolean,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateUserDto {
  @ApiProperty({ example: "john_doe", description: "Unique username for login" })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: "Secret123!", description: "Plain text password (will be hashed)" })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: "John Doe", description: "Full name of the user" })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: "john@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 1, description: "Role ID" })
  @IsInt()
  @Type(() => Number)
  roleId: number;

  @ApiPropertyOptional({ example: 1, description: "Assigned branch ID" })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({ example: 1, description: "Assigned company ID" })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  companyId?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: "john@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 2, description: "Updated role ID" })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  roleId?: number;

  @ApiPropertyOptional({ example: 1, description: "Updated branch ID" })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({ example: 1, description: "Updated company ID" })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  companyId?: number;

  @ApiPropertyOptional({ example: "NewSecretPassword123" })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ example: "CurrentPassword123" })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ example: "NewPassword123" })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ToggleUserStatusDto {
  @ApiProperty({ example: true, description: "Whether user account is active" })
  @IsBoolean()
  isActive: boolean;
}

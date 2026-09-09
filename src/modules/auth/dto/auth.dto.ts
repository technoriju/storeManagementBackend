import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin", description: "The username of the user" })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    example: "password123",
    description: "The password of the user",
  })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    required: false,
    description: "Optional device ID for the session",
  })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: "The refresh token" })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class RegisterDto {
  @ApiProperty({
    example: "My Company",
    description: "The name of the company",
  })
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @ApiProperty({ example: "admin", description: "The username of the user" })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    example: "password123",
    description: "The password of the user",
  })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    example: "John Doe",
    description: "The full name of the user",
  })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ required: false, description: "User email" })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, description: "User phone number" })
  @IsString()
  @IsOptional()
  phone?: string;
}

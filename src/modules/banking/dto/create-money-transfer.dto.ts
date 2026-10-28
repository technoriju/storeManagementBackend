import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMoneyTransferDto {
  @ApiProperty({ description: "Source bank or cash account ID" })
  @IsNumber()
  @IsNotEmpty()
  fromAccountId: number;

  @ApiProperty({ description: "Destination bank or cash account ID" })
  @IsNumber()
  @IsNotEmpty()
  toAccountId: number;

  @ApiProperty({ description: "Transfer amount" })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ description: "Transfer date" })
  @IsDateString()
  @IsOptional()
  transferDate?: string;

  @ApiPropertyOptional({ description: "Reference / Cheque # / Txn ID" })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ description: "Notes or description" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

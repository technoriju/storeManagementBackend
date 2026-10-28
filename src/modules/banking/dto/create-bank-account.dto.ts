import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateBankAccountDto {
  @ApiProperty({ description: "Account name or display title" })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiPropertyOptional({ description: "Account number" })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional({ description: "Bank name" })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ description: "Branch name" })
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiPropertyOptional({ description: "IFSC code / routing number" })
  @IsString()
  @IsOptional()
  ifscCode?: string;

  @ApiPropertyOptional({ description: "Type: BANK or CASH" })
  @IsString()
  @IsOptional()
  accountType?: string;

  @ApiPropertyOptional({ description: "Initial opening balance" })
  @IsNumber()
  @IsOptional()
  openingBalance?: number;

  @ApiPropertyOptional({ description: "Status" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Device ID" })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

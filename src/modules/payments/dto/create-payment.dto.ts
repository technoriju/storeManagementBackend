import { IsNotEmpty, IsNumber, IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePaymentDto {
  @ApiProperty({ description: "Payment amount", example: 100.5 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ description: "Payment method (cash, upi, card, etc.)", example: "cash", required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ description: "Payment method alias", example: "cash", required: false })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({ description: "Payment type ('receive' or 'pay')", example: "receive", required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: "Reference number", example: "REF12345", required: false })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty({ description: "Reference alias", example: "REF12345", required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: "Notes", example: "Payment notes", required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: "Customer ID", example: 1, required: false })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({ description: "Supplier ID", example: 1, required: false })
  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @ApiProperty({ description: "Payment date", required: false })
  @IsOptional()
  paymentDate?: any;

  @ApiProperty({ description: "Creation timestamp", required: false })
  @IsOptional()
  createdAt?: any;

  @ApiProperty({ description: "Updated timestamp", required: false })
  @IsOptional()
  updatedAt?: any;

  @ApiProperty({ description: "Client temporary id", required: false })
  @IsOptional()
  id?: any;

  @ApiProperty({ description: "Backend ID", required: false })
  @IsOptional()
  backendId?: any;

  @ApiProperty({ description: "Sync status", required: false })
  @IsOptional()
  syncStatus?: any;
}

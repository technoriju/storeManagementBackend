import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export enum BarcodeSymbologyEnum {
  CODE128 = "CODE128",
  EAN13 = "EAN13",
  CODE39 = "CODE39",
  UPC = "UPC",
  QR = "QR",
}

export class BarcodeItemOverrideDto {
  @ApiProperty({ description: "Product ID" })
  @IsNumber()
  productId: number;

  @ApiPropertyOptional({ description: "Quantity of barcode stickers to print" })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ description: "Custom barcode override" })
  @IsOptional()
  @IsString()
  barcode?: string;
}

export class GenerateBarcodePayloadDto {
  @ApiPropertyOptional({ description: "Array of product IDs to retrieve barcode data for" })
  @IsOptional()
  @IsArray()
  productIds?: number[];

  @ApiPropertyOptional({ description: "Optional overrides for quantities or barcodes", type: [BarcodeItemOverrideDto] })
  @IsOptional()
  @IsArray()
  items?: BarcodeItemOverrideDto[];

  @ApiPropertyOptional({ enum: BarcodeSymbologyEnum, default: BarcodeSymbologyEnum.CODE128 })
  @IsOptional()
  @IsEnum(BarcodeSymbologyEnum)
  symbology?: BarcodeSymbologyEnum;
}

export class GenerateUniqueBarcodeDto {
  @ApiPropertyOptional({ description: "Barcode format to generate (e.g. EAN13 or CODE128)", default: "CODE128" })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: "Optional prefix" })
  @IsOptional()
  @IsString()
  prefix?: string;
}

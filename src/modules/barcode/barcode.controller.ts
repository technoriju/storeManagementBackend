import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { BarcodeService } from "./barcode.service";
import {
  GenerateBarcodePayloadDto,
  GenerateUniqueBarcodeDto,
} from "./dto/generate-barcode.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Barcode")
@Controller("barcode")
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @ApiOperation({ summary: "Get standard barcode paper & label size presets" })
  @Get("presets")
  getPresets() {
    return this.barcodeService.getPresets();
  }

  @ApiOperation({ summary: "Batch format product data for barcode printing" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("preview-data")
  getBarcodePrintPayload(@Body() dto: GenerateBarcodePayloadDto) {
    return this.barcodeService.getBarcodePrintPayload(dto);
  }

  @ApiOperation({ summary: "Generate unique scannable barcode string" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("generate-unique")
  generateUniqueBarcode(@Body() dto: GenerateUniqueBarcodeDto) {
    return this.barcodeService.generateUniqueBarcode(dto);
  }

  @ApiOperation({ summary: "Assign or generate barcode for product" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("assign/:productId")
  assignBarcode(
    @Param("productId", ParseIntPipe) productId: number,
    @Body("barcode") barcode?: string
  ) {
    return this.barcodeService.assignBarcodeToProduct(productId, barcode);
  }
}

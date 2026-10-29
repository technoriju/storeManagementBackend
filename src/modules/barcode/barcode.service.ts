import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import {
  GenerateBarcodePayloadDto,
  GenerateUniqueBarcodeDto,
  BarcodeSymbologyEnum,
} from "./dto/generate-barcode.dto";

@Injectable()
export class BarcodeService {
  constructor(private prisma: PrismaService) {}

  /**
   * Return predefined standard industrial & retail paper label presets
   */
  getPresets() {
    return [
      {
        id: "thermal_50x25",
        name: "Thermal 50mm × 25mm (2\" × 1\")",
        type: "thermal",
        widthMm: 50,
        heightMm: 25,
        columns: 1,
        gapMm: 2,
        description: "Standard single-roll retail barcode printer size (Zebra, TSC, TVS)",
      },
      {
        id: "thermal_38x25",
        name: "Thermal 38mm × 25mm (1.5\" × 1\")",
        type: "thermal",
        widthMm: 38,
        heightMm: 25,
        columns: 1,
        gapMm: 2,
        description: "Compact roll size for small items & jewelry tags",
      },
      {
        id: "thermal_50x30",
        name: "Thermal 50mm × 30mm",
        type: "thermal",
        widthMm: 50,
        heightMm: 30,
        columns: 1,
        gapMm: 2,
        description: "Extra vertical height for multi-line product names & MRP",
      },
      {
        id: "sheet_a4_24",
        name: "A4 Sheet — 24 Labels (3 × 8)",
        type: "sheet",
        widthMm: 70,
        heightMm: 37,
        columns: 3,
        rows: 8,
        gapMm: 0,
        description: "Standard laser/inkjet sticker sheets (Avery 7160 compatible)",
      },
      {
        id: "sheet_a4_30",
        name: "A4 Sheet — 30 Labels (3 × 10)",
        type: "sheet",
        widthMm: 70,
        heightMm: 29.7,
        columns: 3,
        rows: 10,
        gapMm: 0,
        description: "Standard laser/inkjet sticker sheets (Avery 7159 compatible)",
      },
      {
        id: "sheet_a4_40",
        name: "A4 Sheet — 40 Labels (4 × 10)",
        type: "sheet",
        widthMm: 52.5,
        heightMm: 29.7,
        columns: 4,
        rows: 10,
        gapMm: 0,
        description: "Compact density 4-column sticker sheet",
      },
      {
        id: "sheet_a4_65",
        name: "A4 Sheet — 65 Labels (5 × 13)",
        type: "sheet",
        widthMm: 38.1,
        heightMm: 21.2,
        columns: 5,
        rows: 13,
        gapMm: 0,
        description: "High-density mini labels (Avery 7651 compatible)",
      },
    ];
  }

  /**
   * Bulk retrieve and format products barcode print payload
   */
  async getBarcodePrintPayload(dto: GenerateBarcodePayloadDto) {
    let ids: number[] = [];

    if (dto.items && dto.items.length > 0) {
      ids = dto.items.map((i) => Number(i.productId)).filter(Boolean);
    } else if (dto.productIds && dto.productIds.length > 0) {
      ids = dto.productIds.map((id) => Number(id)).filter(Boolean);
    }

    const where: any = { deletedAt: null };
    if (ids.length > 0) {
      where.id = { in: ids.map((id) => BigInt(id)) };
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        baseUnit: true,
        stockBalances: true,
      },
      take: ids.length > 0 ? ids.length : 100,
    });

    const overrideMap = new Map<number, { quantity?: number; barcode?: string }>();
    if (dto.items) {
      dto.items.forEach((it) => overrideMap.set(Number(it.productId), it));
    }

    const payload = products.map((prod) => {
      const pid = Number(prod.id);
      const override = overrideMap.get(pid);

      const stockQuantity =
        prod.stockBalances?.reduce((sum, b) => sum + Number(b.quantity || 0), 0) ?? 0;

      const barcodeValue =
        override?.barcode ||
        prod.barcode ||
        prod.sku ||
        String(prod.id).padStart(8, "0");

      return {
        productId: pid,
        name: prod.name,
        sku: prod.sku,
        barcode: barcodeValue,
        price: prod.retailPrice ? Number(prod.retailPrice) : 0,
        mrp: prod.retailPrice ? Number(prod.retailPrice) : 0,
        categoryName: prod.category?.name || null,
        brandName: prod.brand?.name || null,
        unitName: prod.baseUnit?.name || null,
        stockQuantity,
        quantity: override?.quantity !== undefined && override?.quantity !== null ? override.quantity : 1,
      };
    });

    return {
      success: true,
      count: payload.length,
      symbology: dto.symbology || BarcodeSymbologyEnum.CODE128,
      data: payload,
    };
  }

  /**
   * Compute valid EAN-13 check digit (modulo 10 with weights 1 and 3)
   */
  private calculateEan13CheckDigit(first12Digits: string): string {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(first12Digits[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const remainder = sum % 10;
    return String(remainder === 0 ? 0 : 10 - remainder);
  }

  /**
   * Generate an automated guaranteed unique barcode (EAN-13 or Code-128)
   */
  async generateUniqueBarcode(dto: GenerateUniqueBarcodeDto) {
    const isEan13 = (dto.format || "").toUpperCase() === "EAN13";
    let attempts = 0;
    let generatedBarcode = "";

    while (attempts < 10) {
      attempts++;
      if (isEan13) {
        // Use 200 (in-store/restricted distribution prefix) or custom prefix
        const prefix = (dto.prefix || "200").slice(0, 3).padEnd(3, "0");
        const randomPart = Math.floor(Math.random() * 1000000000)
          .toString()
          .padStart(9, "0");
        const first12 = prefix + randomPart;
        generatedBarcode = first12 + this.calculateEan13CheckDigit(first12);
      } else {
        const prefix = dto.prefix ? `${dto.prefix}-` : "SKU-";
        const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestamp = Date.now().toString().slice(-4);
        generatedBarcode = `${prefix}${randomHex}${timestamp}`;
      }

      const existing = await this.prisma.product.findFirst({
        where: { barcode: generatedBarcode, deletedAt: null },
      });

      if (!existing) {
        return {
          barcode: generatedBarcode,
          format: isEan13 ? "EAN13" : "CODE128",
        };
      }
    }

    throw new BadRequestException("Could not generate a unique barcode. Please retry.");
  }

  /**
   * Assign or update a product's barcode in database
   */
  async assignBarcodeToProduct(productId: number, barcode?: string) {
    const prod = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!prod) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    let codeToAssign = barcode;
    if (!codeToAssign) {
      const generated = await this.generateUniqueBarcode({ format: "CODE128" });
      codeToAssign = generated.barcode;
    }

    const updated = await this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: { barcode: codeToAssign },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        retailPrice: true,
      },
    });

    return {
      success: true,
      product: {
        ...updated,
        id: Number(updated.id),
        retailPrice: Number(updated.retailPrice || 0),
      },
    };
  }
}

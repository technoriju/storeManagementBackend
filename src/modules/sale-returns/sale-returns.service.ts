import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateSaleReturnDto } from "./dto/create-sale-return.dto";

@Injectable()
export class SaleReturnsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateSaleReturnDto) {
    const { items, saleId, ...returnData } = createDto;
    const saleIdBigInt = BigInt(saleId);

    const sale = await this.prisma.sale.findUnique({
      where: { id: saleIdBigInt },
    });
    if (!sale) {
      throw new NotFoundException(`Sale with id ${saleId} not found`);
    }

    const returnNumber = returnData.returnNumber || `SRT-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve product units and quantities
      const resolvedItems: any[] = [];
      for (const item of items) {
        const prodId = BigInt(item.productId);
        const product = await tx.product.findUnique({
          where: { id: prodId },
          include: { productUnits: true },
        });
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

        let puId = item.productUnitId ? BigInt(item.productUnitId) : null;
        let pu = puId ? await tx.productUnit.findUnique({ where: { id: puId } }) : null;

        if (!pu) {
          if (product.defaultSalesUnitId) {
            pu = await tx.productUnit.findUnique({ where: { id: product.defaultSalesUnitId } });
          } else if (product.productUnits && product.productUnits.length > 0) {
            pu = product.productUnits[0];
          }
        }

        const conversionFactor = pu ? Number(pu.conversionFactor || 1) : 1;
        const baseQuantity = item.quantity * conversionFactor;

        resolvedItems.push({
          ...item,
          productId: prodId,
          productUnitId: pu ? pu.id : null,
          unitId: product.baseUnitId,
          baseQuantity,
        });
      }

      // 2. Create SaleReturn
      const saleReturn = await tx.saleReturn.create({
        data: {
          ...returnData,
          saleId: saleIdBigInt,
          returnNumber,
          returnDate: new Date(returnData.returnDate),
          status: returnData.status || "Received",
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxAmount: item.taxAmount || 0,
              discount: item.discount || 0,
              total: item.total,
            })),
          },
        },
        include: { items: { include: { product: true } }, sale: true },
      });

      // 3. Restock items into warehouse inventory (if warehouse present)
      if (sale.warehouseId) {
        for (const item of resolvedItems) {
          const existingStock = await tx.stockBalance.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: sale.warehouseId,
              },
            },
          });

          if (existingStock) {
            await tx.stockBalance.update({
              where: { id: existingStock.id },
              data: { quantity: Number(existingStock.quantity) + item.baseQuantity },
            });
          } else {
            await tx.stockBalance.create({
              data: {
                productId: item.productId,
                warehouseId: sale.warehouseId,
                quantity: item.baseQuantity,
              },
            });
          }

          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              warehouseId: sale.warehouseId,
              transactionType: "SALE_RETURN",
              referenceId: `SALE-RETURN-${saleReturn.id}`,
              unitId: item.unitId,
              unitQuantity: item.quantity,
              baseQuantity: item.baseQuantity,
            },
          });
        }
      }

      return saleReturn;
    });
  }

  async findAll() {
    return this.prisma.saleReturn.findMany({
      where: { deletedAt: null },
      include: {
        sale: { include: { customer: true } },
        items: { include: { product: true } },
      },
      orderBy: { id: "desc" },
    });
  }

  async findOne(id: bigint) {
    const item = await this.prisma.saleReturn.findFirst({
      where: { id, deletedAt: null },
      include: {
        sale: { include: { customer: true } },
        items: { include: { product: true } },
      },
    });
    if (!item) {
      throw new NotFoundException("Sale return not found");
    }
    return item;
  }

  async remove(id: bigint) {
    await this.findOne(id);
    return this.prisma.saleReturn.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

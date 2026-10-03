import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto) {
    const { items, paymentAmount, paymentMethod, ...saleData } = createSaleDto;

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
          } else {
            pu = await tx.productUnit.create({
              data: {
                productId: product.id,
                unitId: product.baseUnitId,
                conversionFactor: 1,
              },
            });
          }
          puId = pu.id;
        }

        const conversionFactor = Number(pu.conversionFactor || 1);
        const baseQuantity = item.quantity * conversionFactor;

        resolvedItems.push({
          ...item,
          productId: prodId,
          productUnitId: puId,
          unitId: pu.unitId,
          baseQuantity,
        });
      }

      // 2. Create Sale
      const sale = await tx.sale.create({
        data: {
          ...saleData,
          saleDate: new Date(saleData.saleDate),
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              taxAmount: item.taxAmount,
              total: item.total,
            })),
          },
        },
        include: { items: true },
      });

      // 3. Handle Stock Updates (Subtract for sale in base quantity)
      for (const item of resolvedItems) {
        const existingStock = await tx.stockBalance.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: saleData.warehouseId,
            },
          },
        });

        if (!existingStock || Number(existingStock.quantity) < item.baseQuantity) {
          // If stock record doesn't exist, create it or warn (some systems allow negative stock if configured)
          if (!existingStock) {
            await tx.stockBalance.create({
              data: {
                productId: item.productId,
                warehouseId: saleData.warehouseId,
                quantity: -item.baseQuantity,
              },
            });
          } else {
            await tx.stockBalance.update({
              where: { id: existingStock.id },
              data: { quantity: Number(existingStock.quantity) - item.baseQuantity },
            });
          }
        } else {
          await tx.stockBalance.update({
            where: { id: existingStock.id },
            data: { quantity: Number(existingStock.quantity) - item.baseQuantity },
          });
        }

        // Create StockTransaction
        await tx.stockTransaction.create({
          data: {
            productId: item.productId,
            warehouseId: saleData.warehouseId,
            transactionType: "SALE",
            referenceId: `SALE-${sale.id}`,
            unitId: item.unitId,
            unitQuantity: -item.quantity,
            baseQuantity: -item.baseQuantity,
          },
        });
      }

      // 3. Handle Payment
      if (paymentAmount && paymentAmount > 0) {
        const payment = await tx.payment.create({
          data: {
            paymentDate: new Date(),
            amount: paymentAmount,
            paymentMethod: paymentMethod || "CASH",
            referenceNumber: sale.invoiceNumber
          }
        });

        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            paymentId: payment.id
          }
        });
      }

      return sale;
    });
  }

  async findAll() {
    return this.prisma.sale.findMany({
      where: { deletedAt: null },
      include: {
        customer: true,
        warehouse: true,
        branch: true,
        items: { include: { product: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: any) {
    const item = await this.prisma.sale.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        warehouse: true,
        branch: true,
        items: { include: { product: true } },
        payments: { include: { payment: true } },
      },
    });
    if (!item) {
      throw new NotFoundException("Sale not found");
    }
    return item;
  }

  async update(id: any, updateSaleDto: UpdateSaleDto) {
    await this.findOne(id);
    return this.prisma.sale.update({
      where: { id },
      data: updateSaleDto as any,
    });
  }

  async remove(id: any) {
    await this.findOne(id);
    return this.prisma.sale.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

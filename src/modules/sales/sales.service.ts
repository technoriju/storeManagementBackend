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
      // 1. Create Sale
      const sale = await tx.sale.create({
        data: {
          ...saleData,
          saleDate: new Date(saleData.saleDate),
          items: {
            create: items.map(item => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              taxAmount: item.taxAmount,
              total: item.total
            }))
          }
        },
        include: { items: true }
      });

      // 2. Handle Stock Updates
      for (const item of items) {
        const productUnit = await tx.productUnit.findUnique({
          where: { id: item.productUnitId }
        });
        
        if (!productUnit) throw new NotFoundException(`Product Unit ${item.productUnitId} not found`);
        
        const conversionFactor = Number(productUnit.conversionFactor || 1);
        const baseQuantity = item.quantity * conversionFactor;

        // Upsert StockBalance (Subtract for sale)
        const existingStock = await tx.stockBalance.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: saleData.warehouseId,
            }
          }
        });

        if (!existingStock || Number(existingStock.quantity) < baseQuantity) {
          throw new BadRequestException(`Insufficient stock for product ${item.productId} in warehouse ${saleData.warehouseId}`);
        }

        await tx.stockBalance.update({
          where: { id: existingStock.id },
          data: { quantity: Number(existingStock.quantity) - baseQuantity }
        });

        // Create StockTransaction
        await tx.stockTransaction.create({
          data: {
            productId: item.productId,
            warehouseId: saleData.warehouseId,
            transactionType: "SALE",
            referenceId: `SALE-${sale.id}`,
            unitId: productUnit.unitId,
            unitQuantity: -item.quantity, // Negative for tracking direction conceptually (or positive with "OUT" type)
            baseQuantity: -baseQuantity,
          }
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
      include: { customer: true, warehouse: true, branch: true },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: any) {
    const item = await this.prisma.sale.findFirst({
      where: { id, deletedAt: null },
      include: { items: true, customer: true, warehouse: true, branch: true, payments: { include: { payment: true } } },
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

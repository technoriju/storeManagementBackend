import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateSaleReturnDto } from "./dto/create-sale-return.dto";
import { recalculateCustomerBalance } from "../customers/customers.service";

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
      // 0. Fetch original sale items for accurate unit and conversion matching
      const originalSaleItems = await tx.saleItem.findMany({
        where: { saleId: saleIdBigInt },
        include: { productUnit: true },
      });

      // 1. Resolve product units and quantities
      const resolvedItems: any[] = [];
      for (const item of items) {
        const prodId = BigInt(item.productId);
        const product = await tx.product.findUnique({
          where: { id: prodId },
          include: { productUnits: true },
        });
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

        const matchingSaleItem = originalSaleItems.find((si) => si.productId === prodId);

        let puId = item.productUnitId ? BigInt(item.productUnitId) : null;
        let pu = puId ? await tx.productUnit.findUnique({ where: { id: puId } }) : null;

        // If not explicitly provided, match unit from the original sale item
        if (!pu && matchingSaleItem?.productUnitId) {
          pu = await tx.productUnit.findUnique({ where: { id: matchingSaleItem.productUnitId } });
          puId = pu ? pu.id : null;
        }

        const isExplicitBase = (item as any).unitType === 'base';
        const isExplicitSub = (item as any).unitType === 'sub';

        // If base unit is requested, prefer unit with conversionFactor = 1 or baseUnitId
        if (!pu && isExplicitBase) {
          pu = product.productUnits?.find((u) => Number(u.conversionFactor) === 1) ||
               product.productUnits?.find((u) => u.unitId === (product.baseUnitId || 1)) || null;
          puId = pu ? pu.id : null;
        }

        // If sub unit is requested with conversion rate
        if (!pu && isExplicitSub && (item as any).conversionRate) {
          const subFactor = 1 / Number((item as any).conversionRate);
          pu = product.productUnits?.find((u) => Math.abs(Number(u.conversionFactor) - subFactor) < 0.0001) || null;
          puId = pu ? pu.id : null;
        }

        // Fallback: look for unit with factor 1 or base unit
        if (!pu) {
          pu = product.productUnits?.find((u) => Number(u.conversionFactor) === 1) ||
               product.productUnits?.find((u) => u.unitId === (product.baseUnitId || 1)) ||
               (product.productUnits && product.productUnits.length > 0 ? product.productUnits[0] : null);
          puId = pu ? pu.id : null;
        }

        // Calculate baseQuantity correctly:
        let baseQuantity: number;
        if (isExplicitBase) {
          baseQuantity = Number(item.quantity);
        } else if (isExplicitSub) {
          const convRate = Number((item as any).conversionRate || product.conversionRate || 1);
          baseQuantity = convRate > 0 ? Number(item.quantity) / convRate : Number(item.quantity);
        } else if (pu?.conversionFactor) {
          baseQuantity = Number(item.quantity) * Number(pu.conversionFactor);
        } else {
          baseQuantity = Number(item.quantity);
        }

        resolvedItems.push({
          ...item,
          productId: prodId,
          productUnitId: pu ? pu.id : null,
          unitId: pu?.unitId ?? (product.baseUnitId || 1),
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
      const targetWarehouseId = sale.warehouseId || 1;
      for (const item of resolvedItems) {
        const existingStock = await tx.stockBalance.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: targetWarehouseId,
            },
          },
        });

        if (existingStock) {
          const newQty = Number((Number(existingStock.quantity) + item.baseQuantity).toFixed(4));
          await tx.stockBalance.update({
            where: { id: existingStock.id },
            data: { quantity: newQty },
          });
        } else {
          await tx.stockBalance.create({
            data: {
              productId: item.productId,
              warehouseId: targetWarehouseId,
              quantity: item.baseQuantity,
            },
          });
        }

        await tx.stockTransaction.create({
          data: {
            productId: item.productId,
            warehouseId: targetWarehouseId,
            transactionType: "SALE_RETURN",
            referenceId: `SALE-RETURN-${saleReturn.id}`,
            unitId: item.unitId,
            unitQuantity: item.quantity,
            baseQuantity: item.baseQuantity,
          },
        });

        try {
          await tx.product.update({
            where: { id: item.productId },
            data: { version: { increment: 1 }, updatedAt: new Date() },
          });
        } catch (_) {}
      }

      // 4. Update parent sale due and payment status
      const allReturns = await tx.saleReturn.findMany({
        where: { saleId: saleIdBigInt, deletedAt: null },
        select: { totalAmount: true },
      });
      const totalReturned = allReturns.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
      const originalGrandTotal = Number(sale.grandTotal || 0);
      const paidAmt = Number(sale.paid || 0);
      const effectiveTotal = Math.max(0, originalGrandTotal - totalReturned);
      const newDue = Math.max(0, Number((effectiveTotal - paidAmt).toFixed(2)));
      let newPayStatus = sale.paymentStatus;
      if (newDue === 0 && (paidAmt > 0 || effectiveTotal === 0)) {
        newPayStatus = "Paid";
      } else if (paidAmt > 0) {
        newPayStatus = "Partial";
      } else {
        newPayStatus = "Unpaid";
      }

      await tx.sale.update({
        where: { id: saleIdBigInt },
        data: {
          due: newDue,
          paymentStatus: newPayStatus,
        },
      });

      // 5. Update customer outstanding balance if attached to sale
      if (sale.customerId) {
        await recalculateCustomerBalance(tx, sale.customerId);
      }

      return saleReturn;
    }, { maxWait: 10000, timeout: 30000 });
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
    const item = await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.saleReturn.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Recalculate parent sale due and payment status after return removal
      const allReturns = await tx.saleReturn.findMany({
        where: { saleId: item.saleId, deletedAt: null },
        select: { totalAmount: true },
      });
      const totalReturned = allReturns.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
      const currentSale = await tx.sale.findUnique({ where: { id: item.saleId } });
      if (currentSale) {
        const originalGrandTotal = Number(currentSale.grandTotal || 0);
        const paidAmt = Number(currentSale.paid || 0);
        const effectiveTotal = Math.max(0, originalGrandTotal - totalReturned);
        const newDue = Math.max(0, Number((effectiveTotal - paidAmt).toFixed(2)));
        let newPayStatus = currentSale.paymentStatus;
        if (newDue === 0 && (paidAmt > 0 || effectiveTotal === 0)) {
          newPayStatus = "Paid";
        } else if (paidAmt > 0) {
          newPayStatus = "Partial";
        } else {
          newPayStatus = "Unpaid";
        }

        await tx.sale.update({
          where: { id: item.saleId },
          data: {
            due: newDue,
            paymentStatus: newPayStatus,
          },
        });
      }

      if (item.sale?.customerId) {
        await recalculateCustomerBalance(tx, item.sale.customerId);
      }
      return result;
    });
  }
}

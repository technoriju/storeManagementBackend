import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreatePurchaseReturnDto } from "./dto/create-purchase-return.dto";
import { recalculateSupplierBalance } from "../suppliers/suppliers.service";

@Injectable()
export class PurchaseReturnsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreatePurchaseReturnDto) {
    const { items, purchaseId, ...returnData } = createDto;
    const purchaseIdBigInt = BigInt(purchaseId);

    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseIdBigInt },
    });
    if (!purchase) {
      throw new NotFoundException(`Purchase with id ${purchaseId} not found`);
    }

    const returnNumber = returnData.returnNumber || `PRT-${Date.now().toString().slice(-6)}`;

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
          if (product.defaultPurchaseUnitId) {
            pu = await tx.productUnit.findUnique({ where: { id: product.defaultPurchaseUnitId } });
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

      // 2. Create PurchaseReturn
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          ...returnData,
          purchaseId: purchaseIdBigInt,
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
        include: { items: { include: { product: true } }, purchase: true },
      });

      // 3. Deduct stock from warehouse inventory (returned back to supplier if warehouse present)
      if (purchase.warehouseId) {
        for (const item of resolvedItems) {
          const existingStock = await tx.stockBalance.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: purchase.warehouseId,
              },
            },
          });

          if (existingStock) {
            await tx.stockBalance.update({
              where: { id: existingStock.id },
              data: { quantity: Number(existingStock.quantity) - item.baseQuantity },
            });
          } else {
            await tx.stockBalance.create({
              data: {
                productId: item.productId,
                warehouseId: purchase.warehouseId,
                quantity: -item.baseQuantity,
              },
            });
          }

          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              warehouseId: purchase.warehouseId,
              transactionType: "PURCHASE_RETURN",
              referenceId: `PURCHASE-RETURN-${purchaseReturn.id}`,
              unitId: item.unitId,
              unitQuantity: -item.quantity,
              baseQuantity: -item.baseQuantity,
            },
          });
        }
      }

      // 4. Update parent purchase due and payment status
      const allReturns = await tx.purchaseReturn.findMany({
        where: { purchaseId: purchaseIdBigInt, deletedAt: null },
        select: { totalAmount: true },
      });
      const totalReturned = allReturns.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
      const originalGrandTotal = Number(purchase.grandTotal || 0);
      const paidAmt = Number(purchase.paid || 0);
      const effectiveTotal = Math.max(0, originalGrandTotal - totalReturned);
      const newDue = Math.max(0, Number((effectiveTotal - paidAmt).toFixed(2)));
      let newPayStatus = purchase.paymentStatus;
      if (newDue === 0 && (paidAmt > 0 || effectiveTotal === 0)) {
        newPayStatus = "Paid";
      } else if (paidAmt > 0) {
        newPayStatus = "Partial";
      } else {
        newPayStatus = "Unpaid";
      }

      await tx.purchase.update({
        where: { id: purchaseIdBigInt },
        data: {
          due: newDue,
          paymentStatus: newPayStatus,
        },
      });

      if (purchase.supplierId) {
        await recalculateSupplierBalance(tx, purchase.supplierId);
      }

      return purchaseReturn;
    });
  }

  async findAll() {
    return this.prisma.purchaseReturn.findMany({
      where: { deletedAt: null },
      include: {
        purchase: { include: { supplier: true } },
        items: { include: { product: true } },
      },
      orderBy: { id: "desc" },
    });
  }

  async findOne(id: bigint) {
    const item = await this.prisma.purchaseReturn.findFirst({
      where: { id, deletedAt: null },
      include: {
        purchase: { include: { supplier: true } },
        items: { include: { product: true } },
      },
    });
    if (!item) {
      throw new NotFoundException("Purchase return not found");
    }
    return item;
  }

  async remove(id: bigint) {
    const item = await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.purchaseReturn.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Recalculate parent purchase due and payment status after return removal
      const allReturns = await tx.purchaseReturn.findMany({
        where: { purchaseId: item.purchaseId, deletedAt: null },
        select: { totalAmount: true },
      });
      const totalReturned = allReturns.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
      const currentPurchase = await tx.purchase.findUnique({ where: { id: item.purchaseId } });
      if (currentPurchase) {
        const originalGrandTotal = Number(currentPurchase.grandTotal || 0);
        const paidAmt = Number(currentPurchase.paid || 0);
        const effectiveTotal = Math.max(0, originalGrandTotal - totalReturned);
        const newDue = Math.max(0, Number((effectiveTotal - paidAmt).toFixed(2)));
        let newPayStatus = currentPurchase.paymentStatus;
        if (newDue === 0 && (paidAmt > 0 || effectiveTotal === 0)) {
          newPayStatus = "Paid";
        } else if (paidAmt > 0) {
          newPayStatus = "Partial";
        } else {
          newPayStatus = "Unpaid";
        }

        await tx.purchase.update({
          where: { id: item.purchaseId },
          data: {
            due: newDue,
            paymentStatus: newPayStatus,
          },
        });
      }

      if (item.purchase?.supplierId) {
        await recalculateSupplierBalance(tx, item.purchase.supplierId);
      }
      return result;
    });
  }
}

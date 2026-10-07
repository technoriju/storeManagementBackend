import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreatePurchaseDto } from "./dto/create-purchase.dto";
import { UpdatePurchaseDto } from "./dto/update-purchase.dto";

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async create(createPurchaseDto: CreatePurchaseDto) {
    const { items, paymentAmount, paymentMethod, ...purchaseData } = createPurchaseDto;

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

      // 2. Resolve & validate optional foreign key IDs to prevent FK constraint violations
      let resolvedWarehouseId: number | null = null;
      if (purchaseData.warehouseId) {
        const wh = await tx.warehouse.findUnique({ where: { id: purchaseData.warehouseId } });
        if (wh) {
          resolvedWarehouseId = wh.id;
        } else {
          const defaultWh = await tx.warehouse.findFirst();
          resolvedWarehouseId = defaultWh ? defaultWh.id : null;
        }
      }

      let resolvedBranchId: number | null = null;
      if (purchaseData.branchId) {
        const br = await tx.branch.findUnique({ where: { id: purchaseData.branchId } });
        resolvedBranchId = br ? br.id : null;
      }

      let resolvedSupplierId: number | null = null;
      if (purchaseData.supplierId) {
        const supp = await tx.supplier.findUnique({ where: { id: purchaseData.supplierId } });
        resolvedSupplierId = supp ? supp.id : null;
      }

      const grandTotalNum = Number(purchaseData.grandTotal || 0);
      const paidVal = purchaseData.paid !== undefined ? Number(purchaseData.paid) : Number(paymentAmount || 0);
      const dueVal = purchaseData.due !== undefined ? Number(purchaseData.due) : Math.max(0, grandTotalNum - paidVal);
      let payStatus = purchaseData.paymentStatus;
      if (!payStatus) {
        if (paidVal >= grandTotalNum && grandTotalNum > 0) payStatus = "Paid";
        else if (paidVal > 0) payStatus = "Partial";
        else payStatus = "Unpaid";
      }

      // 3. Create Purchase
      const purchase = await tx.purchase.create({
        data: {
          ...purchaseData,
          branchId: resolvedBranchId,
          warehouseId: resolvedWarehouseId,
          supplierId: resolvedSupplierId,
          status: purchaseData.status || "COMPLETED",
          purchaseDate: new Date(purchaseData.purchaseDate),
          paid: paidVal,
          due: dueVal,
          paymentStatus: payStatus,
          notes: purchaseData.notes || null,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              taxAmount: item.taxAmount || 0,
              total: item.total,
            })),
          },
        },
        include: { items: true },
      });

      // 4. Handle Stock Updates in Base Unit (if warehouse resolved)
      if (resolvedWarehouseId) {
        for (const item of resolvedItems) {
          // Upsert StockBalance
          const existingStock = await tx.stockBalance.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: resolvedWarehouseId,
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
                warehouseId: resolvedWarehouseId,
                quantity: item.baseQuantity,
              },
            });
          }

          // Create StockTransaction
          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              warehouseId: resolvedWarehouseId,
              transactionType: "PURCHASE",
              referenceId: `PURCHASE-${purchase.id}`,
              unitId: item.unitId,
              unitQuantity: item.quantity,
              baseQuantity: item.baseQuantity,
            },
          });
        }
      }

      // 5. Handle Payment
      if (paymentAmount && paymentAmount > 0) {
        const payment = await tx.payment.create({
          data: {
            paymentDate: new Date(),
            amount: paymentAmount,
            paymentMethod: paymentMethod || "CASH",
            referenceNumber: purchase.invoiceNumber,
            type: "pay",
            supplierId: resolvedSupplierId,
          }
        });

        await tx.purchasePayment.create({
          data: {
            purchaseId: purchase.id,
            paymentId: payment.id
          }
        });
      }

      return purchase;
    });
  }

  async findAll() {
    return this.prisma.purchase.findMany({
      where: { deletedAt: null },
      include: {
        supplier: true,
        warehouse: true,
        branch: true,
        items: { include: { product: true } },
        payments: { include: { payment: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: any) {
    const item = await this.prisma.purchase.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: true,
        warehouse: true,
        branch: true,
        items: { include: { product: true } },
        payments: { include: { payment: true } },
      },
    });
    if (!item) {
      throw new NotFoundException("Purchase not found");
    }
    return item;
  }

  async update(id: any, updatePurchaseDto: UpdatePurchaseDto) {
    const purchaseId = BigInt(id);
    const existing = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, deletedAt: null },
      include: {
        items: {
          include: {
            productUnit: true,
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException("Purchase not found");
    }

    const { items, paymentAmount, paymentMethod, ...purchaseData } = updatePurchaseDto;

    return this.prisma.$transaction(async (tx) => {
      const warehouseId = purchaseData.warehouseId !== undefined
        ? (purchaseData.warehouseId ? Number(purchaseData.warehouseId) : null)
        : existing.warehouseId;

      if (items && Array.isArray(items)) {
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
          const baseQuantity = Number(item.quantity) * conversionFactor;

          resolvedItems.push({
            ...item,
            productId: prodId,
            productUnitId: puId,
            unitId: pu.unitId,
            baseQuantity,
          });
        }

        // 1. Reverse stock of old items
        if (existing.warehouseId && existing.items) {
          for (const oldItem of existing.items) {
            const oldConv = oldItem.productUnit?.conversionFactor ? Number(oldItem.productUnit.conversionFactor) : 1;
            const oldBaseQty = Number(oldItem.quantity) * oldConv;

            const existingStock = await tx.stockBalance.findUnique({
              where: {
                productId_warehouseId: {
                  productId: oldItem.productId,
                  warehouseId: existing.warehouseId,
                },
              },
            });

            if (existingStock) {
              await tx.stockBalance.update({
                where: { id: existingStock.id },
                data: { quantity: Number(existingStock.quantity) - oldBaseQty },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  productId: oldItem.productId,
                  warehouseId: existing.warehouseId,
                  quantity: -oldBaseQty,
                },
              });
            }
          }
        }

        // 2. Add stock for new items
        if (warehouseId) {
          for (const newItem of resolvedItems) {
            const existingStock = await tx.stockBalance.findUnique({
              where: {
                productId_warehouseId: {
                  productId: newItem.productId,
                  warehouseId: warehouseId,
                },
              },
            });

            if (existingStock) {
              await tx.stockBalance.update({
                where: { id: existingStock.id },
                data: { quantity: Number(existingStock.quantity) + newItem.baseQuantity },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  productId: newItem.productId,
                  warehouseId: warehouseId,
                  quantity: newItem.baseQuantity,
                },
              });
            }

            await tx.stockTransaction.create({
              data: {
                productId: newItem.productId,
                warehouseId: warehouseId,
                transactionType: "PURCHASE_UPDATE",
                referenceId: `PURCHASE-${existing.id}`,
                unitId: newItem.unitId,
                unitQuantity: Number(newItem.quantity),
                baseQuantity: newItem.baseQuantity,
              },
            });
          }
        }

        // 3. Replace purchase items
        await tx.purchaseItem.deleteMany({
          where: { purchaseId },
        });

        await tx.purchaseItem.createMany({
          data: resolvedItems.map((item) => ({
            purchaseId,
            productId: item.productId,
            productUnitId: item.productUnitId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount || 0),
            taxAmount: Number(item.taxAmount || 0),
            total: Number(item.total),
          })),
        });
      }

      // 4. Update purchase scalar fields
      const updateData: any = {};
      if (purchaseData.subTotal !== undefined) updateData.subTotal = Number(purchaseData.subTotal);
      if (purchaseData.taxTotal !== undefined) updateData.taxTotal = Number(purchaseData.taxTotal);
      if (purchaseData.discountTotal !== undefined) updateData.discountTotal = Number(purchaseData.discountTotal);
      if (purchaseData.grandTotal !== undefined) updateData.grandTotal = Number(purchaseData.grandTotal);
      if (purchaseData.paid !== undefined) updateData.paid = Number(purchaseData.paid);
      if (purchaseData.due !== undefined) updateData.due = Number(purchaseData.due);
      if (purchaseData.status !== undefined) updateData.status = purchaseData.status;
      if (purchaseData.paymentStatus !== undefined) updateData.paymentStatus = purchaseData.paymentStatus;
      if (purchaseData.notes !== undefined) updateData.notes = purchaseData.notes;
      if (purchaseData.warehouseId !== undefined) updateData.warehouseId = warehouseId;
      if (purchaseData.branchId !== undefined) updateData.branchId = purchaseData.branchId ? Number(purchaseData.branchId) : null;
      if (purchaseData.supplierId !== undefined) updateData.supplierId = purchaseData.supplierId ? Number(purchaseData.supplierId) : null;
      if (purchaseData.purchaseDate !== undefined) updateData.purchaseDate = new Date(purchaseData.purchaseDate);

      const updated = await tx.purchase.update({
        where: { id: purchaseId },
        data: updateData,
        include: {
          items: { include: { product: true } },
          supplier: true,
          warehouse: true,
          branch: true,
          payments: { include: { payment: true } },
        },
      });

      return updated;
    });
  }

  async remove(id: any) {
    const purchaseId = BigInt(id);
    const existing = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, deletedAt: null },
      include: {
        items: {
          include: {
            productUnit: true,
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException("Purchase not found");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Deduct Stock if warehouse was associated
      if (existing.warehouseId && existing.items && existing.items.length > 0) {
        for (const item of existing.items) {
          const convFactor = item.productUnit?.conversionFactor ? Number(item.productUnit.conversionFactor) : 1;
          const baseQty = Number(item.quantity) * convFactor;

          const existingStock = await tx.stockBalance.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: existing.warehouseId,
              },
            },
          });

          if (existingStock) {
            await tx.stockBalance.update({
              where: { id: existingStock.id },
              data: { quantity: Number(existingStock.quantity) - baseQty },
            });
          } else {
            await tx.stockBalance.create({
              data: {
                productId: item.productId,
                warehouseId: existing.warehouseId,
                quantity: -baseQty,
              },
            });
          }

          // Create reversing StockTransaction
          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              warehouseId: existing.warehouseId,
              transactionType: "PURCHASE_CANCELLED",
              referenceId: `PURCHASE-${existing.id}`,
              unitId: item.productUnit?.unitId ?? null,
              unitQuantity: -Number(item.quantity),
              baseQuantity: -baseQty,
            },
          });
        }
      }

      // 2. Mark items soft-deleted
      await tx.purchaseItem.updateMany({
        where: { purchaseId },
        data: { deletedAt: new Date() },
      });

      // 3. Mark purchase soft-deleted
      return tx.purchase.update({
        where: { id: purchaseId },
        data: { deletedAt: new Date() },
      });
    });
  }
}

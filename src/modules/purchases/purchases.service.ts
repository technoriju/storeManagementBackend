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
        resolvedWarehouseId = wh ? wh.id : null;
      }
      if (!resolvedWarehouseId) {
        const defaultWh = await tx.warehouse.findFirst();
        resolvedWarehouseId = defaultWh ? defaultWh.id : null;
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

        for (const item of resolvedItems) {
          try {
            await tx.product.update({
              where: { id: item.productId },
              data: { version: { increment: 1 }, updatedAt: new Date() },
            });
          } catch (_) {}
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
    let purchaseId: bigint | null = null;
    try {
      if (typeof id === "bigint") {
        purchaseId = id;
      } else if (/^\d+$/.test(String(id).trim())) {
        purchaseId = BigInt(String(id).trim());
      }
    } catch (_) {}

    const idStr = String(id).trim();
    const item = await this.prisma.purchase.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(purchaseId !== null ? [{ id: purchaseId }] : []),
          { invoiceNumber: idStr },
        ],
      },
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
    let purchaseId: bigint | null = null;
    try {
      if (typeof id === "bigint") {
        purchaseId = id;
      } else if (/^\d+$/.test(String(id).trim())) {
        purchaseId = BigInt(String(id).trim());
      }
    } catch (_) {}

    const idStr = String(id).trim();
    const invNum = updatePurchaseDto.invoiceNumber ? String(updatePurchaseDto.invoiceNumber).trim() : null;
    const existing = await this.prisma.purchase.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(purchaseId !== null ? [{ id: purchaseId }] : []),
          { invoiceNumber: idStr },
          ...(invNum ? [{ invoiceNumber: invNum }] : []),
        ],
      },
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
    const targetPurchaseId = existing.id;

    const { items, paymentAmount, paymentMethod, ...purchaseData } = updatePurchaseDto;

    return this.prisma.$transaction(async (tx) => {
      let resolvedWarehouseId: number | null = null;
      if (purchaseData.warehouseId) {
        const wh = await tx.warehouse.findUnique({ where: { id: Number(purchaseData.warehouseId) } });
        resolvedWarehouseId = wh ? wh.id : null;
      }
      if (!resolvedWarehouseId && existing.warehouseId) {
        resolvedWarehouseId = existing.warehouseId;
      }
      if (!resolvedWarehouseId) {
        const defaultWh = await tx.warehouse.findFirst();
        resolvedWarehouseId = defaultWh ? defaultWh.id : null;
      }
      const oldWarehouseId = existing.warehouseId || resolvedWarehouseId;

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

        // Status checks for stock adjustment
        const oldStatus = String(existing.status || 'COMPLETED').toUpperCase();
        const isOldStocked = oldStatus === 'COMPLETED' || oldStatus === 'RECEIVED';

        const newStatus = String(purchaseData.status || existing.status || 'COMPLETED').toUpperCase();
        const isNewStocked = newStatus === 'COMPLETED' || newStatus === 'RECEIVED';

        // 1. Reverse stock of old items (deduct what previous purchase added)
        if (isOldStocked && oldWarehouseId && existing.items) {
          for (const oldItem of existing.items) {
            let oldConv = 1;
            if (oldItem.productUnit?.conversionFactor) {
              oldConv = Number(oldItem.productUnit.conversionFactor);
            } else if (oldItem.productUnitId) {
              const pu = await tx.productUnit.findUnique({ where: { id: oldItem.productUnitId } });
              if (pu?.conversionFactor) oldConv = Number(pu.conversionFactor);
            }
            const oldBaseQty = Number(oldItem.quantity) * oldConv;

            const existingStock = await tx.stockBalance.findUnique({
              where: {
                productId_warehouseId: {
                  productId: oldItem.productId,
                  warehouseId: oldWarehouseId,
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
                  warehouseId: oldWarehouseId,
                  quantity: -oldBaseQty,
                },
              });
            }
          }
        }

        // 2. Add stock for new items
        if (isNewStocked && resolvedWarehouseId) {
          for (const newItem of resolvedItems) {
            const existingStock = await tx.stockBalance.findUnique({
              where: {
                productId_warehouseId: {
                  productId: newItem.productId,
                  warehouseId: resolvedWarehouseId,
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
                  warehouseId: resolvedWarehouseId,
                  quantity: newItem.baseQuantity,
                },
              });
            }

            await tx.stockTransaction.create({
              data: {
                productId: newItem.productId,
                warehouseId: resolvedWarehouseId,
                transactionType: "PURCHASE_UPDATE",
                referenceId: `PURCHASE-${existing.id}`,
                unitId: newItem.unitId,
                unitQuantity: Number(newItem.quantity),
                baseQuantity: newItem.baseQuantity,
              },
            });
          }
        }

        // 3. Bump version and updatedAt for all affected products
        const affectedProductIds = new Set<bigint>();
        existing.items?.forEach((i) => affectedProductIds.add(i.productId));
        resolvedItems.forEach((i) => affectedProductIds.add(i.productId));
        for (const pId of affectedProductIds) {
          try {
            await tx.product.update({
              where: { id: pId },
              data: { version: { increment: 1 }, updatedAt: new Date() },
            });
          } catch (_) {}
        }

        // 3. Replace purchase items
        await tx.purchaseItem.deleteMany({
          where: { purchaseId: targetPurchaseId },
        });

        await tx.purchaseItem.createMany({
          data: resolvedItems.map((item) => ({
            purchaseId: targetPurchaseId,
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
      if (purchaseData.warehouseId !== undefined) updateData.warehouseId = resolvedWarehouseId;
      if (purchaseData.branchId !== undefined) updateData.branchId = purchaseData.branchId ? Number(purchaseData.branchId) : null;
      if (purchaseData.supplierId !== undefined) updateData.supplierId = purchaseData.supplierId ? Number(purchaseData.supplierId) : null;
      if (purchaseData.purchaseDate !== undefined) updateData.purchaseDate = new Date(purchaseData.purchaseDate);

      const updated = await tx.purchase.update({
        where: { id: targetPurchaseId },
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
    let purchaseId: bigint | null = null;
    try {
      if (typeof id === "bigint") {
        purchaseId = id;
      } else if (/^\d+$/.test(String(id).trim())) {
        purchaseId = BigInt(String(id).trim());
      }
    } catch (_) {}

    const idStr = String(id).trim();
    const existing = await this.prisma.purchase.findFirst({
      where: purchaseId !== null
        ? { id: purchaseId, deletedAt: null }
        : { invoiceNumber: idStr, deletedAt: null },
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
      // 1. Deduct Stock (fallback to default warehouse if not specified on purchase)
      let targetWarehouseId = existing.warehouseId;
      if (!targetWarehouseId) {
        const defaultWh = await tx.warehouse.findFirst({ where: { deletedAt: null } }) || (await tx.warehouse.findFirst());
        targetWarehouseId = defaultWh ? defaultWh.id : null;
      }

      const existingItems: any[] = (existing as any).items || [];
      if (targetWarehouseId && existingItems.length > 0) {
        for (const item of existingItems) {
          const convFactor = item.productUnit?.conversionFactor ? Number(item.productUnit.conversionFactor) : 1;
          const baseQty = Number(item.quantity) * convFactor;

          const existingStock = await tx.stockBalance.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: targetWarehouseId,
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
                warehouseId: targetWarehouseId,
                quantity: -baseQty,
              },
            });
          }

          // Create reversing StockTransaction
          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              warehouseId: targetWarehouseId,
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
      if (tx.purchaseItem?.updateMany) {
        await tx.purchaseItem.updateMany({
          where: { purchaseId: existing.id },
          data: { deletedAt: new Date() },
        });
      }

      // 3. Mark purchase payments soft-deleted
      if (tx.purchasePayment?.updateMany) {
        await tx.purchasePayment.updateMany({
          where: { purchaseId: existing.id },
          data: { deletedAt: new Date() },
        });
      }

      // 4. Mark purchase soft-deleted
      const updated = await tx.purchase.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });

      return {
        id: updated.id.toString(),
        invoiceNumber: updated.invoiceNumber,
        status: "DELETED",
        message: "Purchase deleted successfully",
      };
    });
  }
}

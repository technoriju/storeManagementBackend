import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreatePurchaseDto } from "./dto/create-purchase.dto";
import { UpdatePurchaseDto } from "./dto/update-purchase.dto";
import { recalculateSupplierBalance } from "../suppliers/suppliers.service";

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async create(createPurchaseDto: CreatePurchaseDto) {
    const { items, paymentAmount, paymentMethod, advancePayment, showPreviousBalance, previousDue, balanceAdjustment, ...purchaseData } = createPurchaseDto;

    const created = await this.prisma.$transaction(async (tx) => {
      // 1. Resolve product units and quantities
      const resolvedItems: any[] = [];
      for (const item of items) {
        const prodId = BigInt(item.productId);
        const product = await tx.product.findUnique({
          where: { id: prodId },
          include: { productUnits: true },
        });
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

        let targetFactor = 1;
          if ((item as any).unitType === 'base') {
            targetFactor = Number((item as any).conversionRate || 1);
          } else if ((item as any).unitType === 'sub') {
            targetFactor = 1;
          }

          let puId = item.productUnitId ? BigInt(item.productUnitId) : null;
          let pu = puId ? await tx.productUnit.findUnique({ where: { id: puId } }) : null;

          if (!pu && (item as any).unitType) {
            // Find or create product unit that matches targetFactor
            pu = product.productUnits?.find(u => Number(u.conversionFactor) === targetFactor)
              || product.productUnits?.find(u => u.unitId === (product.baseUnitId || 1))
              || (product.productUnits && product.productUnits.length > 0 ? product.productUnits[0] : null);
            if (!pu) {
              const targetUnitId = product.baseUnitId || 1;
              const existingUnit = await tx.productUnit.findFirst({
                where: { productId: product.id, unitId: targetUnitId },
              });
              if (existingUnit) {
                pu = existingUnit;
              } else {
                try {
                  pu = await tx.productUnit.create({
                    data: {
                      productId: product.id,
                      unitId: targetUnitId,
                      conversionFactor: targetFactor,
                    },
                  });
                } catch {
                  pu = await tx.productUnit.findFirst({
                    where: { productId: product.id, unitId: targetUnitId },
                  });
                }
              }
            }
            puId = pu ? pu.id : null;
          } else if (!pu) {
            if (product.defaultSalesUnitId) {
              pu = await tx.productUnit.findUnique({ where: { id: product.defaultSalesUnitId } });
            } else if (product.productUnits && product.productUnits.length > 0) {
              pu = product.productUnits[0];
            } else {
              const targetUnitId = product.baseUnitId || 1;
              const existingUnit = await tx.productUnit.findFirst({
                where: { productId: product.id, unitId: targetUnitId },
              });
              if (existingUnit) {
                pu = existingUnit;
              } else {
                try {
                  pu = await tx.productUnit.create({
                    data: {
                      productId: product.id,
                      unitId: targetUnitId,
                      conversionFactor: 1,
                    },
                  });
                } catch {
                  pu = await tx.productUnit.findFirst({
                    where: { productId: product.id, unitId: targetUnitId },
                  });
                }
              }
            }
            puId = pu ? pu.id : null;
          }

          const conversionFactor = pu ? Number(pu.conversionFactor || 1) : targetFactor;
          const baseQuantity = Number(item.quantity) * conversionFactor;

        resolvedItems.push({
          ...item,
          productId: prodId,
          productUnitId: puId,
          unitId: pu?.unitId ?? (product.baseUnitId || 1),
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
          previousDue: previousDue !== undefined ? Number(previousDue) : 0,
          advancePayment: advancePayment !== undefined ? Number(advancePayment) : 0,
          showPreviousBalance: Boolean(showPreviousBalance),
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

      // 5. Handle Supplier Advance Allocation & Payment
      const advPaymentVal = advancePayment !== undefined ? Number(advancePayment) : 0;
      const isAdvanceApplied = Boolean(showPreviousBalance && advPaymentVal > 0);
      const advUsed = isAdvanceApplied ? Math.min(advPaymentVal, grandTotalNum) : 0;

      let remainingAdvToAllocate = advUsed;
      if (resolvedSupplierId && remainingAdvToAllocate > 0) {
        const unallocatedPayments = await tx.payment.findMany({
          where: {
            supplierId: resolvedSupplierId,
            deletedAt: null,
            type: { in: ["pay", "paid"] },
            purchasePayments: { none: {} },
          },
          orderBy: { id: "asc" },
        });

        for (const p of unallocatedPayments) {
          if (remainingAdvToAllocate <= 0) break;
          const pAmt = Number(p.amount);
          if (pAmt <= remainingAdvToAllocate) {
            await tx.purchasePayment.create({
              data: {
                purchaseId: purchase.id,
                paymentId: p.id,
              },
            });
            remainingAdvToAllocate = Number((remainingAdvToAllocate - pAmt).toFixed(2));
          } else {
            const consumed = remainingAdvToAllocate;
            const remainder = Number((pAmt - consumed).toFixed(2));

            await tx.payment.update({
              where: { id: p.id },
              data: { amount: consumed },
            });
            await tx.purchasePayment.create({
              data: {
                purchaseId: purchase.id,
                paymentId: p.id,
              },
            });

            await tx.payment.create({
              data: {
                paymentDate: p.paymentDate,
                amount: remainder,
                paymentMethod: p.paymentMethod,
                referenceNumber: p.referenceNumber,
                type: p.type,
                notes: p.notes,
                supplierId: resolvedSupplierId,
              },
            });

            remainingAdvToAllocate = 0;
          }
        }
      }

      // Fresh cash payment paid to supplier (excluding applied advance)
      const targetPay = paymentAmount !== undefined && Number(paymentAmount) > 0 ? Number(paymentAmount) : Number(paidVal || 0);
      const validPayAmount = Math.max(0, targetPay - advUsed);
      if (validPayAmount > 0) {
        const payment = await tx.payment.create({
          data: {
            paymentDate: new Date(),
            amount: validPayAmount,
            paymentMethod: paymentMethod || "CASH",
            referenceNumber: purchase.invoiceNumber,
            type: "pay",
            supplierId: resolvedSupplierId,
          },
        });

        await tx.purchasePayment.create({
          data: {
            purchaseId: purchase.id,
            paymentId: payment.id,
          },
        });
      }

      // Record explicit supplier balance adjustment if manual previous due was applied
      let adjDelta = balanceAdjustment !== undefined ? Number(balanceAdjustment) : 0;
      if (resolvedSupplierId && Boolean(showPreviousBalance)) {
        if (balanceAdjustment === undefined) {
          const currentSupp: any = await (tx as any).supplier.findUnique({
            where: { id: resolvedSupplierId },
            select: { outstandingBalance: true },
          });
          const priorBal = Number(currentSupp?.outstandingBalance || 0);
          const enteredPrev = Number(previousDue || 0) - Number(advancePayment || 0);
          adjDelta = Number((enteredPrev - priorBal).toFixed(2));
        }

        if (Math.abs(adjDelta) > 0.001) {
          await tx.payment.create({
            data: {
              paymentDate: new Date(),
              amount: Math.abs(adjDelta),
              paymentMethod: "adjustment",
              referenceNumber: purchase.invoiceNumber,
              type: adjDelta > 0 ? "receive" : "pay",
              notes: `Mutual balance adjustment (${adjDelta > 0 ? "+" : "-"}₹${Math.abs(adjDelta).toFixed(2)}) on ${purchase.invoiceNumber}`,
              supplierId: resolvedSupplierId,
            },
          });
        }
      }

      // Update supplier outstandingBalance directly in DB transaction using ledger recalculation
      if (resolvedSupplierId) {
        await recalculateSupplierBalance(tx, resolvedSupplierId);
      }

      return purchase;
    });

    try {
      return await this.findOne(created.id);
    } catch (_) {
      return created;
    }
  }

  async findAll(query?: any) {
    const where: Prisma.PurchaseWhereInput = { deletedAt: null };

    if (query?.supplierId) {
      where.supplierId = Number(query.supplierId);
    }
    if (query?.status) {
      where.status = String(query.status);
    }
    if (query?.paymentStatus) {
      where.paymentStatus = String(query.paymentStatus);
    }
    if (query?.search && String(query.search).trim()) {
      const q = String(query.search).trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { status: { contains: q } },
        { paymentStatus: { contains: q } },
        { notes: { contains: q } },
        { supplier: { name: { contains: q } } },
      ];
    }

    const hasPagination = query?.page !== undefined || query?.limit !== undefined;
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.max(1, Number(query?.limit || 10));
    const skip = (page - 1) * limit;

    const [total, purchases] = await Promise.all([
      hasPagination ? this.prisma.purchase.count({ where }) : Promise.resolve(0),
      this.prisma.purchase.findMany({
        where,
        include: {
          supplier: true,
          warehouse: true,
          branch: true,
          items: { include: { product: true } },
          payments: { include: { payment: true } },
        },
        orderBy: { id: "desc" },
        ...(hasPagination ? { skip, take: limit } : {}),
      }),
    ]);

    if (hasPagination) {
      return {
        data: purchases,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    return purchases;
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
        payments: {
          where: { deletedAt: null },
          include: {
            payment: true,
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException("Purchase not found");
    }
    const targetPurchaseId = existing.id;

    const { items, paymentAmount, paymentMethod, ...purchaseData } = updatePurchaseDto;

    const created = await this.prisma.$transaction(async (tx) => {
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

          let targetFactor = 1;
          if ((item as any).unitType === 'base') {
            targetFactor = Number((item as any).conversionRate || 1);
          } else if ((item as any).unitType === 'sub') {
            targetFactor = 1;
          }

          let puId = item.productUnitId ? BigInt(item.productUnitId) : null;
          let pu = puId ? await tx.productUnit.findUnique({ where: { id: puId } }) : null;

          if (!pu && (item as any).unitType) {
            // Find or create product unit that matches targetFactor
            pu = product.productUnits?.find(u => Number(u.conversionFactor) === targetFactor)
              || product.productUnits?.find(u => u.unitId === (product.baseUnitId || 1))
              || (product.productUnits && product.productUnits.length > 0 ? product.productUnits[0] : null);
            if (!pu) {
              const targetUnitId = product.baseUnitId || 1;
              const existingUnit = await tx.productUnit.findFirst({
                where: { productId: product.id, unitId: targetUnitId },
              });
              if (existingUnit) {
                pu = existingUnit;
              } else {
                try {
                  pu = await tx.productUnit.create({
                    data: {
                      productId: product.id,
                      unitId: targetUnitId,
                      conversionFactor: targetFactor,
                    },
                  });
                } catch {
                  pu = await tx.productUnit.findFirst({
                    where: { productId: product.id, unitId: targetUnitId },
                  });
                }
              }
            }
            puId = pu ? pu.id : null;
          } else if (!pu) {
            if (product.defaultSalesUnitId) {
              pu = await tx.productUnit.findUnique({ where: { id: product.defaultSalesUnitId } });
            } else if (product.productUnits && product.productUnits.length > 0) {
              pu = product.productUnits[0];
            } else {
              const targetUnitId = product.baseUnitId || 1;
              const existingUnit = await tx.productUnit.findFirst({
                where: { productId: product.id, unitId: targetUnitId },
              });
              if (existingUnit) {
                pu = existingUnit;
              } else {
                try {
                  pu = await tx.productUnit.create({
                    data: {
                      productId: product.id,
                      unitId: targetUnitId,
                      conversionFactor: 1,
                    },
                  });
                } catch {
                  pu = await tx.productUnit.findFirst({
                    where: { productId: product.id, unitId: targetUnitId },
                  });
                }
              }
            }
            puId = pu ? pu.id : null;
          }

          const conversionFactor = pu ? Number(pu.conversionFactor || 1) : targetFactor;
          const baseQuantity = Number(item.quantity) * conversionFactor;

          resolvedItems.push({
            ...item,
            productId: prodId,
            productUnitId: puId,
            unitId: pu?.unitId ?? (product.baseUnitId || 1),
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

            await tx.stockTransaction.create({
              data: {
                productId: oldItem.productId,
                warehouseId: oldWarehouseId,
                transactionType: "PURCHASE_UPDATE_REVERSAL",
                referenceId: `PURCHASE-${existing.id}`,
                unitId: oldItem.productUnit?.unitId ?? null,
                unitQuantity: -Number(oldItem.quantity),
                baseQuantity: -oldBaseQty,
              },
            });
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
            total: Number(item.total !== undefined ? item.total : (Number(item.quantity) * Number(item.unitPrice) - Number(item.discount || 0) + Number(item.taxAmount || 0))),
          })),
        });
      } else if (purchaseData.status && purchaseData.status !== existing.status) {
        // Status changed without items array
        const oldStatus = String(existing.status || 'COMPLETED').toUpperCase();
        const isOldStocked = oldStatus === 'COMPLETED' || oldStatus === 'RECEIVED';
        const newStatus = String(purchaseData.status).toUpperCase();
        const isNewStocked = newStatus === 'COMPLETED' || newStatus === 'RECEIVED';

        if (isOldStocked && !isNewStocked && oldWarehouseId && existing.items) {
          for (const oldItem of existing.items) {
            const conv = oldItem.productUnit?.conversionFactor ? Number(oldItem.productUnit.conversionFactor) : 1;
            const oldBaseQty = Number(oldItem.quantity) * conv;
            const existingStock = await tx.stockBalance.findUnique({
              where: { productId_warehouseId: { productId: oldItem.productId, warehouseId: oldWarehouseId } },
            });
            if (existingStock) {
              await tx.stockBalance.update({
                where: { id: existingStock.id },
                data: { quantity: Number(existingStock.quantity) - oldBaseQty },
              });
            }
            await tx.stockTransaction.create({
              data: {
                productId: oldItem.productId,
                warehouseId: oldWarehouseId,
                transactionType: "PURCHASE_CANCELLED",
                referenceId: `PURCHASE-${existing.id}`,
                unitId: oldItem.productUnit?.unitId ?? null,
                unitQuantity: -Number(oldItem.quantity),
                baseQuantity: -oldBaseQty,
              },
            });
            try {
              await tx.product.update({
                where: { id: oldItem.productId },
                data: { version: { increment: 1 }, updatedAt: new Date() },
              });
            } catch (_) {}
          }
        } else if (!isOldStocked && isNewStocked && resolvedWarehouseId && existing.items) {
          for (const oldItem of existing.items) {
            const conv = oldItem.productUnit?.conversionFactor ? Number(oldItem.productUnit.conversionFactor) : 1;
            const oldBaseQty = Number(oldItem.quantity) * conv;
            const existingStock = await tx.stockBalance.findUnique({
              where: { productId_warehouseId: { productId: oldItem.productId, warehouseId: resolvedWarehouseId } },
            });
            if (existingStock) {
              await tx.stockBalance.update({
                where: { id: existingStock.id },
                data: { quantity: Number(existingStock.quantity) + oldBaseQty },
              });
            } else {
              await tx.stockBalance.create({
                data: { productId: oldItem.productId, warehouseId: resolvedWarehouseId, quantity: oldBaseQty },
              });
            }
            await tx.stockTransaction.create({
              data: {
                productId: oldItem.productId,
                warehouseId: resolvedWarehouseId,
                transactionType: "PURCHASE",
                referenceId: `PURCHASE-${existing.id}`,
                unitId: oldItem.productUnit?.unitId ?? null,
                unitQuantity: Number(oldItem.quantity),
                baseQuantity: oldBaseQty,
              },
            });
            try {
              await tx.product.update({
                where: { id: oldItem.productId },
                data: { version: { increment: 1 }, updatedAt: new Date() },
              });
            } catch (_) {}
          }
        }
      }

      // 4. Update purchase scalar fields
      const updateData: any = {};
      if (purchaseData.subTotal !== undefined) updateData.subTotal = Number(purchaseData.subTotal);
      else if ((purchaseData as any).subtotal !== undefined) updateData.subTotal = Number((purchaseData as any).subtotal);

      if (purchaseData.taxTotal !== undefined) updateData.taxTotal = Number(purchaseData.taxTotal);
      else if ((purchaseData as any).orderTax !== undefined || (purchaseData as any).gst !== undefined) {
        updateData.taxTotal = Number((purchaseData as any).orderTax || 0) + Number((purchaseData as any).gst || 0);
      }

      if (purchaseData.discountTotal !== undefined) updateData.discountTotal = Number(purchaseData.discountTotal);
      else if ((purchaseData as any).discount !== undefined) updateData.discountTotal = Number((purchaseData as any).discount);

      if (purchaseData.grandTotal !== undefined) updateData.grandTotal = Number(purchaseData.grandTotal);
      else if ((purchaseData as any).total !== undefined) updateData.grandTotal = Number((purchaseData as any).total);
      if (purchaseData.paid !== undefined) updateData.paid = Number(purchaseData.paid);
      if (purchaseData.due !== undefined) updateData.due = Number(purchaseData.due);
      if (purchaseData.status !== undefined) updateData.status = purchaseData.status;
      if (purchaseData.paymentStatus !== undefined) updateData.paymentStatus = purchaseData.paymentStatus;
      if (purchaseData.notes !== undefined) updateData.notes = purchaseData.notes;
      if (purchaseData.previousDue !== undefined) updateData.previousDue = Number(purchaseData.previousDue);
      if (purchaseData.advancePayment !== undefined) updateData.advancePayment = Number(purchaseData.advancePayment);
      if (purchaseData.showPreviousBalance !== undefined) updateData.showPreviousBalance = Boolean(purchaseData.showPreviousBalance);
      if (purchaseData.warehouseId !== undefined) updateData.warehouseId = resolvedWarehouseId;
      if (purchaseData.branchId !== undefined) updateData.branchId = purchaseData.branchId ? Number(purchaseData.branchId) : null;
      if (purchaseData.supplierId !== undefined) updateData.supplierId = purchaseData.supplierId ? Number(purchaseData.supplierId) : null;
      if (purchaseData.purchaseDate !== undefined) updateData.purchaseDate = new Date(purchaseData.purchaseDate);

      // Handle payment sync or fresh payment in purchase update
      if (purchaseData.paid !== undefined) {
        const targetPaid = Number(purchaseData.paid);
        const linkedPayments = (existing as any).payments?.filter((pp: any) => pp.payment && pp.payment.deletedAt === null) || [];
        if (linkedPayments.length > 0) {
          const firstPayment = linkedPayments[0].payment;
          if (targetPaid > 0) {
            await tx.payment.update({
              where: { id: firstPayment.id },
              data: {
                amount: targetPaid,
                supplierId: updateData.supplierId || existing.supplierId,
                updatedAt: new Date(),
              },
            });
          } else {
            await tx.payment.update({
              where: { id: firstPayment.id },
              data: { deletedAt: new Date() },
            });
          }
        } else if (targetPaid > 0) {
          const payment = await tx.payment.create({
            data: {
              paymentDate: updateData.purchaseDate || new Date(),
              amount: targetPaid,
              paymentMethod: paymentMethod || "CASH",
              referenceNumber: existing.invoiceNumber,
              type: "pay",
              supplierId: updateData.supplierId || existing.supplierId,
            },
          });
          await tx.purchasePayment.create({
            data: {
              purchaseId: targetPurchaseId,
              paymentId: payment.id,
            },
          });
        }
      } else if (paymentAmount !== undefined && Number(paymentAmount) > 0) {
        const payAmt = Number(paymentAmount);
        const payment = await tx.payment.create({
          data: {
            paymentDate: new Date(),
            amount: payAmt,
            paymentMethod: paymentMethod || "CASH",
            referenceNumber: existing.invoiceNumber,
            type: "pay",
            supplierId: updateData.supplierId || existing.supplierId,
          },
        });
        await tx.purchasePayment.create({
          data: {
            purchaseId: targetPurchaseId,
            paymentId: payment.id,
          },
        });
        const currentPaid = Number(updateData.paid ?? existing.paid ?? 0);
        updateData.paid = Number((currentPaid + payAmt).toFixed(2));
      }

      const finalGrandTotal = updateData.grandTotal !== undefined ? Number(updateData.grandTotal) : Number(existing.grandTotal || 0);
      const finalPaid = updateData.paid !== undefined ? Number(updateData.paid) : Number(existing.paid || 0);
      if (updateData.due === undefined && (updateData.grandTotal !== undefined || updateData.paid !== undefined)) {
        let returnedAmt = 0;
        if (tx.purchaseReturn?.findMany) {
          const totalReturns = await tx.purchaseReturn.findMany({
            where: { purchaseId: targetPurchaseId, deletedAt: null },
            select: { totalAmount: true },
          });
          returnedAmt = totalReturns.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
        }
        updateData.due = Math.max(0, Number((finalGrandTotal - returnedAmt - finalPaid).toFixed(2)));
      }
      if (updateData.paymentStatus === undefined && (updateData.due !== undefined || updateData.grandTotal !== undefined || updateData.paid !== undefined)) {
        const effectiveDue = updateData.due !== undefined ? Number(updateData.due) : Math.max(0, finalGrandTotal - finalPaid);
        if (effectiveDue === 0 && (finalPaid > 0 || finalGrandTotal === 0)) updateData.paymentStatus = "Paid";
        else if (finalPaid > 0) updateData.paymentStatus = "Partial";
        else updateData.paymentStatus = "Unpaid";
      }

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

      if (existing.supplierId) {
        await recalculateSupplierBalance(tx, existing.supplierId);
      }
      if (updateData.supplierId && updateData.supplierId !== existing.supplierId) {
        await recalculateSupplierBalance(tx, updateData.supplierId);
      }

      return updated;
    });

    try {
      return await this.findOne(created.id);
    } catch (_) {
      return created;
    }
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
        returns: {
          where: { deletedAt: null },
          include: {
            items: true,
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException("Purchase not found");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      // 1. Deduct Stock (fallback to default warehouse if not specified on purchase)
      let targetWarehouseId = existing.warehouseId;
      if (!targetWarehouseId) {
        const defaultWh = await tx.warehouse.findFirst({ where: { deletedAt: null } }) || (await tx.warehouse.findFirst());
        targetWarehouseId = defaultWh ? defaultWh.id : null;
      }

      // Calculate any items already returned so we do not double-deduct returned stock
      const returnedBaseQtyByProduct = new Map<string, number>();
      const existingReturns = (existing as any).returns || [];
      for (const ret of existingReturns) {
        for (const retItem of ret.items || []) {
          let retConv = 1;
          if (retItem.productUnitId) {
            const pu = await tx.productUnit.findUnique({ where: { id: retItem.productUnitId } });
            if (pu?.conversionFactor) retConv = Number(pu.conversionFactor);
          }
          const retBaseQty = Number(retItem.quantity) * retConv;
          const key = retItem.productId.toString();
          returnedBaseQtyByProduct.set(key, (returnedBaseQtyByProduct.get(key) || 0) + retBaseQty);
        }
      }

      const existingItems: any[] = (existing as any).items || [];
      if (targetWarehouseId && existingItems.length > 0) {
        for (const item of existingItems) {
          const convFactor = item.productUnit?.conversionFactor ? Number(item.productUnit.conversionFactor) : 1;
          const fullBaseQty = Number(item.quantity) * convFactor;
          const key = item.productId.toString();
          const alreadyReturned = returnedBaseQtyByProduct.get(key) || 0;
          const netBaseQtyToDeduct = Math.max(0, fullBaseQty - alreadyReturned);
          if (alreadyReturned > 0) {
            returnedBaseQtyByProduct.set(key, Math.max(0, alreadyReturned - fullBaseQty));
          }

          if (netBaseQtyToDeduct > 0) {
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
                data: { quantity: Number(existingStock.quantity) - netBaseQtyToDeduct },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  productId: item.productId,
                  warehouseId: targetWarehouseId,
                  quantity: -netBaseQtyToDeduct,
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
                baseQuantity: -netBaseQtyToDeduct,
              },
            });
          }

          try {
            await tx.product.update({
              where: { id: item.productId },
              data: { version: { increment: 1 }, updatedAt: new Date() },
            });
          } catch (_) {}
        }
      }

      // Soft delete active purchase returns linked to this purchase
      if (tx.purchaseReturn?.updateMany) {
        await tx.purchaseReturn.updateMany({
          where: { purchaseId: existing.id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }
      if (tx.purchaseReturnItem?.updateMany) {
        await tx.purchaseReturnItem.updateMany({
          where: { purchaseReturn: { purchaseId: existing.id } },
          data: { deletedAt: new Date() },
        });
      }

      // 2. Mark items soft-deleted
      if (tx.purchaseItem?.updateMany) {
        await tx.purchaseItem.updateMany({
          where: { purchaseId: existing.id },
          data: { deletedAt: new Date() },
        });
      }

      // 3. Mark purchase payments and related payments soft-deleted
      let paymentIds: bigint[] = [];
      if (tx.purchasePayment?.findMany) {
        const purchasePayments = await tx.purchasePayment.findMany({
          where: { purchaseId: existing.id },
          select: { paymentId: true },
        });
        paymentIds = purchasePayments.map((pp) => pp.paymentId);
      }
      if (paymentIds.length > 0 && tx.payment?.updateMany) {
        await tx.payment.updateMany({
          where: { id: { in: paymentIds } },
          data: { deletedAt: new Date() },
        });
      }
      if (existing.invoiceNumber && tx.payment?.updateMany) {
        await tx.payment.updateMany({
          where: { referenceNumber: existing.invoiceNumber },
          data: { deletedAt: new Date() },
        });
      }
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

      // 5. Update supplier balance in DB
      if (existing.supplierId) {
        await recalculateSupplierBalance(tx, existing.supplierId);
      }

      return {
        id: updated.id.toString(),
        invoiceNumber: updated.invoiceNumber,
        status: "DELETED",
        message: "Purchase deleted successfully",
      };
    });

    return created;
  }
}

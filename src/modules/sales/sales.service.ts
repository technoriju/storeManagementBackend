import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto) {
    const { items, paymentAmount, paymentMethod, ...saleData } = createSaleDto;

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
      if (saleData.warehouseId) {
        const wh = await tx.warehouse.findUnique({ where: { id: saleData.warehouseId } });
        if (wh) {
          resolvedWarehouseId = wh.id;
        } else {
          const defaultWh = await tx.warehouse.findFirst();
          resolvedWarehouseId = defaultWh ? defaultWh.id : null;
        }
      } else {
        const defaultWh = await tx.warehouse.findFirst();
        resolvedWarehouseId = defaultWh ? defaultWh.id : null;
      }

      let resolvedBranchId: number | null = null;
      if (saleData.branchId) {
        const br = await tx.branch.findUnique({ where: { id: saleData.branchId } });
        resolvedBranchId = br ? br.id : null;
      }

      let resolvedCustomerId: number | null = null;
      if (saleData.customerId) {
        const cust = await tx.customer.findUnique({ where: { id: saleData.customerId } });
        resolvedCustomerId = cust ? cust.id : null;
      }

      const grandTotalNum = Number(saleData.grandTotal || 0);
      const paidVal = saleData.paid !== undefined ? Number(saleData.paid) : Number(paymentAmount || 0);
      const dueVal = saleData.due !== undefined ? Number(saleData.due) : Math.max(0, grandTotalNum - paidVal);
      let payStatus = saleData.paymentStatus;
      if (!payStatus) {
        if (paidVal >= grandTotalNum && grandTotalNum > 0) payStatus = "Paid";
        else if (paidVal > 0) payStatus = "Partial";
        else payStatus = "Unpaid";
      }

      // 3. Create Sale
      const sale = await tx.sale.create({
        data: {
          ...saleData,
          branchId: resolvedBranchId,
          warehouseId: resolvedWarehouseId,
          customerId: resolvedCustomerId,
          status: saleData.status || "COMPLETED",
          saleDate: new Date(saleData.saleDate),
          paid: paidVal,
          due: dueVal,
          paymentStatus: payStatus,
          previousDue: saleData.previousDue !== undefined ? Number(saleData.previousDue) : 0,
          advancePayment: saleData.advancePayment !== undefined ? Number(saleData.advancePayment) : 0,
          showPreviousBalance: Boolean(saleData.showPreviousBalance),
          notes: saleData.notes || null,
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

      // 4. Handle Stock Updates (Subtract for sale in base quantity if warehouse resolved)
      if (resolvedWarehouseId) {
        for (const item of resolvedItems) {
          const existingStock = await tx.stockBalance.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: resolvedWarehouseId,
              },
            },
          });

          if (!existingStock || Number(existingStock.quantity) < item.baseQuantity) {
            if (!existingStock) {
              await tx.stockBalance.create({
                data: {
                  productId: item.productId,
                  warehouseId: resolvedWarehouseId,
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
              warehouseId: resolvedWarehouseId,
              transactionType: "SALE",
              referenceId: `SALE-${sale.id}`,
              unitId: item.unitId,
              unitQuantity: -item.quantity,
              baseQuantity: -item.baseQuantity,
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
            referenceNumber: sale.invoiceNumber,
            type: "receive",
            customerId: resolvedCustomerId,
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

    try {
      return await this.findOne(created.id);
    } catch (_) {
      return this.formatSale(created);
    }
  }

  private readonly saleInclude = {
    customer: true,
    warehouse: true,
    branch: true,
    items: {
      include: {
        product: {
          include: {
            baseUnit: true,
            subUnit: true,
            brand: true,
            category: true,
            subCategory: true,
          },
        },
        productUnit: {
          include: {
            unit: true,
          },
        },
      },
    },
    payments: { include: { payment: true } },
  };

  private formatSale(sale: any) {
    if (!sale) return sale;
    if (!sale.items || !Array.isArray(sale.items)) return sale;

    const formattedItems = sale.items.map((item: any) => {
      if (!item.product) return item;
      const prod = item.product;
      const unitName = prod.baseUnit?.name ?? null;
      const brandName = prod.brand?.name ?? null;
      const subUnitName = prod.subUnit?.name ?? null;
      const categoryName = prod.category?.name ?? null;
      const subCategoryName = prod.subCategory?.name ?? null;

      return {
        ...item,
        unitName: item.unitName ?? (item.productUnit?.unit?.name || unitName),
        unit: item.unit ?? (item.productUnit?.unit?.name || unitName),
        baseUnitName: unitName,
        brandName: item.brandName ?? brandName,
        subUnitName: item.subUnitName ?? subUnitName,
        conversionRate: item.conversionRate !== undefined ? Number(item.conversionRate) : (prod.conversionRate ? Number(prod.conversionRate) : (item.productUnit?.conversionFactor ? Number(item.productUnit.conversionFactor) : undefined)),
        product: {
          ...prod,
          unitName,
          baseUnitName: unitName,
          brandName,
          subUnitName,
          categoryName,
          subCategoryName,
        },
      };
    });

    return {
      ...sale,
      items: formattedItems,
    };
  }

  async findAll() {
    const sales = await this.prisma.sale.findMany({
      where: { deletedAt: null },
      include: this.saleInclude,
      orderBy: { id: 'desc' },
    });
    return sales.map((sale) => this.formatSale(sale));
  }

  async findOne(id: any) {
    let saleId: bigint | null = null;
    try {
      if (typeof id === "bigint") {
        saleId = id;
      } else if (/^\d+$/.test(String(id).trim())) {
        saleId = BigInt(String(id).trim());
      }
    } catch (_) {}

    const idStr = String(id).trim();
    const item = await this.prisma.sale.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(saleId !== null ? [{ id: saleId }] : []),
          { invoiceNumber: idStr },
        ],
      },
      include: this.saleInclude,
    });
    if (!item) {
      throw new NotFoundException("Sale not found");
    }
    return this.formatSale(item);
  }

  async update(id: any, updateSaleDto: UpdateSaleDto) {
    let saleId: bigint | null = null;
    try {
      if (typeof id === "bigint") {
        saleId = id;
      } else if (/^\d+$/.test(String(id).trim())) {
        saleId = BigInt(String(id).trim());
      }
    } catch (_) {}

    const idStr = String(id).trim();
    const invNum = updateSaleDto.invoiceNumber ? String(updateSaleDto.invoiceNumber).trim() : null;
    const existing = await this.prisma.sale.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(saleId !== null ? [{ id: saleId }] : []),
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
      throw new NotFoundException("Sale not found");
    }
    const targetSaleId = existing.id;

    const { items, paymentAmount, paymentMethod, ...saleData } = updateSaleDto;

    return this.prisma.$transaction(async (tx) => {
      let resolvedWarehouseId: number | null = null;
      if (saleData.warehouseId) {
        const wh = await tx.warehouse.findUnique({ where: { id: Number(saleData.warehouseId) } });
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

        const newStatus = String(saleData.status || existing.status || 'COMPLETED').toUpperCase();
        const isNewStocked = newStatus === 'COMPLETED' || newStatus === 'RECEIVED';

        // 1. Reverse stock of old items (add back what previous sale deducted)
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
                data: { quantity: Number(existingStock.quantity) + oldBaseQty },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  productId: oldItem.productId,
                  warehouseId: oldWarehouseId,
                  quantity: oldBaseQty,
                },
              });
            }
          }
        }

        // 2. Deduct stock for new items
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
                data: { quantity: Number(existingStock.quantity) - newItem.baseQuantity },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  productId: newItem.productId,
                  warehouseId: resolvedWarehouseId,
                  quantity: -newItem.baseQuantity,
                },
              });
            }

            await tx.stockTransaction.create({
              data: {
                productId: newItem.productId,
                warehouseId: resolvedWarehouseId,
                transactionType: "SALE_UPDATE",
                referenceId: `SALE-${existing.id}`,
                unitId: newItem.unitId,
                unitQuantity: -Number(newItem.quantity),
                baseQuantity: -newItem.baseQuantity,
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

        // 4. Replace sale items
        await tx.saleItem.deleteMany({
          where: { saleId: targetSaleId },
        });

        await tx.saleItem.createMany({
          data: resolvedItems.map((item) => ({
            saleId: targetSaleId,
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

      // 5. Update sale fields
      const updateData: any = {};
      if (saleData.subTotal !== undefined) updateData.subTotal = Number(saleData.subTotal);
      if (saleData.taxTotal !== undefined) updateData.taxTotal = Number(saleData.taxTotal);
      if (saleData.discountTotal !== undefined) updateData.discountTotal = Number(saleData.discountTotal);
      if (saleData.grandTotal !== undefined) updateData.grandTotal = Number(saleData.grandTotal);
      if (saleData.paid !== undefined) updateData.paid = Number(saleData.paid);
      if (saleData.due !== undefined) updateData.due = Number(saleData.due);
      if (saleData.status !== undefined) updateData.status = saleData.status;
      if (saleData.paymentStatus !== undefined) updateData.paymentStatus = saleData.paymentStatus;
      if (saleData.notes !== undefined) updateData.notes = saleData.notes;
      if (saleData.previousDue !== undefined) updateData.previousDue = Number(saleData.previousDue);
      if (saleData.advancePayment !== undefined) updateData.advancePayment = Number(saleData.advancePayment);
      if (saleData.showPreviousBalance !== undefined) updateData.showPreviousBalance = Boolean(saleData.showPreviousBalance);
      if (saleData.warehouseId !== undefined) updateData.warehouseId = resolvedWarehouseId;
      if (saleData.branchId !== undefined) {
        let bId: number | null = null;
        if (saleData.branchId) {
          const br = await tx.branch.findUnique({ where: { id: Number(saleData.branchId) } });
          bId = br ? br.id : null;
        }
        updateData.branchId = bId;
      }
      if (saleData.customerId !== undefined) {
        let cId: number | null = null;
        if (saleData.customerId) {
          const cust = await tx.customer.findUnique({ where: { id: Number(saleData.customerId) } });
          cId = cust ? cust.id : null;
        }
        updateData.customerId = cId;
      }
      if (saleData.saleDate !== undefined) updateData.saleDate = new Date(saleData.saleDate);

      const updated = await tx.sale.update({
        where: { id: targetSaleId },
        data: updateData,
        include: this.saleInclude,
      });

      return this.formatSale(updated);
    });
  }

  async remove(id: any) {
    let saleId: bigint | null = null;
    try {
      if (typeof id === "bigint") {
        saleId = id;
      } else if (/^\d+$/.test(String(id).trim())) {
        saleId = BigInt(String(id).trim());
      }
    } catch (_) {}

    const idStr = String(id).trim();
    const existing = await this.prisma.sale.findFirst({
      where: saleId !== null
        ? { id: saleId, deletedAt: null }
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
      throw new NotFoundException("Sale not found");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Restore Stock (fallback to default warehouse if not specified on sale)
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
              data: { quantity: Number(existingStock.quantity) + baseQty },
            });
          } else {
            await tx.stockBalance.create({
              data: {
                productId: item.productId,
                warehouseId: targetWarehouseId,
                quantity: baseQty,
              },
            });
          }

          // Create reversing StockTransaction
          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              warehouseId: targetWarehouseId,
              transactionType: "SALE_CANCELLED",
              referenceId: `SALE-${existing.id}`,
              unitId: item.productUnit?.unitId ?? null,
              unitQuantity: Number(item.quantity),
              baseQuantity: baseQty,
            },
          });
        }
      }

      // 2. Mark items soft-deleted
      if (tx.saleItem?.updateMany) {
        await tx.saleItem.updateMany({
          where: { saleId: existing.id },
          data: { deletedAt: new Date() },
        });
      }

      // 3. Mark sale payments soft-deleted
      if (tx.salePayment?.updateMany) {
        await tx.salePayment.updateMany({
          where: { saleId: existing.id },
          data: { deletedAt: new Date() },
        });
      }

      // 4. Mark sale soft-deleted
      await tx.sale.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });

      return {
        success: true,
        message: "Sale deleted successfully",
        id: existing.id.toString(),
        invoiceNumber: existing.invoiceNumber,
      };
    });
  }
}

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
  }

  async findAll() {
    return this.prisma.sale.findMany({
      where: { deletedAt: null },
      include: {
        customer: true,
        warehouse: true,
        branch: true,
        items: { include: { product: true } },
        payments: { include: { payment: true } },
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
    const saleId = BigInt(id);
    const existing = await this.prisma.sale.findFirst({
      where: { id: saleId, deletedAt: null },
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

    const { items, paymentAmount, paymentMethod, ...saleData } = updateSaleDto;

    return this.prisma.$transaction(async (tx) => {
      const warehouseId = saleData.warehouseId !== undefined
        ? (saleData.warehouseId ? Number(saleData.warehouseId) : null)
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
                data: { quantity: Number(existingStock.quantity) + oldBaseQty },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  productId: oldItem.productId,
                  warehouseId: existing.warehouseId,
                  quantity: oldBaseQty,
                },
              });
            }
          }
        }

        // 2. Deduct stock for new items
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
                data: { quantity: Number(existingStock.quantity) - newItem.baseQuantity },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  productId: newItem.productId,
                  warehouseId: warehouseId,
                  quantity: -newItem.baseQuantity,
                },
              });
            }

            await tx.stockTransaction.create({
              data: {
                productId: newItem.productId,
                warehouseId: warehouseId,
                transactionType: "SALE_UPDATE",
                referenceId: `SALE-${existing.id}`,
                unitId: newItem.unitId,
                unitQuantity: -Number(newItem.quantity),
                baseQuantity: -newItem.baseQuantity,
              },
            });
          }
        }

        // 3. Replace sale items
        await tx.saleItem.deleteMany({
          where: { saleId },
        });

        await tx.saleItem.createMany({
          data: resolvedItems.map((item) => ({
            saleId,
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

      // 4. Update sale fields
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
      if (saleData.warehouseId !== undefined) updateData.warehouseId = warehouseId;
      if (saleData.branchId !== undefined) updateData.branchId = saleData.branchId ? Number(saleData.branchId) : null;
      if (saleData.customerId !== undefined) updateData.customerId = saleData.customerId ? Number(saleData.customerId) : null;
      if (saleData.saleDate !== undefined) updateData.saleDate = new Date(saleData.saleDate);

      const updated = await tx.sale.update({
        where: { id: saleId },
        data: updateData,
        include: {
          items: { include: { product: true } },
          customer: true,
          warehouse: true,
          branch: true,
          payments: { include: { payment: true } },
        },
      });

      return updated;
    });
  }

  async remove(id: any) {
    const saleId = BigInt(id);
    const existing = await this.prisma.sale.findFirst({
      where: { id: saleId, deletedAt: null },
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
      // 1. Restore Stock if warehouse was associated
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
              data: { quantity: Number(existingStock.quantity) + baseQty },
            });
          } else {
            await tx.stockBalance.create({
              data: {
                productId: item.productId,
                warehouseId: existing.warehouseId,
                quantity: baseQty,
              },
            });
          }

          // Create reversing StockTransaction
          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              warehouseId: existing.warehouseId,
              transactionType: "SALE_CANCELLED",
              referenceId: `SALE-${existing.id}`,
              unitId: item.productUnit?.unitId ?? null,
              unitQuantity: item.quantity,
              baseQuantity: baseQty,
            },
          });
        }
      }

      // 2. Mark items soft-deleted
      await tx.saleItem.updateMany({
        where: { saleId },
        data: { deletedAt: new Date() },
      });

      // 3. Mark sale soft-deleted
      return tx.sale.update({
        where: { id: saleId },
        data: { deletedAt: new Date() },
      });
    });
  }
}

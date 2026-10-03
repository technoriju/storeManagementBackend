import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreatePurchaseOrderDto) {
    const { items, ...poData } = createDto;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          ...poData,
          orderDate: new Date(poData.orderDate),
          expectedDate: poData.expectedDate ? new Date(poData.expectedDate) : null,
          items: {
            create: items.map((item) => ({
              productId: BigInt(item.productId),
              productUnitId: item.productUnitId ? BigInt(item.productUnitId) : null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              taxAmount: item.taxAmount || 0,
              total: item.total,
            })),
          },
        },
        include: { items: { include: { product: true } }, supplier: true },
      });

      return order;
    });
  }

  async findAll() {
    return this.prisma.purchaseOrder.findMany({
      where: { deletedAt: null },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { id: "desc" },
    });
  }

  async findOne(id: bigint) {
    const item = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
    if (!item) {
      throw new NotFoundException("Purchase order not found");
    }
    return item;
  }

  async update(id: bigint, updateDto: UpdatePurchaseOrderDto) {
    await this.findOne(id);
    const { items, ...data } = updateDto as any;
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...data,
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
      },
      include: { items: { include: { product: true } }, supplier: true },
    });
  }

  async remove(id: bigint) {
    await this.findOne(id);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

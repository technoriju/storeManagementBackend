import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateQuotationDto } from "./dto/create-quotation.dto";
import { UpdateQuotationDto } from "./dto/update-quotation.dto";

@Injectable()
export class QuotationsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateQuotationDto) {
    const { items, ...quotationData } = createDto;

    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          ...quotationData,
          date: new Date(quotationData.date),
          expiryDate: quotationData.expiryDate ? new Date(quotationData.expiryDate) : null,
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
        include: { items: { include: { product: true } }, customer: true },
      });

      return quotation;
    });
  }

  async findAll() {
    return this.prisma.quotation.findMany({
      where: { deletedAt: null },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { id: "desc" },
    });
  }

  async findOne(id: bigint) {
    const item = await this.prisma.quotation.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
    if (!item) {
      throw new NotFoundException("Quotation not found");
    }
    return item;
  }

  async update(id: bigint, updateDto: UpdateQuotationDto) {
    await this.findOne(id);
    const { items, ...data } = updateDto as any;
    return this.prisma.quotation.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: { items: { include: { product: true } }, customer: true },
    });
  }

  async remove(id: bigint) {
    await this.findOne(id);
    return this.prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

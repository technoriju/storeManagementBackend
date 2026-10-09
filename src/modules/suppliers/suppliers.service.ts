import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateOutstanding(purchases: any[], payments: any[]): number {
    const totalPurchased = (purchases || []).reduce((sum, p) => {
      const gt = Number(p.grandTotal || p.total || 0);
      let returned = 0;
      if (p.returns && Array.isArray(p.returns)) {
        returned = p.returns.reduce(
          (rSum: number, r: any) => rSum + Number(r.totalAmount || 0),
          0
        );
      }
      return sum + (gt - returned);
    }, 0);

    let totalPaid = 0;
    let totalRefundReceived = 0;
    (payments || []).forEach((p) => {
      const amt = Number(p.amount || 0);
      const t = (p.type || "pay").toLowerCase();
      if (t === "pay" || t === "paid") {
        totalPaid += amt;
      } else if (t === "receive" || t === "received") {
        totalRefundReceived += amt;
      }
    });

    return Number(((totalPurchased + totalRefundReceived) - totalPaid).toFixed(2));
  }

  async create(createSupplierDto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({
      where: { name: createSupplierDto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException("Supplier name already exists");
    }

    const created = await this.prisma.supplier.create({
      data: createSupplierDto,
    });
    return { ...created, outstandingBalance: 0 };
  }

  async sync(payloads: any[]) {
    const results = [];
    for (const payload of payloads) {
      const { id, ...data } = payload;
      if (id) {
        try {
          const updated = await this.update(Number(id), data);
          results.push(updated);
        } catch (error) {
          if (error instanceof NotFoundException) {
            try {
              const created = await this.create(data);
              results.push({ ...created, _clientTempId: id });
            } catch (createError) {}
          }
        }
      } else {
        try {
          const created = await this.create(data);
          results.push(created);
        } catch (error) {}
      }
    }
    return results;
  }

  async findAll() {
    const suppliers = await this.prisma.supplier.findMany({
      where: { deletedAt: null },
      include: {
        payments: {
          where: {
            deletedAt: null,
          },
          select: { amount: true, type: true },
        },
        purchases: {
          where: {
            deletedAt: null,
            NOT: { status: { in: ["cancelled", "CANCELLED"] } },
          },
          select: {
            due: true,
            paid: true,
            grandTotal: true,
            returns: { select: { totalAmount: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    return suppliers.map((s) => {
      const { purchases, payments, ...rest } = s;
      return {
        ...rest,
        outstandingBalance: this.calculateOutstanding(purchases, payments),
      };
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      include: {
        payments: {
          where: {
            deletedAt: null,
          },
          select: { amount: true, type: true },
        },
        purchases: {
          where: {
            deletedAt: null,
            NOT: { status: { in: ["cancelled", "CANCELLED"] } },
          },
          select: {
            due: true,
            paid: true,
            grandTotal: true,
            returns: { select: { totalAmount: true } },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    const { purchases, payments, ...rest } = item;
    return {
      ...rest,
      outstandingBalance: this.calculateOutstanding(purchases, payments),
    };
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    const item = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    if (updateSupplierDto.name && updateSupplierDto.name !== item.name) {
      const existing = await this.prisma.supplier.findFirst({
        where: { name: updateSupplierDto.name, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException("Supplier name already exists");
      }
    }

    await this.prisma.supplier.update({
      where: { id },
      data: {
        ...updateSupplierDto,
        version: { increment: 1 },
      },
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const item = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }
}

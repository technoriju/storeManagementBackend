import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { name: createCustomerDto.name, deletedAt: null },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.customer.create({
      data: createCustomerDto,
    });
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
            } catch (createError) {
              // ignore or handle error
            }
          }
        }
      } else {
        try {
          const created = await this.create(data);
          results.push(created);
        } catch (error) {
          // ignore or handle error
        }
      }
    }
    return results;
  }

  async findAll() {
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null },
      include: {
        payments: {
          where: {
            deletedAt: null,
            salePayments: { none: {} },
            OR: [
              { type: null },
              { type: 'receive' },
              { type: 'RECEIVE' },
              { type: 'RECEIVED' },
            ],
          },
          select: { amount: true },
        },
        sales: {
          where: { deletedAt: null },
          select: { due: true, paid: true, grandTotal: true },
        },
      },
      orderBy: { id: 'desc' },
    });

    return customers.map((c) => {
      const { sales, payments, ...rest } = c;
      const salesDue = (sales || []).reduce(
        (sum, s) => sum + Number(s.due || 0),
        0
      );
      const unallocated = (payments || []).reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      );
      const netBalance = Number((salesDue - unallocated).toFixed(2));
      return {
        ...rest,
        outstandingBalance: netBalance,
      };
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        payments: {
          where: {
            deletedAt: null,
            salePayments: { none: {} },
            OR: [
              { type: null },
              { type: 'receive' },
              { type: 'RECEIVE' },
              { type: 'RECEIVED' },
            ],
          },
          select: { amount: true },
        },
        sales: {
          where: { deletedAt: null },
          select: { due: true, paid: true, grandTotal: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const { sales, payments, ...rest } = item;
    const salesDue = (sales || []).reduce(
      (sum, s) => sum + Number(s.due || 0),
      0
    );
    const unallocated = (payments || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    const netBalance = Number((salesDue - unallocated).toFixed(2));
    return {
      ...rest,
      outstandingBalance: netBalance,
    };
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const item = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    if (updateCustomerDto.name && updateCustomerDto.name !== item.name) {
      const existing = await this.prisma.customer.findFirst({
        where: { name: updateCustomerDto.name, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException("Customer name already exists");
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...updateCustomerDto,
        version: { increment: 1 },
      },
    });
  }

  async remove(id: number) {
    const item = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }
}

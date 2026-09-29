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
      throw new ConflictException("Customer name already exists");
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
    return this.prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return item;
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

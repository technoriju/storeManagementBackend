import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapPayment(payment: any) {
    if (!payment) return payment;
    const numId = Number(payment.id);
    return {
      ...payment,
      id: numId,
      backendId: numId,
      amount: Number(payment.amount),
      method: payment.paymentMethod,
      reference: payment.referenceNumber,
    };
  }

  async create(createPaymentDto: CreatePaymentDto) {
    const {
      amount,
      paymentMethod,
      method,
      referenceNumber,
      reference,
      type,
      notes,
      customerId,
      supplierId,
      paymentDate,
    } = createPaymentDto;

    const resolvedMethod = (paymentMethod || method || "cash").toLowerCase();
    const resolvedRef = referenceNumber || reference || null;
    const resolvedType = type || "receive";
    const date = paymentDate ? new Date(paymentDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve customer / supplier foreign keys safely
      let resolvedCustomerId: number | null = null;
      if (customerId && Number(customerId) > 0) {
        const cust = await tx.customer.findUnique({
          where: { id: Number(customerId) },
        });
        if (cust) resolvedCustomerId = cust.id;
      }

      let resolvedSupplierId: number | null = null;
      if (supplierId && Number(supplierId) > 0) {
        const supp = await tx.supplier.findUnique({
          where: { id: Number(supplierId) },
        });
        if (supp) resolvedSupplierId = supp.id;
      }

      // 2. Create payment record
      const created = await tx.payment.create({
        data: {
          amount,
          paymentMethod: resolvedMethod,
          referenceNumber: resolvedRef,
          type: resolvedType,
          notes: notes || null,
          customerId: resolvedCustomerId,
          supplierId: resolvedSupplierId,
          paymentDate: date,
        },
        include: {
          customer: true,
          supplier: true,
        },
      });

      return this.mapPayment(created);
    });
  }

  async sync(payloads: any[]) {
    const results = [];
    for (const payload of payloads) {
      const { id, backendId, ...data } = payload;
      const targetId = backendId || (id && Number(id) > 0 ? Number(id) : null);
      if (targetId) {
        try {
          const updated = await this.update(BigInt(targetId), data);
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
          results.push({ ...created, _clientTempId: id });
        } catch (error) {}
      }
    }
    return results;
  }

  async findAll() {
    const items = await this.prisma.payment.findMany({
      where: { deletedAt: null },
      include: {
        customer: true,
        supplier: true,
      },
      orderBy: { id: "desc" },
    });
    return items.map((item) => this.mapPayment(item));
  }

  async findOne(id: bigint | number) {
    const item = await this.prisma.payment.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: {
        customer: true,
        supplier: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return this.mapPayment(item);
  }

  async update(id: bigint | number, updatePaymentDto: UpdatePaymentDto) {
    await this.findOne(id);

    const data: any = { ...updatePaymentDto };
    if (data.method && !data.paymentMethod) {
      data.paymentMethod = data.method.toLowerCase();
      delete data.method;
    }
    if (data.reference && !data.referenceNumber) {
      data.referenceNumber = data.reference;
      delete data.reference;
    }
    delete data.id;
    delete data.backendId;
    delete data.syncStatus;
    delete data._clientTempId;

    if (data.paymentDate) {
      data.paymentDate = new Date(data.paymentDate);
    }
    if (data.amount !== undefined) {
      data.amount = Number(data.amount);
    }
    if (data.customerId !== undefined) {
      data.customerId = data.customerId && Number(data.customerId) > 0 ? Number(data.customerId) : null;
    }
    if (data.supplierId !== undefined) {
      data.supplierId = data.supplierId && Number(data.supplierId) > 0 ? Number(data.supplierId) : null;
    }

    const updated = await this.prisma.payment.update({
      where: { id: BigInt(id) },
      data: {
        ...data,
        version: { increment: 1 },
      },
      include: {
        customer: true,
        supplier: true,
      },
    });

    return this.mapPayment(updated);
  }

  async remove(id: bigint | number) {
    await this.findOne(id);
    return this.prisma.payment.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() },
    });
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/data-access/prisma/prisma.service";
import { CreatePayrollDto, MarkPayrollPaidDto } from "./dto/payroll.dto";

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePayrollDto) {
    const emp = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      include: { department: true, designation: true },
    });
    if (!emp) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }

    const basicSalary = Number(dto.basicSalary || emp.salary || 0);
    const allowances = Number(dto.allowances || 0);
    const deductions = Number(dto.deductions || 0);
    const netSalary = dto.netSalary !== undefined ? Number(dto.netSalary) : Math.max(0, basicSalary + allowances - deductions);

    return this.prisma.payroll.create({
      data: {
        employeeId: dto.employeeId,
        employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
        departmentName: emp.department?.name || emp.departmentName,
        designationName: emp.designation?.name || emp.designationName,
        month: dto.month,
        year: dto.year,
        basicSalary,
        allowances,
        deductions,
        netSalary,
        status: dto.status || "GENERATED",
        notes: dto.notes,
        deviceId: dto.deviceId,
      },
      include: {
        employee: true,
      },
    });
  }

  async findAll(params?: { month?: string; year?: number; status?: string; employeeId?: number }) {
    const where: any = { deletedAt: null };
    if (params?.month) where.month = params.month;
    if (params?.year) where.year = params.year;
    if (params?.status && params.status !== "ALL") where.status = params.status;
    if (params?.employeeId) where.employeeId = params.employeeId;

    return this.prisma.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });
  }

  async findOne(id: number) {
    const slip = await this.prisma.payroll.findFirst({
      where: { id, deletedAt: null },
      include: {
        employee: true,
      },
    });
    if (!slip) {
      throw new NotFoundException(`Payroll record ${id} not found`);
    }
    return slip;
  }

  async markPaid(id: number, dto: MarkPayrollPaidDto) {
    const slip = await this.prisma.payroll.findFirst({
      where: { id, deletedAt: null },
    });
    if (!slip) {
      throw new NotFoundException(`Payroll record ${id} not found`);
    }

    return this.prisma.payroll.update({
      where: { id },
      data: {
        status: "PAID",
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        paymentMethod: dto.paymentMethod || "BANK_TRANSFER",
        version: { increment: 1 },
      },
    });
  }

  async remove(id: number) {
    const slip = await this.prisma.payroll.findFirst({
      where: { id, deletedAt: null },
    });
    if (!slip) {
      throw new NotFoundException(`Payroll record ${id} not found`);
    }

    return this.prisma.payroll.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

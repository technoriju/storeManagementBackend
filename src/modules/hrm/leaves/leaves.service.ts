import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/data-access/prisma/prisma.service";
import { CreateLeaveTypeDto, CreateLeaveRequestDto, UpdateLeaveStatusDto } from "./dto/leave.dto";

@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  // =================== LEAVE TYPES ===================

  async createType(dto: CreateLeaveTypeDto) {
    const existing = await this.prisma.leaveType.findFirst({
      where: { name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Leave category "${dto.name}" already exists`);
    }

    return this.prisma.leaveType.create({
      data: {
        name: dto.name,
        daysAllowed: dto.daysAllowed ?? 12,
        description: dto.description,
        status: dto.status || "ACTIVE",
        deviceId: dto.deviceId,
      },
    });
  }

  async findAllTypes() {
    return this.prisma.leaveType.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { leaveRequests: true } },
      },
      orderBy: { id: "asc" },
    });
  }

  async removeType(id: number) {
    const lt = await this.prisma.leaveType.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { leaveRequests: true } } },
    });

    if (!lt) {
      throw new NotFoundException(`Leave type ${id} not found`);
    }

    if (lt._count.leaveRequests > 0) {
      throw new ConflictException(`Cannot delete leave type with existing applications`);
    }

    return this.prisma.leaveType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // =================== LEAVE REQUESTS ===================

  async createRequest(dto: CreateLeaveRequestDto) {
    const emp = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      include: { department: true },
    });
    if (!emp) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }

    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: dto.leaveTypeId },
    });
    if (!leaveType) {
      throw new NotFoundException(`Leave type ${dto.leaveTypeId} not found`);
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    let days = dto.days;
    if (!days) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }

    return this.prisma.leaveRequest.create({
      data: {
        employeeId: dto.employeeId,
        employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
        departmentName: emp.department?.name || emp.departmentName,
        leaveTypeId: dto.leaveTypeId,
        leaveTypeName: leaveType.name,
        startDate: start,
        endDate: end,
        days,
        reason: dto.reason,
        status: dto.status || "PENDING",
        deviceId: dto.deviceId,
      },
      include: {
        employee: true,
        leaveType: true,
      },
    });
  }

  async findAllRequests(status?: string, employeeId?: number) {
    const where: any = { deletedAt: null };
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        leaveType: { select: { id: true, name: true } },
      },
      orderBy: { id: "desc" },
    });
  }

  async updateStatus(id: number, dto: UpdateLeaveStatusDto) {
    const req = await this.prisma.leaveRequest.findFirst({
      where: { id, deletedAt: null },
    });
    if (!req) {
      throw new NotFoundException(`Leave request ${id} not found`);
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: dto.status,
        approvedBy: dto.approvedBy || "Administrator",
        version: { increment: 1 },
      },
    });
  }

  async removeRequest(id: number) {
    const req = await this.prisma.leaveRequest.findFirst({
      where: { id, deletedAt: null },
    });
    if (!req) {
      throw new NotFoundException(`Leave request ${id} not found`);
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

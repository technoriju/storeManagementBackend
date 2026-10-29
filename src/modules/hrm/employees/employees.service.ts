import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/data-access/prisma/prisma.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateNextCode(): Promise<string> {
    const count = await this.prisma.employee.count();
    return `EMP-${(count + 1).toString().padStart(4, "0")}`;
  }

  async create(dto: CreateEmployeeDto) {
    let employeeCode = dto.employeeCode;
    if (!employeeCode) {
      employeeCode = await this.generateNextCode();
    }

    const codeExists = await this.prisma.employee.findFirst({
      where: { employeeCode, deletedAt: null },
    });
    if (codeExists) {
      throw new ConflictException(`Employee code "${employeeCode}" already exists`);
    }

    // Validate foreign keys safely to avoid Prisma P2003 foreign key constraint errors
    let departmentId: number | null = null;
    let departmentName = dto.departmentName || null;
    if (dto.departmentId && dto.departmentId > 0) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (dept) {
        departmentId = dept.id;
        departmentName = dept.name;
      }
    }

    let designationId: number | null = null;
    let designationName = dto.designationName || null;
    if (dto.designationId && dto.designationId > 0) {
      const desig = await this.prisma.designation.findUnique({ where: { id: dto.designationId } });
      if (desig) {
        designationId = desig.id;
        designationName = desig.name;
      }
    }

    let shiftId: number | null = null;
    let shiftName = dto.shiftName || null;
    if (dto.shiftId && dto.shiftId > 0) {
      const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
      if (shift) {
        shiftId = shift.id;
        shiftName = shift.name;
      }
    }

    return this.prisma.employee.create({
      data: {
        employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        departmentId,
        departmentName,
        designationId,
        designationName,
        shiftId,
        shiftName,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
        salary: Number(dto.salary ?? 0),
        employmentType: dto.employmentType || "FULL_TIME",
        status: dto.status || "ACTIVE",
        address: dto.address,
        emergencyContact: dto.emergencyContact,
        deviceId: dto.deviceId,
      },
      include: {
        department: true,
        designation: true,
        shift: true,
      },
    });
  }

  async findAll(params?: { departmentId?: number; status?: string; search?: string }) {
    const where: any = { deletedAt: null };

    if (params?.departmentId) {
      where.departmentId = params.departmentId;
    }

    if (params?.status && params.status !== "ALL") {
      where.status = params.status;
    }

    if (params?.search) {
      const q = params.search;
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { employeeCode: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    return this.prisma.employee.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        designation: { select: { id: true, name: true, code: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
      },
      orderBy: { id: "desc" },
    });
  }

  async findOne(id: number) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: true,
        designation: true,
        shift: true,
        attendances: { take: 10, orderBy: { date: "desc" } },
        leaveRequests: { take: 10, orderBy: { id: "desc" } },
        payrolls: { take: 10, orderBy: { id: "desc" } },
      },
    });

    if (!emp) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return emp;
  }

  async update(id: number, dto: UpdateEmployeeDto) {
    let emp = null;
    if (id > 0) {
      emp = await this.prisma.employee.findFirst({
        where: { id, deletedAt: null },
      });
    }

    if (!emp && dto.employeeCode) {
      emp = await this.prisma.employee.findFirst({
        where: { employeeCode: dto.employeeCode, deletedAt: null },
      });
    }

    if (!emp) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const realId = emp.id;

    if (dto.employeeCode && dto.employeeCode !== emp.employeeCode) {
      const exists = await this.prisma.employee.findFirst({
        where: { employeeCode: dto.employeeCode, id: { not: realId }, deletedAt: null },
      });
      if (exists) {
        throw new ConflictException(`Employee code "${dto.employeeCode}" already exists`);
      }
    }

    // Validate foreign keys safely
    let departmentId = emp.departmentId;
    let departmentName = dto.departmentName || emp.departmentName;
    if (dto.departmentId !== undefined) {
      if (dto.departmentId && dto.departmentId > 0) {
        const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
        if (dept) {
          departmentId = dept.id;
          departmentName = dept.name;
        } else {
          departmentId = null;
        }
      } else {
        departmentId = null;
      }
    }

    let designationId = emp.designationId;
    let designationName = dto.designationName || emp.designationName;
    if (dto.designationId !== undefined) {
      if (dto.designationId && dto.designationId > 0) {
        const desig = await this.prisma.designation.findUnique({ where: { id: dto.designationId } });
        if (desig) {
          designationId = desig.id;
          designationName = desig.name;
        } else {
          designationId = null;
        }
      } else {
        designationId = null;
      }
    }

    let shiftId = emp.shiftId;
    let shiftName = dto.shiftName || emp.shiftName;
    if (dto.shiftId !== undefined) {
      if (dto.shiftId && dto.shiftId > 0) {
        const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
        if (shift) {
          shiftId = shift.id;
          shiftName = shift.name;
        } else {
          shiftId = null;
        }
      } else {
        shiftId = null;
      }
    }

    return this.prisma.employee.update({
      where: { id: realId },
      data: {
        employeeCode: dto.employeeCode || emp.employeeCode,
        firstName: dto.firstName !== undefined ? dto.firstName : emp.firstName,
        lastName: dto.lastName !== undefined ? dto.lastName : emp.lastName,
        email: dto.email !== undefined ? dto.email : emp.email,
        phone: dto.phone !== undefined ? dto.phone : emp.phone,
        departmentId,
        departmentName,
        designationId,
        designationName,
        shiftId,
        shiftName,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : emp.joiningDate,
        salary: dto.salary !== undefined ? Number(dto.salary) : emp.salary,
        employmentType: dto.employmentType || emp.employmentType,
        status: dto.status || emp.status,
        address: dto.address !== undefined ? dto.address : emp.address,
        emergencyContact: dto.emergencyContact !== undefined ? dto.emergencyContact : emp.emergencyContact,
        version: { increment: 1 },
      },
      include: {
        department: true,
        designation: true,
        shift: true,
      },
    });
  }

  async remove(id: number) {
    let emp = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!emp) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return this.prisma.employee.update({
      where: { id: emp.id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
  }
}

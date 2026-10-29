import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/data-access/prisma/prisma.service";
import { LogAttendanceDto } from "./dto/log-attendance.dto";

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async logAttendance(dto: LogAttendanceDto) {
    const emp = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      include: { department: true },
    });

    if (!emp) {
      throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);
    }

    const employeeName = `${emp.firstName} ${emp.lastName}`.trim();
    const departmentName = emp.department?.name || emp.departmentName;
    const targetDate = new Date(dto.date);

    // Calculate total hours if not provided but both times are available
    let totalHours = dto.totalHours;
    if (totalHours === undefined && dto.clockIn && dto.clockOut) {
      try {
        const [inH, inM] = dto.clockIn.split(":").map(Number);
        const [outH, outM] = dto.clockOut.split(":").map(Number);
        let diffMinutes = outH * 60 + outM - (inH * 60 + inM);
        if (diffMinutes < 0) diffMinutes += 24 * 60;
        totalHours = parseFloat((diffMinutes / 60).toFixed(2));
      } catch {
        totalHours = 8;
      }
    }

    // Check if attendance already recorded for this employee and date
    const existing = await this.prisma.attendance.findFirst({
      where: {
        employeeId: dto.employeeId,
        date: targetDate,
        deletedAt: null,
      },
    });

    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          clockIn: dto.clockIn ?? existing.clockIn,
          clockOut: dto.clockOut ?? existing.clockOut,
          status: dto.status ?? existing.status,
          totalHours: totalHours ?? existing.totalHours,
          notes: dto.notes ?? existing.notes,
          version: { increment: 1 },
        },
      });
    }

    return this.prisma.attendance.create({
      data: {
        employeeId: dto.employeeId,
        employeeName,
        departmentName,
        date: targetDate,
        clockIn: dto.clockIn,
        clockOut: dto.clockOut,
        status: dto.status || "PRESENT",
        totalHours: totalHours ?? 8,
        notes: dto.notes,
        deviceId: dto.deviceId,
      },
    });
  }

  async findAll(params?: { date?: string; employeeId?: number; status?: string }) {
    const where: any = { deletedAt: null };

    if (params?.date) {
      where.date = new Date(params.date);
    }

    if (params?.employeeId) {
      where.employeeId = params.employeeId;
    }

    if (params?.status && params.status !== "ALL") {
      where.status = params.status;
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            departmentName: true,
            designationName: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });
  }

  async remove(id: number) {
    const item = await this.prisma.attendance.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    return this.prisma.attendance.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

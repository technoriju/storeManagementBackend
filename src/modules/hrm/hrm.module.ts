import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/data-access/prisma/prisma.module";

import { DepartmentsController } from "./departments/departments.controller";
import { DepartmentsService } from "./departments/departments.service";

import { DesignationsController } from "./designations/designations.controller";
import { DesignationsService } from "./designations/designations.service";

import { ShiftsController } from "./shifts/shifts.controller";
import { ShiftsService } from "./shifts/shifts.service";

import { EmployeesController } from "./employees/employees.controller";
import { EmployeesService } from "./employees/employees.service";

import { AttendanceController } from "./attendance/attendance.controller";
import { AttendanceService } from "./attendance/attendance.service";

import { LeavesController } from "./leaves/leaves.controller";
import { LeavesService } from "./leaves/leaves.service";

import { HolidaysController } from "./holidays/holidays.controller";
import { HolidaysService } from "./holidays/holidays.service";

import { PayrollController } from "./payroll/payroll.controller";
import { PayrollService } from "./payroll/payroll.service";

@Module({
  imports: [PrismaModule],
  controllers: [
    DepartmentsController,
    DesignationsController,
    ShiftsController,
    EmployeesController,
    AttendanceController,
    LeavesController,
    HolidaysController,
    PayrollController,
  ],
  providers: [
    DepartmentsService,
    DesignationsService,
    ShiftsService,
    EmployeesService,
    AttendanceService,
    LeavesService,
    HolidaysService,
    PayrollService,
  ],
  exports: [
    DepartmentsService,
    DesignationsService,
    ShiftsService,
    EmployeesService,
    AttendanceService,
    LeavesService,
    HolidaysService,
    PayrollService,
  ],
})
export class HrmModule {}

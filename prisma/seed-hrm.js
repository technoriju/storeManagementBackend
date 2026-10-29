"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding HRM initial data...');
    const depts = [
        { id: 1, name: 'Sales & Marketing', code: 'DEP-SALES', description: 'Handles client relations, sales and marketing campaigns', managerName: 'Sarah Connor', status: 'ACTIVE' },
        { id: 2, name: 'Accounts & Finance', code: 'DEP-FIN', description: 'Manages accounting, invoices, taxes, and audits', managerName: 'Michael Scott', status: 'ACTIVE' },
        { id: 3, name: 'Inventory & Warehouse', code: 'DEP-INV', description: 'Oversees stock levels, dispatch, and goods receipts', managerName: 'Dwight Schrute', status: 'ACTIVE' },
        { id: 4, name: 'Human Resources', code: 'DEP-HR', description: 'Recruitment, employee relations, and attendance', managerName: 'Toby Flenderson', status: 'ACTIVE' },
        { id: 5, name: 'Information Technology', code: 'DEP-IT', description: 'Systems support, database and software infrastructure', managerName: 'Jim Halpert', status: 'ACTIVE' },
    ];
    for (const d of depts) {
        await prisma.department.upsert({
            where: { code: d.code },
            update: d,
            create: d,
        });
    }
    console.log('Departments seeded.');
    const desigs = [
        { id: 1, name: 'Sales Executive', code: 'DES-SE', departmentId: 1, departmentName: 'Sales & Marketing', description: 'Field sales and customer acquisition', status: 'ACTIVE' },
        { id: 2, name: 'Senior Accountant', code: 'DES-SA', departmentId: 2, departmentName: 'Accounts & Finance', description: 'General ledger and financial reporting', status: 'ACTIVE' },
        { id: 3, name: 'Warehouse Manager', code: 'DES-WM', departmentId: 3, departmentName: 'Inventory & Warehouse', description: 'Warehouse operations and fulfillment', status: 'ACTIVE' },
        { id: 4, name: 'HR Executive', code: 'DES-HR', departmentId: 4, departmentName: 'Human Resources', description: 'Employee onboarding and records', status: 'ACTIVE' },
        { id: 5, name: 'Store Supervisor', code: 'DES-SS', departmentId: 1, departmentName: 'Sales & Marketing', description: 'Retail outlet floor supervision', status: 'ACTIVE' },
    ];
    for (const dg of desigs) {
        await prisma.designation.upsert({
            where: { code: dg.code },
            update: dg,
            create: dg,
        });
    }
    console.log('Designations seeded.');
    const shifts = [
        { id: 1, name: 'Morning General', code: 'SHF-MG', startTime: '09:00', endTime: '18:00', lateToleranceMinutes: 15, breakDurationMinutes: 60, status: 'ACTIVE' },
        { id: 2, name: 'Early Shift', code: 'SHF-ES', startTime: '07:00', endTime: '16:00', lateToleranceMinutes: 15, breakDurationMinutes: 60, status: 'ACTIVE' },
        { id: 3, name: 'Evening Shift', code: 'SHF-EV', startTime: '14:00', endTime: '23:00', lateToleranceMinutes: 15, breakDurationMinutes: 60, status: 'ACTIVE' },
        { id: 4, name: 'Night Shift', code: 'SHF-NT', startTime: '22:00', endTime: '07:00', lateToleranceMinutes: 15, breakDurationMinutes: 60, status: 'ACTIVE' },
    ];
    for (const s of shifts) {
        await prisma.shift.upsert({
            where: { code: s.code },
            update: s,
            create: s,
        });
    }
    console.log('Shifts seeded.');
    const ltypes = [
        { id: 1, name: 'Casual Leave', daysAllowed: 12, description: 'Paid leave for personal matters', status: 'ACTIVE' },
        { id: 2, name: 'Sick Leave', daysAllowed: 10, description: 'Medical and sickness leave with certificate', status: 'ACTIVE' },
        { id: 3, name: 'Annual Privilege Leave', daysAllowed: 15, description: 'Earned annual paid time off', status: 'ACTIVE' },
        { id: 4, name: 'Maternity / Paternity Leave', daysAllowed: 90, description: 'Parental care leave', status: 'ACTIVE' },
    ];
    for (const lt of ltypes) {
        const existing = await prisma.leaveType.findFirst({ where: { name: lt.name } });
        if (!existing) {
            await prisma.leaveType.create({ data: lt });
        }
    }
    console.log('Leave Types seeded.');
    const hols = [
        { name: "New Year's Day", date: new Date('2026-01-01'), type: 'PUBLIC', description: 'National holiday celebration', status: 'ACTIVE' },
        { name: 'Labor Day', date: new Date('2026-05-01'), type: 'PUBLIC', description: 'International workers day', status: 'ACTIVE' },
        { name: 'Independence Day', date: new Date('2026-07-04'), type: 'PUBLIC', description: 'National independence commemoration', status: 'ACTIVE' },
        { name: 'Company Foundation Day', date: new Date('2026-10-15'), type: 'COMPANY', description: 'Annual corporate anniversary', status: 'ACTIVE' },
        { name: 'Christmas Day', date: new Date('2026-12-25'), type: 'PUBLIC', description: 'Christmas festival celebration', status: 'ACTIVE' },
    ];
    for (const h of hols) {
        const existing = await prisma.holiday.findFirst({ where: { name: h.name, date: h.date } });
        if (!existing) {
            await prisma.holiday.create({ data: h });
        }
    }
    console.log('Holidays seeded.');
    const emps = [
        { employeeCode: 'EMP-001', firstName: 'Alex', lastName: 'Morgan', email: 'alex.morgan@example.com', phone: '+1 555-0101', departmentId: 1, departmentName: 'Sales & Marketing', designationId: 1, designationName: 'Sales Executive', shiftId: 1, shiftName: 'Morning General', salary: 45000, employmentType: 'FULL_TIME', status: 'ACTIVE', address: '123 Market Street, Suite 4', emergencyContact: '+1 555-9001' },
        { employeeCode: 'EMP-002', firstName: 'David', lastName: 'Miller', email: 'david.miller@example.com', phone: '+1 555-0102', departmentId: 2, departmentName: 'Accounts & Finance', designationId: 2, designationName: 'Senior Accountant', shiftId: 1, shiftName: 'Morning General', salary: 58000, employmentType: 'FULL_TIME', status: 'ACTIVE', address: '456 Financial Ave', emergencyContact: '+1 555-9002' },
        { employeeCode: 'EMP-003', firstName: 'Rachel', lastName: 'Green', email: 'rachel.green@example.com', phone: '+1 555-0103', departmentId: 3, departmentName: 'Inventory & Warehouse', designationId: 3, designationName: 'Warehouse Manager', shiftId: 1, shiftName: 'Morning General', salary: 52000, employmentType: 'FULL_TIME', status: 'ACTIVE', address: '789 Logistics Way', emergencyContact: '+1 555-9003' },
        { employeeCode: 'EMP-004', firstName: 'James', lastName: 'Wilson', email: 'james.wilson@example.com', phone: '+1 555-0104', departmentId: 4, departmentName: 'Human Resources', designationId: 4, designationName: 'HR Executive', shiftId: 1, shiftName: 'Morning General', salary: 48000, employmentType: 'FULL_TIME', status: 'ACTIVE', address: '321 People Blvd', emergencyContact: '+1 555-9004' },
        { employeeCode: 'EMP-005', firstName: 'Sophia', lastName: 'Taylor', email: 'sophia.taylor@example.com', phone: '+1 555-0105', departmentId: 1, departmentName: 'Sales & Marketing', designationId: 5, designationName: 'Store Supervisor', shiftId: 2, shiftName: 'Early Shift', salary: 42000, employmentType: 'FULL_TIME', status: 'ON_LEAVE', address: '654 Retail Road', emergencyContact: '+1 555-9005' },
    ];
    for (const e of emps) {
        await prisma.employee.upsert({
            where: { employeeCode: e.employeeCode },
            update: e,
            create: e,
        });
    }
    console.log('Employees seeded.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-hrm.js.map
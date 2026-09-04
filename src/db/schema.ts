import { relations } from 'drizzle-orm';
import {
  decimal,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ==========================================
// 1. ROLES TABLE (RBAC)
// ==========================================
export const roles = pgTable(
  'roles',
  {
    id: serial('id').primaryKey(),
    roleName: text('role_name').notNull().unique(), // 'Administrator', 'HR Officer', 'Payroll Officer', 'Employee', 'Management'
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    roleNameIdx: uniqueIndex('idx_roles_name').on(table.roleName),
  })
);

// ==========================================
// 2. DEPARTMENTS TABLE (Department 1:M Employee)
// ==========================================
export const departments = pgTable(
  'departments',
  {
    id: serial('id').primaryKey(),
    departmentName: text('department_name').notNull().unique(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    deptNameIdx: uniqueIndex('idx_departments_name').on(table.departmentName),
  })
);

// ==========================================
// 3. EMPLOYEES TABLE
// ==========================================
export const employees = pgTable(
  'employees',
  {
    id: serial('id').primaryKey(),
    employeeCode: text('employee_code').notNull().unique(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone').notNull(),
    departmentId: integer('department_id')
      .references(() => departments.id, { onDelete: 'restrict' })
      .notNull(),
    position: text('position').notNull(),
    basicSalary: decimal('basic_salary', { precision: 12, scale: 2 }).notNull().default('0.00'),
    status: text('status').notNull().default('active'), // 'active', 'inactive'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    empCodeIdx: uniqueIndex('idx_employees_code').on(table.employeeCode),
    empEmailIdx: uniqueIndex('idx_employees_email').on(table.email),
    empDeptIdx: index('idx_employees_dept').on(table.departmentId),
    empStatusIdx: index('idx_employees_status').on(table.status),
  })
);

// ==========================================
// 4. QR CODES TABLE (Employee 1:1 QR Code)
// ==========================================
export const qrCodes = pgTable(
  'qr_codes',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    qrValue: text('qr_value').notNull().unique(),
    generatedAt: timestamp('generated_at').defaultNow().notNull(),
    status: text('status').notNull().default('active'), // 'active', 'revoked'
  },
  (table) => ({
    qrEmployeeIdx: uniqueIndex('idx_qr_employee_id').on(table.employeeId),
    qrValueIdx: uniqueIndex('idx_qr_value').on(table.qrValue),
  })
);

// ==========================================
// 5. USERS TABLE (User : Role RBAC & System Accounts)
// ==========================================
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    roleId: integer('role_id')
      .references(() => roles.id, { onDelete: 'restrict' })
      .notNull(),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'set null' }),
    firebaseUid: text('firebase_uid'),
    status: text('status').notNull().default('active'), // 'active', 'inactive'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: uniqueIndex('idx_users_username').on(table.username),
    userRoleIdx: index('idx_users_role_id').on(table.roleId),
    userEmpIdx: index('idx_users_employee_id').on(table.employeeId),
  })
);

// ==========================================
// 6. ATTENDANCE TABLE (Employee 1:M Attendance)
// ==========================================
export const attendance = pgTable(
  'attendance',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    attendanceDate: text('attendance_date').notNull(), // Format: YYYY-MM-DD
    checkIn: text('check_in').notNull(), // Time string e.g. "08:02:15"
    checkOut: text('check_out'), // Time string e.g. "17:15:30"
    workingHours: decimal('working_hours', { precision: 6, scale: 2 }).notNull().default('0.00'),
    overtimeHours: decimal('overtime_hours', { precision: 6, scale: 2 }).notNull().default('0.00'),
    status: text('status').notNull().default('Present'), // 'Present', 'Late', 'Early Departure', 'Overtime', 'Absent'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    attEmpDateIdx: index('idx_attendance_emp_date').on(table.employeeId, table.attendanceDate),
    attDateIdx: index('idx_attendance_date').on(table.attendanceDate),
    attStatusIdx: index('idx_attendance_status').on(table.status),
  })
);

// ==========================================
// 7. OVERTIME TABLE (Employee 1:M Overtime)
// ==========================================
export const overtime = pgTable(
  'overtime',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    overtimeDate: text('overtime_date').notNull(), // Format: YYYY-MM-DD
    hours: decimal('hours', { precision: 6, scale: 2 }).notNull().default('0.00'),
    rateMultiplier: decimal('rate_multiplier', { precision: 4, scale: 2 }).notNull().default('1.50'),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    reason: text('reason'),
    status: text('status').notNull().default('Pending'), // 'Pending', 'Approved', 'Rejected'
    approvedBy: integer('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    otEmpDateIdx: index('idx_overtime_emp_date').on(table.employeeId, table.overtimeDate),
    otStatusIdx: index('idx_overtime_status').on(table.status),
    otDateIdx: index('idx_overtime_date').on(table.overtimeDate),
  })
);

// ==========================================
// 8. PAYROLL TABLE (Employee 1:M Payroll)
// ==========================================
export const payroll = pgTable(
  'payroll',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    payrollPeriod: text('payroll_period').notNull(), // Format: YYYY-MM e.g. "2026-08"
    basicSalary: decimal('basic_salary', { precision: 12, scale: 2 }).notNull().default('0.00'),
    overtimeAmount: decimal('overtime_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    allowances: decimal('allowances', { precision: 12, scale: 2 }).notNull().default('0.00'),
    deductions: decimal('deductions', { precision: 12, scale: 2 }).notNull().default('0.00'),
    grossSalary: decimal('gross_salary', { precision: 12, scale: 2 }).notNull().default('0.00'),
    netSalary: decimal('net_salary', { precision: 12, scale: 2 }).notNull().default('0.00'),
    status: text('status').notNull().default('Pending'), // 'Pending', 'Processed', 'Paid'
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    payrollEmpPeriodIdx: index('idx_payroll_emp_period').on(table.employeeId, table.payrollPeriod),
    payrollPeriodIdx: index('idx_payroll_period').on(table.payrollPeriod),
    payrollStatusIdx: index('idx_payroll_status').on(table.status),
  })
);

// ==========================================
// 9. SYSTEM SETTINGS TABLE
// ==========================================
export const systemSettings = pgTable(
  'system_settings',
  {
    id: serial('id').primaryKey(),
    settingKey: text('setting_key').notNull().unique(),
    settingValue: text('setting_value').notNull(),
    description: text('description'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    settingKeyIdx: uniqueIndex('idx_settings_key').on(table.settingKey),
  })
);

// ==========================================
// 10. AUDIT LOGS TABLE
// ==========================================
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    username: text('username'),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    details: text('details'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    auditUserIdx: index('idx_audit_user_id').on(table.userId),
    auditEntityIdx: index('idx_audit_entity').on(table.entity),
    auditCreatedIdx: index('idx_audit_created').on(table.createdAt),
  })
);

// ==========================================
// RELATIONS
// ==========================================

// Role 1:M Users
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

// Department 1:M Employees
export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
}));

// Employee 1:M Attendance, 1:M Payroll, 1:M Overtime, 1:1 QR Code
export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  qrCode: one(qrCodes, {
    fields: [employees.id],
    references: [qrCodes.employeeId],
  }),
  user: one(users, {
    fields: [employees.id],
    references: [users.employeeId],
  }),
  attendanceRecords: many(attendance),
  overtimeRecords: many(overtime),
  payrollRecords: many(payroll),
}));

// QR Code 1:1 Employee
export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  employee: one(employees, {
    fields: [qrCodes.employeeId],
    references: [employees.id],
  }),
}));

// User N:1 Role, 1:1 Employee, 1:M Approved Overtimes
export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
  approvedOvertimes: many(overtime),
}));

// Attendance N:1 Employee
export const attendanceRelations = relations(attendance, ({ one }) => ({
  employee: one(employees, {
    fields: [attendance.employeeId],
    references: [employees.id],
  }),
}));

// Overtime N:1 Employee, N:1 Approver User
export const overtimeRelations = relations(overtime, ({ one }) => ({
  employee: one(employees, {
    fields: [overtime.employeeId],
    references: [employees.id],
  }),
  approver: one(users, {
    fields: [overtime.approvedBy],
    references: [users.id],
  }),
}));

// Payroll N:1 Employee
export const payrollRelations = relations(payroll, ({ one }) => ({
  employee: one(employees, {
    fields: [payroll.employeeId],
    references: [employees.id],
  }),
}));

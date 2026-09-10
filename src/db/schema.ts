import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
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
    roleNameCheck: check('chk_roles_name_non_empty', sql`length(trim(${table.roleName})) > 0`),
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
    deptNameCheck: check('chk_departments_name_non_empty', sql`length(trim(${table.departmentName})) > 0`),
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
    photoUrl: text('photo_url'),
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
    empSalaryCheck: check('chk_employees_salary_non_negative', sql`${table.basicSalary} >= 0`),
    empStatusCheck: check('chk_employees_status_valid', sql`${table.status} IN ('active', 'inactive')`),
    empFirstNameCheck: check('chk_employees_first_name_non_empty', sql`length(trim(${table.firstName})) > 0`),
    empLastNameCheck: check('chk_employees_last_name_non_empty', sql`length(trim(${table.lastName})) > 0`),
    empCodeCheck: check('chk_employees_code_non_empty', sql`length(trim(${table.employeeCode})) > 0`),
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
    qrValueCheck: check('chk_qr_codes_value_non_empty', sql`length(trim(${table.qrValue})) > 0`),
    qrStatusCheck: check('chk_qr_codes_status_valid', sql`${table.status} IN ('active', 'revoked', 'expired')`),
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
    usernameCheck: check('chk_users_username_min_length', sql`length(trim(${table.username})) >= 3`),
    userStatusCheck: check('chk_users_status_valid', sql`${table.status} IN ('active', 'inactive')`),
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
    workingHoursCheck: check('chk_attendance_working_hours_range', sql`${table.workingHours} >= 0 AND ${table.workingHours} <= 24`),
    overtimeHoursCheck: check('chk_attendance_overtime_hours_range', sql`${table.overtimeHours} >= 0 AND ${table.overtimeHours} <= 24`),
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
    otHoursCheck: check('chk_overtime_hours_range', sql`${table.hours} > 0 AND ${table.hours} <= 24`),
    otAmountCheck: check('chk_overtime_amount_non_negative', sql`${table.amount} >= 0`),
    otStatusCheck: check('chk_overtime_status_valid', sql`${table.status} IN ('Pending', 'Approved', 'Rejected')`),
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
    payrollBasicSalaryCheck: check('chk_payroll_basic_salary_non_negative', sql`${table.basicSalary} >= 0`),
    payrollGrossSalaryCheck: check('chk_payroll_gross_salary_non_negative', sql`${table.grossSalary} >= 0`),
    payrollNetSalaryCheck: check('chk_payroll_net_salary_non_negative', sql`${table.netSalary} >= 0`),
    payrollAllowancesCheck: check('chk_payroll_allowances_non_negative', sql`${table.allowances} >= 0`),
    payrollDeductionsCheck: check('chk_payroll_deductions_non_negative', sql`${table.deductions} >= 0`),
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

// ==========================================
// 11. AI CONVERSATIONS TABLE
// ==========================================
export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull().default('New Chat'),
    roleName: text('role_name').notNull().default('Employee'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_ai_conversations_user').on(table.userId),
    createdAtIdx: index('idx_ai_conversations_created').on(table.createdAt),
  })
);

// ==========================================
// 12. AI MESSAGES TABLE
// ==========================================
export const aiMessages = pgTable(
  'ai_messages',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .references(() => aiConversations.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull(), // 'user', 'assistant', 'system', 'tool'
    content: text('content').notNull().default(''),
    toolCalls: text('tool_calls'), // JSON stringified tool requests
    toolCallId: text('tool_call_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    convIdx: index('idx_ai_messages_conversation').on(table.conversationId),
    createdAtIdx: index('idx_ai_messages_created').on(table.createdAt),
  })
);

// ==========================================
// 13. AI ACTIVITY LOGS TABLE (AUDIT TRAIL)
// ==========================================
export const aiActivityLogs = pgTable(
  'ai_activity_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    username: text('username'),
    role: text('role'),
    operation: text('operation').notNull(), // 'chat_query', 'tool_execution', 'automation_trigger', 'notification_dispatched'
    toolInvoked: text('tool_invoked'),
    targetEntity: text('target_entity'), // 'employees', 'attendance', 'payroll', 'notifications'
    entityId: text('entity_id'),
    status: text('status').notNull().default('success'), // 'success', 'denied', 'failed', 'confirmed'
    details: text('details'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_ai_activity_user').on(table.userId),
    opIdx: index('idx_ai_activity_op').on(table.operation),
    createdIdx: index('idx_ai_activity_created').on(table.createdAt),
  })
);

// ==========================================
// 14. NOTIFICATIONS TABLE
// ==========================================
export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: text('type').notNull().default('SYSTEM'), // 'ATTENDANCE', 'PAYROLL', 'OVERTIME', 'HR', 'SYSTEM', 'REMINDER', 'ALERT', 'ANNOUNCEMENT', 'SECURITY', 'APPROVAL', 'AI', 'AUTOMATION'
    category: text('category').notNull().default('System'), // 'Attendance', 'Payroll', 'HR', 'System', 'Reminder', 'Alert', 'Announcement', 'Security', 'Approval', 'AI', 'Automation'
    priority: text('priority').notNull().default('medium'), // 'low', 'medium', 'high', 'urgent'
    channel: text('channel').notNull().default('in_app'), // 'in_app', 'email', 'sms', 'whatsapp'
    status: text('status').notNull().default('pending'), // 'pending', 'sent', 'delivered', 'failed', 'retrying'
    actionUrl: text('action_url'),
    metadata: text('metadata'), // JSON stringified metadata safely isolated
    idempotencyKey: text('idempotency_key'),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at'),
    scheduledFor: timestamp('scheduled_for'),
    failureReason: text('failure_reason'),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    sentAt: timestamp('sent_at'),
  },
  (table) => ({
    userIdx: index('idx_notifications_user').on(table.userId),
    empIdx: index('idx_notifications_emp').on(table.employeeId),
    statusIdx: index('idx_notifications_status').on(table.status),
    typeIdx: index('idx_notifications_type').on(table.type),
    isReadIdx: index('idx_notifications_read').on(table.isRead),
    idempotencyIdx: index('idx_notifications_idempotency').on(table.idempotencyKey),
    createdIdx: index('idx_notifications_created').on(table.createdAt),
  })
);

// ==========================================
// 14B. NOTIFICATION DELIVERIES TABLE
// ==========================================
export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: serial('id').primaryKey(),
    notificationId: integer('notification_id')
      .references(() => notifications.id, { onDelete: 'cascade' })
      .notNull(),
    channel: text('channel').notNull(), // 'in_app', 'email', 'whatsapp', 'sms'
    provider: text('provider').notNull().default('internal'), // 'internal', 'smtp', 'whatsapp_mock', 'sms_mock'
    status: text('status').notNull().default('PENDING'), // 'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'RETRYING', 'CANCELLED'
    providerMessageId: text('provider_message_id'),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at'),
    sentAt: timestamp('sent_at'),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    notifIdx: index('idx_notif_deliveries_nid').on(table.notificationId),
    statusIdx: index('idx_notif_deliveries_status').on(table.status),
    channelIdx: index('idx_notif_deliveries_channel').on(table.channel),
  })
);

// ==========================================
// 14C. NOTIFICATION TEMPLATES TABLE
// ==========================================
export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull().unique(), // 'ATTENDANCE_CHECKIN', 'LATE_ATTENDANCE', etc.
    name: text('name').notNull(),
    category: text('category').notNull(), // 'Attendance', 'Payroll', 'HR', etc.
    type: text('type').notNull(), // 'ATTENDANCE', 'PAYROLL', etc.
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    variables: text('variables').notNull().default('[]'), // JSON array of allowed variable strings
    channel: text('channel').notNull().default('all'), // 'all', 'in_app', 'email', 'whatsapp', 'sms'
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex('idx_notif_templates_code').on(table.code),
    categoryIdx: index('idx_notif_templates_cat').on(table.category),
  })
);

// ==========================================
// 15. NOTIFICATION PREFERENCES TABLE
// ==========================================
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    attendanceAlerts: boolean('attendance_alerts').notNull().default(true),
    payrollAlerts: boolean('payroll_alerts').notNull().default(true),
    overtimeAlerts: boolean('overtime_alerts').notNull().default(true),
    hrAnnouncements: boolean('hr_announcements').notNull().default(true),
    systemAlerts: boolean('system_alerts').notNull().default(true),
    securityAlerts: boolean('security_alerts').notNull().default(true),
    aiAlerts: boolean('ai_alerts').notNull().default(true),
    automationAlerts: boolean('automation_alerts').notNull().default(true),
    preferredChannel: text('preferred_channel').notNull().default('in_app'),
    emailEnabled: boolean('email_enabled').notNull().default(true),
    whatsappEnabled: boolean('whatsapp_enabled').notNull().default(false),
    smsEnabled: boolean('sms_enabled').notNull().default(false),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    empIdx: uniqueIndex('idx_notif_pref_emp').on(table.employeeId),
  })
);

// ==========================================
// 16. AI AUTOMATIONS TABLE
// ==========================================
export const aiAutomations = pgTable(
  'ai_automations',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    triggerType: text('trigger_type').notNull(), // 'scheduled_time', 'missing_check_in', 'employee_late', 'missing_check_out', 'overtime_detected', 'payroll_processed', 'payroll_approved', 'manual_trigger'
    triggerConfig: text('trigger_config'), // JSON configuration string
    conditionConfig: text('condition_config'), // JSON conditions string
    actionConfig: text('action_config'), // JSON action specification string
    channel: text('channel').notNull().default('in_app'),
    isActive: boolean('is_active').notNull().default(false), // disabled by default
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    lastRunAt: timestamp('last_run_at'),
    nextRunAt: timestamp('next_run_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    activeIdx: index('idx_ai_automations_active').on(table.isActive),
    triggerIdx: index('idx_ai_automations_trigger').on(table.triggerType),
  })
);

// ==========================================
// 17. AI AUTOMATION EXECUTIONS TABLE
// ==========================================
export const aiAutomationExecutions = pgTable(
  'ai_automation_executions',
  {
    id: serial('id').primaryKey(),
    automationId: integer('automation_id')
      .references(() => aiAutomations.id, { onDelete: 'cascade' })
      .notNull(),
    triggeredBy: text('triggered_by').notNull(), // 'scheduler', 'event', 'manual_test'
    status: text('status').notNull().default('success'), // 'success', 'partial', 'failed'
    summary: text('summary'),
    affectedCount: integer('affected_count').default(0),
    errorDetails: text('error_details'),
    executedAt: timestamp('executed_at').defaultNow().notNull(),
  },
  (table) => ({
    autoIdx: index('idx_ai_exec_automation').on(table.automationId),
    executedIdx: index('idx_ai_exec_time').on(table.executedAt),
  })
);

// ==========================================
// 18. AI ANOMALIES TABLE
// ==========================================
export const aiAnomalies = pgTable(
  'ai_anomalies',
  {
    id: serial('id').primaryKey(),
    anomalyType: text('anomaly_type').notNull(), // 'excessive_overtime', 'missing_checkout', 'repeated_tardiness', 'duplicate_scan_attempt', 'payroll_discrepancy'
    severity: text('severity').notNull().default('MEDIUM'), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    entityType: text('entity_type').notNull(), // 'attendance', 'payroll', 'employee'
    entityId: text('entity_id'),
    description: text('description').notNull(),
    details: text('details'),
    status: text('status').notNull().default('open'), // 'open', 'investigating', 'resolved', 'dismissed'
    detectedAt: timestamp('detected_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: integer('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    statusIdx: index('idx_ai_anomalies_status').on(table.status),
    severityIdx: index('idx_ai_anomalies_severity').on(table.severity),
    detectedIdx: index('idx_ai_anomalies_detected').on(table.detectedAt),
  })
);

// AI Conversations Relations
export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  messages: many(aiMessages),
}));

// AI Messages Relations
export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

// AI Activity Logs Relations
export const aiActivityLogsRelations = relations(aiActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [aiActivityLogs.userId],
    references: [users.id],
  }),
}));

// Notifications Relations
export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  employee: one(employees, {
    fields: [notifications.employeeId],
    references: [employees.id],
  }),
  deliveries: many(notificationDeliveries),
}));

// Notification Deliveries Relations
export const notificationDeliveriesRelations = relations(notificationDeliveries, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationDeliveries.notificationId],
    references: [notifications.id],
  }),
}));

// Notification Preferences Relations
export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  employee: one(employees, {
    fields: [notificationPreferences.employeeId],
    references: [employees.id],
  }),
}));

// AI Automations Relations
export const aiAutomationsRelations = relations(aiAutomations, ({ one, many }) => ({
  creator: one(users, {
    fields: [aiAutomations.createdBy],
    references: [users.id],
  }),
  executions: many(aiAutomationExecutions),
}));

// AI Automation Executions Relations
export const aiAutomationExecutionsRelations = relations(aiAutomationExecutions, ({ one }) => ({
  automation: one(aiAutomations, {
    fields: [aiAutomationExecutions.automationId],
    references: [aiAutomations.id],
  }),
}));

// AI Anomalies Relations
export const aiAnomaliesRelations = relations(aiAnomalies, ({ one }) => ({
  resolver: one(users, {
    fields: [aiAnomalies.resolvedBy],
    references: [users.id],
  }),
}));

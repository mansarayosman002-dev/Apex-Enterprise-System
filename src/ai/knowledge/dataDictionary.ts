/**
 * Apex Enterprise HRMS - Database Data Dictionary
 * Comprehensive schema definition, primary/foreign keys, CHECK constraints, and relationships.
 */

export interface TableColumn {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: string;
  description: string;
}

export interface TableDefinition {
  name: string;
  description: string;
  primaryKey: string;
  columns: TableColumn[];
  indexes: string[];
  constraints: string[];
}

export const APEX_DATA_DICTIONARY: Record<string, TableDefinition> = {
  roles: {
    name: 'roles',
    description: 'System access roles defining role-based security boundaries (RBAC).',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'SERIAL', isNullable: false, isPrimaryKey: true, description: 'Surrogate integer key' },
      { name: 'role_name', type: 'TEXT', isNullable: false, description: 'Role name: Administrator, HR Officer, Payroll Officer, Employee, Management' },
      { name: 'description', type: 'TEXT', isNullable: true, description: 'Human-readable description of responsibilities' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, description: 'Record creation timestamp' },
    ],
    indexes: ['roles_role_name_unique'],
    constraints: ['UNIQUE(role_name)'],
  },

  users: {
    name: 'users',
    description: 'Authentication user accounts with bcrypt-hashed credentials.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'SERIAL', isNullable: false, isPrimaryKey: true, description: 'Surrogate integer key' },
      { name: 'username', type: 'TEXT', isNullable: false, description: 'Unique login handle (e.g. admin, osman.mansaray)' },
      { name: 'password_hash', type: 'TEXT', isNullable: false, description: 'bcrypt password hash with 10 salt rounds' },
      { name: 'role_id', type: 'INTEGER', isNullable: false, isForeignKey: true, references: 'roles.id', description: 'Foreign key to assigned security role' },
      { name: 'employee_id', type: 'INTEGER', isNullable: true, isForeignKey: true, references: 'employees.id', description: 'Optional link to physical employee record' },
      { name: 'is_active', type: 'BOOLEAN', isNullable: false, description: 'Account status flag (true = active)' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, description: 'Creation timestamp' },
    ],
    indexes: ['idx_users_username', 'idx_users_role_id', 'idx_users_employee_id'],
    constraints: ['UNIQUE(username)', 'CHECK(LENGTH(username) >= 3)'],
  },

  departments: {
    name: 'departments',
    description: 'Organizational operational divisions and cost centers.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'SERIAL', isNullable: false, isPrimaryKey: true, description: 'Surrogate integer key' },
      { name: 'department_name', type: 'TEXT', isNullable: false, description: 'Department title (e.g. Engineering, HR, Finance)' },
      { name: 'department_code', type: 'TEXT', isNullable: false, description: 'Short unique identifier (e.g. ENG, HR, FIN)' },
      { name: 'description', type: 'TEXT', isNullable: true, description: 'Division function summary' },
      { name: 'manager_id', type: 'INTEGER', isNullable: true, isForeignKey: true, references: 'employees.id', description: 'Department head employee ID' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, description: 'Creation timestamp' },
    ],
    indexes: ['idx_departments_name', 'idx_departments_code'],
    constraints: ['UNIQUE(department_code)', 'CHECK(LENGTH(TRIM(department_name)) > 0)'],
  },

  employees: {
    name: 'employees',
    description: 'Master workforce identity records with salary structure and biometric photo references.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'SERIAL', isNullable: false, isPrimaryKey: true, description: 'Surrogate integer key' },
      { name: 'employee_code', type: 'TEXT', isNullable: false, description: 'Human-readable unique identifier (e.g. EMP-001)' },
      { name: 'first_name', type: 'TEXT', isNullable: false, description: 'First given name' },
      { name: 'last_name', type: 'TEXT', isNullable: false, description: 'Last family name' },
      { name: 'email', type: 'TEXT', isNullable: false, description: 'Corporate email address' },
      { name: 'phone', type: 'TEXT', isNullable: true, description: 'Direct contact phone number' },
      { name: 'department_id', type: 'INTEGER', isNullable: false, isForeignKey: true, references: 'departments.id', description: 'Assigned department' },
      { name: 'position', type: 'TEXT', isNullable: false, description: 'Official employment job title' },
      { name: 'hire_date', type: 'TEXT', isNullable: false, description: 'Date joined in YYYY-MM-DD format' },
      { name: 'basic_salary', type: 'DECIMAL(12,2)', isNullable: false, description: 'Monthly base salary in Sierra Leone Leone (SLE)' },
      { name: 'status', type: 'TEXT', isNullable: false, description: 'Employment status: Active, Inactive, Terminated' },
      { name: 'photo_url', type: 'TEXT', isNullable: true, description: 'Employee passport photo image path or URL' },
    ],
    indexes: ['idx_employees_code', 'idx_employees_email', 'idx_employees_dept', 'idx_employees_status'],
    constraints: ['UNIQUE(employee_code)', 'UNIQUE(email)', 'CHECK(basic_salary >= 0)'],
  },

  attendance: {
    name: 'attendance',
    description: 'Biometric QR clock records with working hours and automatic tardiness calculations.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'SERIAL', isNullable: false, isPrimaryKey: true, description: 'Surrogate integer key' },
      { name: 'employee_id', type: 'INTEGER', isNullable: false, isForeignKey: true, references: 'employees.id', description: 'Foreign key to employee' },
      { name: 'date', type: 'TEXT', isNullable: false, description: 'Attendance date in YYYY-MM-DD format' },
      { name: 'check_in_time', type: 'TEXT', isNullable: true, description: 'Check-in punch time in HH:MM:SS format' },
      { name: 'check_out_time', type: 'TEXT', isNullable: true, description: 'Check-out punch time in HH:MM:SS format' },
      { name: 'status', type: 'TEXT', isNullable: false, description: 'Attendance classification: Present, Late, Absent, Half Day' },
      { name: 'working_hours', type: 'DECIMAL(5,2)', isNullable: true, description: 'Calculated hours on duty' },
      { name: 'overtime_hours', type: 'DECIMAL(5,2)', isNullable: true, description: 'Completed overtime hours beyond 8h' },
      { name: 'verification_method', type: 'TEXT', isNullable: false, description: 'Verification mode: QR Code, Manual, System' },
    ],
    indexes: ['idx_attendance_emp_id', 'idx_attendance_date', 'idx_attendance_status', 'idx_attendance_emp_date'],
    constraints: ['CHECK(working_hours <= 24)', 'CHECK(status IN (\'Present\', \'Late\', \'Absent\', \'Half Day\'))'],
  },

  payroll: {
    name: 'payroll',
    description: 'Monthly statutory payroll computations, deductions, tax withholding, and net pay disbursements.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'SERIAL', isNullable: false, isPrimaryKey: true, description: 'Surrogate integer key' },
      { name: 'employee_id', type: 'INTEGER', isNullable: false, isForeignKey: true, references: 'employees.id', description: 'Foreign key to employee' },
      { name: 'payroll_period', type: 'TEXT', isNullable: false, description: 'Billing cycle in YYYY-MM format (e.g. 2026-09)' },
      { name: 'basic_salary', type: 'DECIMAL(12,2)', isNullable: false, description: 'Monthly base remuneration in SLE' },
      { name: 'overtime_amount', type: 'DECIMAL(12,2)', isNullable: false, description: 'Calculated overtime earnings' },
      { name: 'allowances', type: 'DECIMAL(12,2)', isNullable: false, description: 'Transportation, meal, or duty allowances' },
      { name: 'deductions', type: 'DECIMAL(12,2)', isNullable: false, description: 'NASSIT (5%) + statutory deductions' },
      { name: 'tax_amount', type: 'DECIMAL(12,2)', isNullable: false, description: 'PAYE progressive income tax' },
      { name: 'net_salary', type: 'DECIMAL(12,2)', isNullable: false, description: 'Final net payable amount in SLE' },
      { name: 'payment_status', type: 'TEXT', isNullable: false, description: 'Payment status: Pending, Approved, Paid' },
      { name: 'payment_date', type: 'TEXT', isNullable: true, description: 'Disbursement date' },
    ],
    indexes: ['idx_payroll_emp_id', 'idx_payroll_period', 'idx_payroll_status', 'idx_payroll_emp_period'],
    constraints: ['CHECK(deductions >= 0)', 'CHECK(tax_amount >= 0)'],
  },

  overtime_requests: {
    name: 'overtime_requests',
    description: 'Overtime claims submitted by staff requiring multi-tier approval.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'SERIAL', isNullable: false, isPrimaryKey: true, description: 'Surrogate integer key' },
      { name: 'employee_id', type: 'INTEGER', isNullable: false, isForeignKey: true, references: 'employees.id', description: 'Requesting employee' },
      { name: 'date', type: 'TEXT', isNullable: false, description: 'Overtime date in YYYY-MM-DD format' },
      { name: 'hours', type: 'DECIMAL(4,2)', isNullable: false, description: 'Claimed hours' },
      { name: 'reason', type: 'TEXT', isNullable: false, description: 'Business justification' },
      { name: 'status', type: 'TEXT', isNullable: false, description: 'Claim status: Pending, Approved, Rejected' },
      { name: 'approved_by', type: 'INTEGER', isNullable: true, isForeignKey: true, references: 'users.id', description: 'Reviewing user ID' },
    ],
    indexes: ['idx_overtime_emp_id', 'idx_overtime_status'],
    constraints: ['CHECK(hours > 0)'],
  },

  qr_codes: {
    name: 'qr_codes',
    description: 'Cryptographic badge tokens with HMAC-SHA256 signatures.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'SERIAL', isNullable: false, isPrimaryKey: true, description: 'Surrogate integer key' },
      { name: 'employee_id', type: 'INTEGER', isNullable: false, isForeignKey: true, references: 'employees.id', description: 'Associated employee' },
      { name: 'qr_data', type: 'TEXT', isNullable: false, description: 'HMAC-SHA256 encrypted token payload' },
      { name: 'is_active', type: 'BOOLEAN', isNullable: false, description: 'Token revocation state' },
      { name: 'generated_at', type: 'TIMESTAMP', isNullable: false, description: 'Generation timestamp' },
    ],
    indexes: ['idx_qr_employee_id'],
    constraints: ['UNIQUE(employee_id)'],
  },
};

export const DATA_DICTIONARY = {
  databaseVersion: 'PostgreSQL 18 Enterprise',
  tables: Object.values(APEX_DATA_DICTIONARY).map(t => ({
    tableName: t.name,
    description: t.description,
    primaryKey: t.primaryKey,
    columns: t.columns,
    indexes: t.indexes,
    constraints: t.constraints,
  })),
};

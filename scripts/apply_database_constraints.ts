import { pool } from '../src/db/index.ts';

interface ConstraintDef {
  table: string;
  name: string;
  expression: string;
}

export const DATABASE_CONSTRAINTS: ConstraintDef[] = [
  // 1. employees table
  {
    table: 'employees',
    name: 'chk_employees_code_non_empty',
    expression: 'length(trim(employee_code)) > 0',
  },
  {
    table: 'employees',
    name: 'chk_employees_first_name_non_empty',
    expression: 'length(trim(first_name)) > 0',
  },
  {
    table: 'employees',
    name: 'chk_employees_last_name_non_empty',
    expression: 'length(trim(last_name)) > 0',
  },
  {
    table: 'employees',
    name: 'chk_employees_email_format',
    expression: "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
  },
  {
    table: 'employees',
    name: 'chk_employees_phone_format',
    expression: "phone ~ '^[0-9+\\-\\s()]{6,25}$'",
  },
  {
    table: 'employees',
    name: 'chk_employees_position_non_empty',
    expression: 'length(trim(position)) > 0',
  },
  {
    table: 'employees',
    name: 'chk_employees_salary_non_negative',
    expression: 'basic_salary >= 0',
  },
  {
    table: 'employees',
    name: 'chk_employees_status_valid',
    expression: "status IN ('active', 'inactive')",
  },

  // 2. departments table
  {
    table: 'departments',
    name: 'chk_departments_name_non_empty',
    expression: 'length(trim(department_name)) > 0',
  },

  // 3. roles table
  {
    table: 'roles',
    name: 'chk_roles_name_non_empty',
    expression: 'length(trim(role_name)) > 0',
  },

  // 4. users table
  {
    table: 'users',
    name: 'chk_users_username_min_length',
    expression: 'length(trim(username)) >= 3',
  },
  {
    table: 'users',
    name: 'chk_users_password_hash_non_empty',
    expression: 'length(trim(password_hash)) > 0',
  },
  {
    table: 'users',
    name: 'chk_users_status_valid',
    expression: "status IN ('active', 'inactive')",
  },

  // 5. attendance table
  {
    table: 'attendance',
    name: 'chk_attendance_date_format',
    expression: "attendance_date ~ '^\\d{4}-\\d{2}-\\d{2}$'",
  },
  {
    table: 'attendance',
    name: 'chk_attendance_check_in_format',
    expression: "check_in ~ '^\\d{2}:\\d{2}(:\\d{2})?$'",
  },
  {
    table: 'attendance',
    name: 'chk_attendance_check_out_format',
    expression: "check_out IS NULL OR check_out ~ '^\\d{2}:\\d{2}(:\\d{2})?$'",
  },
  {
    table: 'attendance',
    name: 'chk_attendance_working_hours_range',
    expression: 'working_hours >= 0 AND working_hours <= 24',
  },
  {
    table: 'attendance',
    name: 'chk_attendance_overtime_hours_range',
    expression: 'overtime_hours >= 0 AND overtime_hours <= 24',
  },
  {
    table: 'attendance',
    name: 'chk_attendance_status_valid',
    expression: "status IN ('Present', 'Late', 'Early Departure', 'Overtime', 'Absent', 'Half Day', 'On Leave')",
  },

  // 6. overtime table
  {
    table: 'overtime',
    name: 'chk_overtime_date_format',
    expression: "overtime_date ~ '^\\d{4}-\\d{2}-\\d{2}$'",
  },
  {
    table: 'overtime',
    name: 'chk_overtime_hours_range',
    expression: 'hours > 0 AND hours <= 24',
  },
  {
    table: 'overtime',
    name: 'chk_overtime_multiplier_range',
    expression: 'rate_multiplier >= 1.0 AND rate_multiplier <= 5.0',
  },
  {
    table: 'overtime',
    name: 'chk_overtime_amount_non_negative',
    expression: 'amount >= 0',
  },
  {
    table: 'overtime',
    name: 'chk_overtime_status_valid',
    expression: "status IN ('Pending', 'Approved', 'Rejected')",
  },

  // 7. payroll table
  {
    table: 'payroll',
    name: 'chk_payroll_period_format',
    expression: "payroll_period ~ '^\\d{4}-\\d{2}$'",
  },
  {
    table: 'payroll',
    name: 'chk_payroll_basic_salary_non_negative',
    expression: 'basic_salary >= 0',
  },
  {
    table: 'payroll',
    name: 'chk_payroll_overtime_amount_non_negative',
    expression: 'overtime_amount >= 0',
  },
  {
    table: 'payroll',
    name: 'chk_payroll_allowances_non_negative',
    expression: 'allowances >= 0',
  },
  {
    table: 'payroll',
    name: 'chk_payroll_deductions_non_negative',
    expression: 'deductions >= 0',
  },
  {
    table: 'payroll',
    name: 'chk_payroll_gross_salary_non_negative',
    expression: 'gross_salary >= 0',
  },
  {
    table: 'payroll',
    name: 'chk_payroll_net_salary_non_negative',
    expression: 'net_salary >= 0',
  },
  {
    table: 'payroll',
    name: 'chk_payroll_status_valid',
    expression: "status IN ('Draft', 'Pending', 'Processed', 'Approved', 'Paid')",
  },

  // 8. qr_codes table
  {
    table: 'qr_codes',
    name: 'chk_qr_codes_value_non_empty',
    expression: 'length(trim(qr_value)) > 0',
  },
  {
    table: 'qr_codes',
    name: 'chk_qr_codes_status_valid',
    expression: "status IN ('active', 'revoked', 'expired')",
  },

  // 9. notifications table
  {
    table: 'notifications',
    name: 'chk_notifications_title_non_empty',
    expression: 'length(trim(title)) > 0',
  },
  {
    table: 'notifications',
    name: 'chk_notifications_priority_valid',
    expression: "priority IN ('low', 'normal', 'medium', 'high', 'urgent')",
  },

  // 10. system_settings table
  {
    table: 'system_settings',
    name: 'chk_system_settings_key_non_empty',
    expression: 'length(trim(setting_key)) > 0',
  },
  {
    table: 'system_settings',
    name: 'chk_system_settings_value_non_empty',
    expression: 'length(trim(setting_value)) > 0',
  },
];

export async function applyDatabaseConstraints() {
  console.log('=== Applying Database Table Field Validation Constraints ===');
  let appliedCount = 0;
  let alreadyExistingCount = 0;

  for (const c of DATABASE_CONSTRAINTS) {
    try {
      // Check if constraint already exists
      const checkRes = await pool.query(
        `SELECT 1 FROM pg_constraint WHERE conname = $1;`,
        [c.name]
      );

      if (checkRes.rows.length > 0) {
        alreadyExistingCount++;
        continue;
      }

      // Add constraint
      const sql = `ALTER TABLE ${c.table} ADD CONSTRAINT ${c.name} CHECK (${c.expression});`;
      await pool.query(sql);
      appliedCount++;
      console.log(`✓ Added CHECK constraint [${c.name}] on table [${c.table}]`);
    } catch (err: any) {
      console.error(`✗ Error adding constraint ${c.name} on ${c.table}:`, err.message);
      throw err;
    }
  }

  console.log(`\nMigration completed: ${appliedCount} constraints added, ${alreadyExistingCount} already present.`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('apply_database_constraints.ts')) {
  applyDatabaseConstraints()
    .then(async () => {
      console.log('Database integrity verification complete.');
      await pool.end();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('Migration failed:', e);
      await pool.end();
      process.exit(1);
    });
}

import bcrypt from 'bcryptjs';
import { db, pool } from '../db/index.ts';
import {
  roles,
  departments,
  employees,
  qrCodes,
  users,
  attendance,
  overtime,
  payroll,
  systemSettings,
  auditLogs,
} from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';

const INITIAL_SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    role_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    department_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_code TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    position TEXT NOT NULL,
    basic_salary NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS qr_codes (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    qr_value TEXT NOT NULL UNIQUE,
    generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    firebase_uid TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date TEXT NOT NULL,
    check_in TEXT NOT NULL,
    check_out TEXT,
    working_hours NUMERIC(6, 2) DEFAULT '0.00' NOT NULL,
    overtime_hours NUMERIC(6, 2) DEFAULT '0.00' NOT NULL,
    status TEXT DEFAULT 'Present' NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS overtime (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    overtime_date TEXT NOT NULL,
    hours NUMERIC(6, 2) DEFAULT '0.00' NOT NULL,
    rate_multiplier NUMERIC(4, 2) DEFAULT '1.50' NOT NULL,
    amount NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Pending' NOT NULL,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payroll_period TEXT NOT NULL,
    basic_salary NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
    overtime_amount NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
    allowances NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
    deductions NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
    gross_salary NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
    net_salary NUMERIC(12, 2) DEFAULT '0.00' NOT NULL,
    status TEXT DEFAULT 'Pending' NOT NULL,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );
`;

export async function runDatabaseSeed(force = false) {
  try {
    // Ensure all database tables exist before querying or seeding
    await pool.query(INITIAL_SCHEMA_DDL);

    // Check if roles already exist
    const existingRoles = await db.select().from(roles);
    if (existingRoles.length > 0 && !force) {
      console.log('Database already initialized. Seed skipped.');
      return;
    }

    if (force) {
      console.log('Force re-seed requested. Cleaning existing records...');
      await db.delete(payroll);
      await db.delete(overtime);
      await db.delete(attendance);
      await db.delete(auditLogs);
      await db.delete(qrCodes);
      await db.delete(users);
      await db.delete(employees);
      await db.delete(departments);
      await db.delete(systemSettings);
      await db.delete(roles);
    }

    console.log('Starting full database seed...');

    // 1. Roles
    const rolesData = [
      { roleName: 'Administrator', description: 'Full administrative access across all modules, settings, and users' },
      { roleName: 'HR Officer', description: 'Human Resources management, employees, departments, and attendance monitoring' },
      { roleName: 'Payroll Officer', description: 'Payroll processing, salary computation, allowances, and compensation reports' },
      { roleName: 'Employee', description: 'Individual employee view for personal QR code, attendance logs, and payslips' },
      { roleName: 'Management', description: 'Executive view for attendance summaries, payroll metrics, and strategic reports' },
    ];

    for (const r of rolesData) {
      await db.insert(roles).values(r).onConflictDoNothing();
    }

    const insertedRoles = await db.select().from(roles);
    const roleMap = new Map(insertedRoles.map((r) => [r.roleName, r.id]));

    // 2. System Settings
    const defaultSettings = [
      { settingKey: 'standard_check_in', settingValue: '08:00:00', description: 'Standard expected daily check-in time' },
      { settingKey: 'standard_check_out', settingValue: '17:00:00', description: 'Standard expected daily check-out time' },
      { settingKey: 'standard_working_hours', settingValue: '8.0', description: 'Standard working hours per day' },
      { settingKey: 'late_grace_minutes', settingValue: '15', description: 'Grace period in minutes before marked Late' },
      { settingKey: 'unpaid_break_hours', settingValue: '1.0', description: 'Deducted daily unpaid break time in hours' },
      { settingKey: 'overtime_rate_multiplier', settingValue: '1.5', description: 'Overtime hourly rate multiplier relative to standard wage' },
      { settingKey: 'currency_symbol', settingValue: 'NLe', description: 'Currency symbol used in payroll reports (New Leone)' },
      { settingKey: 'company_name', settingValue: 'Apex Enterprise Solutions (SL) Ltd.', description: 'Company / Organization Name' },
      { settingKey: 'company_address', settingValue: '15 Siaka Stevens Street, Freetown, Sierra Leone', description: 'Headquarters Physical Address' },
      { settingKey: 'company_phone', settingValue: '+232 76 892 411', description: 'Official Corporate Contact Line' },
      { settingKey: 'company_email', settingValue: 'info@apexenterprise.sl', description: 'Official Corporate Email' },
    ];

    for (const s of defaultSettings) {
      await db.insert(systemSettings).values(s).onConflictDoNothing();
    }

    // 3. Departments
    const departmentsData = [
      { departmentName: 'Information Technology & Systems', description: 'Software engineering, cybersecurity, cloud architecture, and ICT infrastructure' },
      { departmentName: 'Human Resources & Talent Management', description: 'Talent recruitment, employee relations, and compliance under Sierra Leone Labour Laws' },
      { departmentName: 'Finance & Payroll Operations', description: 'Financial accounting, payroll computation, NASSIT & PAYE statutory reporting, and auditing' },
      { departmentName: 'Operations & Logistics', description: 'Fleet coordination, supply chain, facilities management, Freetown and regional dispatch' },
      { departmentName: 'Commercial, Sales & Marketing', description: 'Corporate partnerships, client acquisition, brand communications, and business growth' },
    ];

    for (const d of departmentsData) {
      await db.insert(departments).values(d).onConflictDoNothing();
    }

    const insertedDepts = await db.select().from(departments);
    const deptMap = new Map(insertedDepts.map((d) => [d.departmentName, d.id]));

    // 4. Employees (Sierra Leone Personnel)
    const employeesData = [
      {
        employeeCode: 'EMP-1001',
        firstName: 'Osman',
        lastName: 'Mansaray',
        email: 'osman.mansaray@apexenterprise.sl',
        phone: '+232 76 892 411',
        departmentId: deptMap.get('Information Technology & Systems') || 1,
        position: 'Lead Systems Architect & CTO',
        basicSalary: '8500.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1002',
        firstName: 'Fatmata',
        lastName: 'Sesay',
        email: 'fatmata.sesay@apexenterprise.sl',
        phone: '+232 78 345 678',
        departmentId: deptMap.get('Human Resources & Talent Management') || 2,
        position: 'Head of Human Resources & Personnel',
        basicSalary: '6500.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1003',
        firstName: 'Mohamed',
        lastName: 'Kamara',
        email: 'mohamed.kamara@apexenterprise.sl',
        phone: '+232 77 456 789',
        departmentId: deptMap.get('Finance & Payroll Operations') || 3,
        position: 'Senior Payroll & Accounts Director',
        basicSalary: '6800.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1004',
        firstName: 'Aminata',
        lastName: 'Turay',
        email: 'aminata.turay@apexenterprise.sl',
        phone: '+232 79 567 890',
        departmentId: deptMap.get('Information Technology & Systems') || 1,
        position: 'Full Stack Software Engineer',
        basicSalary: '5800.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1005',
        firstName: 'Alie',
        lastName: 'Koroma',
        email: 'alie.koroma@apexenterprise.sl',
        phone: '+232 30 678 901',
        departmentId: deptMap.get('Operations & Logistics') || 4,
        position: 'General Operations & Logistics Manager',
        basicSalary: '6200.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1006',
        firstName: 'Mariama',
        lastName: 'Jalloh',
        email: 'mariama.jalloh@apexenterprise.sl',
        phone: '+232 88 789 012',
        departmentId: deptMap.get('Commercial, Sales & Marketing') || 5,
        position: 'Director of Marketing & Communications',
        basicSalary: '7200.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1007',
        firstName: 'Ibrahim',
        lastName: 'Bangura',
        email: 'ibrahim.bangura@apexenterprise.sl',
        phone: '+232 33 890 123',
        departmentId: deptMap.get('Operations & Logistics') || 4,
        position: 'Fleet & Logistics Dispatch Coordinator',
        basicSalary: '4800.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1008',
        firstName: 'Samuel',
        lastName: 'Conteh',
        email: 'samuel.conteh@apexenterprise.sl',
        phone: '+232 76 234 567',
        departmentId: deptMap.get('Information Technology & Systems') || 1,
        position: 'Senior Network & Security Engineer',
        basicSalary: '5400.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1009',
        firstName: 'Isatu',
        lastName: 'Bah',
        email: 'isatu.bah@apexenterprise.sl',
        phone: '+232 78 765 432',
        departmentId: deptMap.get('Finance & Payroll Operations') || 3,
        position: 'Senior Financial Analyst & Compliance Auditor',
        basicSalary: '5200.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1010',
        firstName: 'Augustine',
        lastName: 'Kallon',
        email: 'augustine.kallon@apexenterprise.sl',
        phone: '+232 79 987 654',
        departmentId: deptMap.get('Commercial, Sales & Marketing') || 5,
        position: 'Corporate Client Relations Specialist',
        basicSalary: '4600.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1011',
        firstName: 'Zainab',
        lastName: 'Cole',
        email: 'zainab.cole@apexenterprise.sl',
        phone: '+232 74 112 233',
        departmentId: deptMap.get('Information Technology & Systems') || 1,
        position: 'Software QA & Systems Analyst',
        basicSalary: '5100.00',
        status: 'active',
      },
      {
        employeeCode: 'EMP-1012',
        firstName: 'Hassan',
        lastName: 'Fofanah',
        email: 'hassan.fofanah@apexenterprise.sl',
        phone: '+232 31 445 566',
        departmentId: deptMap.get('Operations & Logistics') || 4,
        position: 'Regional Dispatch & Warehouse Supervisor',
        basicSalary: '4500.00',
        status: 'active',
      },
    ];

    for (const emp of employeesData) {
      await db.insert(employees).values(emp).onConflictDoNothing();
    }

    const insertedEmployees = await db.select().from(employees);

    // 5. QR Codes for each employee
    for (const emp of insertedEmployees) {
      const qrValue = `APEX-QR-${emp.employeeCode}-${Buffer.from(emp.email).toString('base64').substring(0, 10)}`;
      await db.insert(qrCodes).values({
        employeeId: emp.id,
        qrValue,
        status: 'active',
      }).onConflictDoNothing();
    }

    // 6. Users (System accounts)
    const saltRounds = 10;
    const defaultPassword = 'password123';
    const hashedPassword = bcrypt.hashSync(defaultPassword, saltRounds);

    const usersData = [
      {
        username: 'admin',
        passwordHash: hashedPassword,
        roleId: roleMap.get('Administrator') || 1,
        employeeId: insertedEmployees.find((e) => e.employeeCode === 'EMP-1001')?.id,
        status: 'active',
      },
      {
        username: 'hr.officer',
        passwordHash: hashedPassword,
        roleId: roleMap.get('HR Officer') || 2,
        employeeId: insertedEmployees.find((e) => e.employeeCode === 'EMP-1002')?.id,
        status: 'active',
      },
      {
        username: 'payroll.officer',
        passwordHash: hashedPassword,
        roleId: roleMap.get('Payroll Officer') || 3,
        employeeId: insertedEmployees.find((e) => e.employeeCode === 'EMP-1003')?.id,
        status: 'active',
      },
      {
        username: 'aminata.turay',
        passwordHash: hashedPassword,
        roleId: roleMap.get('Employee') || 4,
        employeeId: insertedEmployees.find((e) => e.employeeCode === 'EMP-1004')?.id,
        status: 'active',
      },
      {
        username: 'management',
        passwordHash: hashedPassword,
        roleId: roleMap.get('Management') || 5,
        employeeId: insertedEmployees.find((e) => e.employeeCode === 'EMP-1005')?.id,
        status: 'active',
      },
    ];

    for (const u of usersData) {
      await db.insert(users).values(u).onConflictDoNothing();
    }

    const insertedUsers = await db.select().from(users);
    const adminUser = insertedUsers.find((u) => u.username === 'admin');

    // 7. Seed Sample Attendance records for the past 14 days and today
    const now = new Date();
    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
      const d = new Date(now);
      d.setDate(d.getDate() - dayOffset);
      
      // Skip weekends
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = d.toISOString().split('T')[0];

      for (let i = 0; i < insertedEmployees.length; i++) {
        const emp = insertedEmployees[i];
        
        // Vary statuses: on offset 0 (today), check some in, some not yet checked out
        if (dayOffset === 0) {
          // Today's logs
          if (i === 0) {
            // EMP-1001: Present early
            await db.insert(attendance).values({
              employeeId: emp.id,
              attendanceDate: dateStr,
              checkIn: '07:55:12',
              checkOut: null,
              workingHours: '0.00',
              overtimeHours: '0.00',
              status: 'Present',
            });
          } else if (i === 1) {
            // EMP-1002: Late
            await db.insert(attendance).values({
              employeeId: emp.id,
              attendanceDate: dateStr,
              checkIn: '08:35:40',
              checkOut: null,
              workingHours: '0.00',
              overtimeHours: '0.00',
              status: 'Late',
            });
          } else if (i === 2) {
            // EMP-1003: Present & Completed check-out
            await db.insert(attendance).values({
              employeeId: emp.id,
              attendanceDate: dateStr,
              checkIn: '07:50:00',
              checkOut: '17:05:00',
              workingHours: '8.25',
              overtimeHours: '0.25',
              status: 'Present',
            });
          } else if (i === 3) {
            // EMP-1004: Present
            await db.insert(attendance).values({
              employeeId: emp.id,
              attendanceDate: dateStr,
              checkIn: '08:04:18',
              checkOut: null,
              workingHours: '0.00',
              overtimeHours: '0.00',
              status: 'Present',
            });
          }
          // EMP-1005, 1006, 1007: Not yet checked in today (Absent / Pending)
        } else {
          // Historical days
          let checkIn = '07:55:00';
          let checkOut = '17:05:00';
          let workingHours = '8.16';
          let overtimeHours = '0.16';
          let status = 'Present';

          if ((i + dayOffset) % 5 === 0) {
            // Late scenario
            checkIn = '08:42:15';
            checkOut = '17:15:00';
            workingHours = '7.55';
            overtimeHours = '0.00';
            status = 'Late';
          } else if ((i + dayOffset) % 4 === 0) {
            // Overtime scenario
            checkIn = '07:45:00';
            checkOut = '19:15:00';
            workingHours = '10.50';
            overtimeHours = '2.50';
            status = 'Overtime';
          } else if ((i + dayOffset) % 7 === 0) {
            // Early departure scenario
            checkIn = '07:58:00';
            checkOut = '15:30:00';
            workingHours = '6.53';
            overtimeHours = '0.00';
            status = 'Early Departure';
          }

          await db.insert(attendance).values({
            employeeId: emp.id,
            attendanceDate: dateStr,
            checkIn,
            checkOut,
            workingHours,
            overtimeHours,
            status,
          });
        }
      }
    }

    // 8. Seed Sample Overtime Requests & Records
    for (let i = 0; i < insertedEmployees.length; i++) {
      const emp = insertedEmployees[i];
      const basic = parseFloat(emp.basicSalary.toString());
      const hourly = basic / (22 * 8);

      if (i % 2 === 0) {
        const otHours = 3.5;
        const amount = Math.round(otHours * hourly * 1.5 * 100) / 100;
        const d = new Date(now);
        d.setDate(d.getDate() - 2);

        await db.insert(overtime).values({
          employeeId: emp.id,
          overtimeDate: d.toISOString().split('T')[0],
          hours: otHours.toFixed(2),
          rateMultiplier: '1.50',
          amount: amount.toFixed(2),
          reason: 'Critical project release and deployment support',
          status: 'Approved',
          approvedBy: adminUser?.id || null,
          approvedAt: new Date(),
        });
      } else if (i % 3 === 0) {
        const otHours = 2.0;
        const amount = Math.round(otHours * hourly * 1.5 * 100) / 100;
        const d = new Date(now);
        d.setDate(d.getDate() - 1);

        await db.insert(overtime).values({
          employeeId: emp.id,
          overtimeDate: d.toISOString().split('T')[0],
          hours: otHours.toFixed(2),
          rateMultiplier: '1.50',
          amount: amount.toFixed(2),
          reason: 'Month-end reconciliation and client onboarding tasks',
          status: 'Pending',
          approvedBy: null,
          approvedAt: null,
        });
      }
    }

    // 9. Seed Sample Payroll for current and previous month
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevPeriod = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    for (const emp of insertedEmployees) {
      const basic = parseFloat(emp.basicSalary.toString());
      const hourly = basic / (22 * 8);

      // Previous period (Processed/Paid)
      const prevOtHours = (emp.id % 3) * 4.5 + 2;
      const prevOtAmount = Math.round(prevOtHours * hourly * 1.5 * 100) / 100;
      const prevAllowances = emp.id % 2 === 0 ? 250.0 : 150.0;
      const prevDeductions = 85.0;
      const prevGross = Math.round((basic + prevOtAmount + prevAllowances) * 100) / 100;
      const prevNet = Math.round((prevGross - prevDeductions) * 100) / 100;

      await db.insert(payroll).values({
        employeeId: emp.id,
        payrollPeriod: prevPeriod,
        basicSalary: basic.toFixed(2),
        overtimeAmount: prevOtAmount.toFixed(2),
        allowances: prevAllowances.toFixed(2),
        deductions: prevDeductions.toFixed(2),
        grossSalary: prevGross.toFixed(2),
        netSalary: prevNet.toFixed(2),
        status: 'Paid',
        processedAt: new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0),
      }).onConflictDoNothing();

      // Current period (Pending)
      const curOtHours = (emp.id % 2) * 5.0 + 1.5;
      const curOtAmount = Math.round(curOtHours * hourly * 1.5 * 100) / 100;
      const curAllowances = 200.0;
      const curDeductions = 85.0;
      const curGross = Math.round((basic + curOtAmount + curAllowances) * 100) / 100;
      const curNet = Math.round((curGross - curDeductions) * 100) / 100;

      await db.insert(payroll).values({
        employeeId: emp.id,
        payrollPeriod: currentPeriod,
        basicSalary: basic.toFixed(2),
        overtimeAmount: curOtAmount.toFixed(2),
        allowances: curAllowances.toFixed(2),
        deductions: curDeductions.toFixed(2),
        grossSalary: curGross.toFixed(2),
        netSalary: curNet.toFixed(2),
        status: 'Pending',
        processedAt: null,
      }).onConflictDoNothing();
    }

    // 9. Initial Audit Log
    await db.insert(auditLogs).values({
      userId: adminUser?.id || null,
      username: 'admin',
      action: 'SYSTEM_INITIALIZATION',
      entity: 'system',
      details: 'Initial system bootstrap, default settings, roles, demo Sierra Leonean employees and QR codes populated.',
    });

    console.log('Database seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

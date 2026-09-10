/**
 * Data Validation and Database Constraint Test Suite
 * Tests that invalid data is strictly blocked both at the service validation layer
 * and at the PostgreSQL CHECK constraint layer across all tables.
 */

import { db, pool } from '../db/index.ts';
import {
  validateEmployeeInput,
  validateAttendanceInput,
  validateOvertimeInput,
  validatePayrollInput,
  validateDepartmentInput,
  validateUserInput,
} from '../server/validation.ts';
import {
  createEmployee,
  createManualAttendance,
  createOvertimeRecord,
  createDepartment,
} from '../server/dbServices.ts';

export async function runDataValidationTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- Running Data Validation & Database Constraint Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // =========================================================================
  // 1. Service-Level Validation Tests
  // =========================================================================
  console.log('\n  [Layer 1: Service Validation Tests]');

  // Test 1.1: Reject malformed email
  const empEmailVal = validateEmployeeInput({
    employeeCode: 'TEST-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'not-an-email',
    basicSalary: 5000,
  });
  assert(!empEmailVal.isValid && empEmailVal.errors.some(e => e.includes('invalid')), 'Employee validator rejects invalid email format');

  // Test 1.2: Reject negative salary
  const empSalaryVal = validateEmployeeInput({
    employeeCode: 'TEST-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'valid@apexenterprise.sl',
    basicSalary: -2500,
  });
  assert(!empSalaryVal.isValid && empSalaryVal.errors.some(e => e.includes('positive')), 'Employee validator rejects negative basic salary');

  // Test 1.3: Reject attendance working hours > 24
  const attHoursVal = validateAttendanceInput({
    employeeId: 1,
    attendanceDate: '2026-09-10',
    checkIn: '08:00:00',
    workingHours: 25.5,
  });
  assert(!attHoursVal.isValid && attHoursVal.errors.some(e => e.includes('24.00')), 'Attendance validator rejects working hours exceeding 24h');

  // Test 1.4: Reject attendance with invalid status
  const attStatusVal = validateAttendanceInput({
    employeeId: 1,
    attendanceDate: '2026-09-10',
    checkIn: '08:00:00',
    status: 'InvalidStatusXYZ',
  });
  assert(!attStatusVal.isValid && attStatusVal.errors.some(e => e.includes('Attendance status must be one of')), 'Attendance validator rejects unrecognized status');

  // Test 1.5: Reject overtime with hours <= 0
  const otHoursVal = validateOvertimeInput({
    employeeId: 1,
    overtimeDate: '2026-09-10',
    hours: -2,
  });
  assert(!otHoursVal.isValid && otHoursVal.errors.some(e => e.includes('greater than 0')), 'Overtime validator rejects non-positive hours');

  // Test 1.6: Reject overtime with invalid multiplier
  const otMultVal = validateOvertimeInput({
    employeeId: 1,
    overtimeDate: '2026-09-10',
    hours: 2,
    rateMultiplier: 0.5,
  });
  assert(!otMultVal.isValid && otMultVal.errors.some(e => e.includes('between 1.00 and 5.00')), 'Overtime validator rejects multiplier < 1.0');

  // Test 1.7: Reject payroll with negative deduction
  const payVal = validatePayrollInput({
    employeeId: 1,
    payrollPeriod: '2026-09',
    basicSalary: 5000,
    deductions: -500,
  });
  assert(!payVal.isValid && payVal.errors.some(e => e.includes('cannot be negative')), 'Payroll validator rejects negative deductions');

  // Test 1.8: Reject empty department name
  const deptVal = validateDepartmentInput({ departmentName: '   ' });
  assert(!deptVal.isValid && deptVal.errors.some(e => e.includes('cannot be empty')), 'Department validator rejects whitespace department name');

  // Test 1.9: Reject short username / password
  const userVal = validateUserInput({ username: 'ab', password: '123' });
  assert(!userVal.isValid && userVal.errors.length >= 2, 'User validator rejects username < 3 chars and password < 6 chars');

  // =========================================================================
  // 2. Database Constraint Enforcement (Direct PostgreSQL CHECK Constraints)
  // =========================================================================
  console.log('\n  [Layer 2: PostgreSQL CHECK Constraint Tests]');

  // Test 2.1: DB blocks negative employee salary
  let dbBlockedSalary = false;
  try {
    await pool.query(
      `INSERT INTO employees (employee_code, first_name, last_name, email, phone, department_id, position, basic_salary, status)
       VALUES ('TEST-NEG-1', 'Invalid', 'Salary', 'testneg1@apexenterprise.sl', '12345678', 1, 'Tester', -100.00, 'active')`
    );
  } catch (err: any) {
    if (err.message.includes('chk_employees_basic_salary_non_negative') || err.message.includes('check constraint')) {
      dbBlockedSalary = true;
    }
  }
  assert(dbBlockedSalary, 'PostgreSQL blocks INSERT with negative basic_salary via CHECK constraint');

  // Test 2.2: DB blocks invalid employee email format
  let dbBlockedEmail = false;
  try {
    await pool.query(
      `INSERT INTO employees (employee_code, first_name, last_name, email, phone, department_id, position, basic_salary, status)
       VALUES ('TEST-BAD-EMAIL', 'Invalid', 'Email', 'not-a-valid-email', '12345678', 1, 'Tester', 5000.00, 'active')`
    );
  } catch (err: any) {
    if (err.message.includes('chk_employees_email_format') || err.message.includes('check constraint')) {
      dbBlockedEmail = true;
    }
  }
  assert(dbBlockedEmail, 'PostgreSQL blocks INSERT with malformed email via CHECK constraint');

  // Test 2.3: DB blocks empty employee code
  let dbBlockedCode = false;
  try {
    await pool.query(
      `INSERT INTO employees (employee_code, first_name, last_name, email, phone, department_id, position, basic_salary, status)
       VALUES ('   ', 'Invalid', 'Code', 'emptycode@apexenterprise.sl', '12345678', 1, 'Tester', 5000.00, 'active')`
    );
  } catch (err: any) {
    if (err.message.includes('chk_employees_code_not_empty') || err.message.includes('check constraint')) {
      dbBlockedCode = true;
    }
  }
  assert(dbBlockedCode, 'PostgreSQL blocks INSERT with empty employee_code via CHECK constraint');

  // Test 2.4: DB blocks attendance working hours > 24
  let dbBlockedAttHours = false;
  try {
    await pool.query(
      `INSERT INTO attendance (employee_id, attendance_date, check_in, working_hours, status)
       VALUES (1, '2099-01-01', '08:00:00', 25.00, 'Present')`
    );
  } catch (err: any) {
    if (err.message.includes('chk_attendance_working_hours_range') || err.message.includes('check constraint')) {
      dbBlockedAttHours = true;
    }
  }
  assert(dbBlockedAttHours, 'PostgreSQL blocks INSERT with working_hours > 24 via CHECK constraint');

  // Test 2.5: DB blocks attendance invalid status
  let dbBlockedAttStatus = false;
  try {
    await pool.query(
      `INSERT INTO attendance (employee_id, attendance_date, check_in, working_hours, status)
       VALUES (1, '2099-01-02', '08:00:00', 8.00, 'HackerStatus')`
    );
  } catch (err: any) {
    if (err.message.includes('chk_attendance_status_valid') || err.message.includes('check constraint')) {
      dbBlockedAttStatus = true;
    }
  }
  assert(dbBlockedAttStatus, 'PostgreSQL blocks INSERT with invalid attendance status via CHECK constraint');

  // Test 2.6: DB blocks overtime with non-positive hours
  let dbBlockedOtHours = false;
  try {
    await pool.query(
      `INSERT INTO overtime (employee_id, overtime_date, hours, rate_multiplier, amount, status)
       VALUES (1, '2099-01-03', 0.00, 1.50, 0.00, 'Pending')`
    );
  } catch (err: any) {
    if (err.message.includes('chk_overtime_hours_positive') || err.message.includes('check constraint')) {
      dbBlockedOtHours = true;
    }
  }
  assert(dbBlockedOtHours, 'PostgreSQL blocks INSERT with 0 or negative overtime hours via CHECK constraint');

  // Test 2.7: DB blocks payroll with negative deductions
  let dbBlockedPayDeduction = false;
  try {
    await pool.query(
      `INSERT INTO payroll (employee_id, payroll_period, basic_salary, gross_salary, net_salary, deductions, status)
       VALUES (1, '2099-01', 5000.00, 5000.00, 5500.00, -500.00, 'Draft')`
    );
  } catch (err: any) {
    if (err.message.includes('chk_payroll_deductions_non_negative') || err.message.includes('check constraint')) {
      dbBlockedPayDeduction = true;
    }
  }
  assert(dbBlockedPayDeduction, 'PostgreSQL blocks INSERT with negative deductions via CHECK constraint');

  // Test 2.8: DB blocks empty department name
  let dbBlockedDeptName = false;
  try {
    await pool.query(
      `INSERT INTO departments (department_name) VALUES ('   ')`
    );
  } catch (err: any) {
    if (err.message.includes('chk_departments_name_not_empty') || err.message.includes('check constraint')) {
      dbBlockedDeptName = true;
    }
  }
  assert(dbBlockedDeptName, 'PostgreSQL blocks INSERT with empty department_name via CHECK constraint');

  return { passed, failed };
}

/**
 * Centralized Data Validation Engine
 * Enforces business rules and strict format requirements on user inputs
 * before database queries are dispatched.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const PHONE_REGEX = /^[0-9+\-\s()]{6,25}$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;
export const PERIOD_REGEX = /^\d{4}-\d{2}$/;

/**
 * Validates employee profile and onboarding payloads
 */
export function validateEmployeeInput(data: {
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  departmentId?: number | string;
  position?: string;
  basicSalary?: number | string;
  status?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (data.employeeCode !== undefined) {
    if (!data.employeeCode || typeof data.employeeCode !== 'string' || !data.employeeCode.trim()) {
      errors.push('Employee code cannot be empty.');
    }
  }

  if (data.firstName !== undefined) {
    if (!data.firstName || typeof data.firstName !== 'string' || !data.firstName.trim()) {
      errors.push('First name is required and cannot be blank.');
    }
  }

  if (data.lastName !== undefined) {
    if (!data.lastName || typeof data.lastName !== 'string' || !data.lastName.trim()) {
      errors.push('Last name is required and cannot be blank.');
    }
  }

  if (data.email !== undefined) {
    if (!data.email || typeof data.email !== 'string' || !EMAIL_REGEX.test(data.email.trim())) {
      errors.push(`Email address "${data.email || ''}" is invalid. Please provide a valid email (e.g. user@apexenterprise.sl).`);
    }
  }

  if (data.phone !== undefined) {
    if (!data.phone || typeof data.phone !== 'string' || !PHONE_REGEX.test(data.phone.trim())) {
      errors.push('Phone number must contain between 6 and 25 digits and valid symbols (+, -, ()).');
    }
  }

  if (data.departmentId !== undefined) {
    const deptId = Number(data.departmentId);
    if (isNaN(deptId) || deptId <= 0) {
      errors.push('Please select a valid department.');
    }
  }

  if (data.position !== undefined) {
    if (!data.position || typeof data.position !== 'string' || !data.position.trim()) {
      errors.push('Position/Job title cannot be empty.');
    }
  }

  if (data.basicSalary !== undefined) {
    const salary = parseFloat(String(data.basicSalary));
    if (isNaN(salary) || salary < 0) {
      errors.push('Basic salary must be a positive number or zero.');
    }
  }

  if (data.status !== undefined) {
    if (data.status !== 'active' && data.status !== 'inactive') {
      errors.push('Employee status must be either "active" or "inactive".');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates manual attendance and punch records
 */
export function validateAttendanceInput(data: {
  employeeId?: number | string;
  attendanceDate?: string;
  checkIn?: string;
  checkOut?: string | null;
  workingHours?: number | string;
  overtimeHours?: number | string;
  status?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (data.employeeId !== undefined) {
    const empId = Number(data.employeeId);
    if (isNaN(empId) || empId <= 0) {
      errors.push('A valid employee ID is required.');
    }
  }

  if (data.attendanceDate !== undefined) {
    if (!data.attendanceDate || !DATE_REGEX.test(data.attendanceDate)) {
      errors.push('Attendance date must be in YYYY-MM-DD format.');
    }
  }

  if (data.checkIn !== undefined) {
    if (!data.checkIn || !TIME_REGEX.test(data.checkIn)) {
      errors.push('Check-in time must be formatted as HH:MM or HH:MM:SS.');
    }
  }

  if (data.checkOut !== undefined && data.checkOut !== null && data.checkOut !== '') {
    if (!TIME_REGEX.test(data.checkOut)) {
      errors.push('Check-out time must be formatted as HH:MM or HH:MM:SS.');
    }
  }

  if (data.workingHours !== undefined) {
    const hours = parseFloat(String(data.workingHours));
    if (isNaN(hours) || hours < 0 || hours > 24) {
      errors.push('Working hours must be between 0.00 and 24.00 hours.');
    }
  }

  if (data.overtimeHours !== undefined) {
    const ot = parseFloat(String(data.overtimeHours));
    if (isNaN(ot) || ot < 0 || ot > 24) {
      errors.push('Overtime hours must be between 0.00 and 24.00 hours.');
    }
  }

  if (data.status !== undefined) {
    const validStatuses = ['Present', 'Late', 'Early Departure', 'Overtime', 'Absent', 'Half Day', 'On Leave'];
    if (!validStatuses.includes(data.status)) {
      errors.push(`Attendance status must be one of: ${validStatuses.join(', ')}.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates overtime claim payloads
 */
export function validateOvertimeInput(data: {
  employeeId?: number | string;
  overtimeDate?: string;
  hours?: number | string;
  rateMultiplier?: number | string;
  reason?: string;
  status?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (data.employeeId !== undefined) {
    const empId = Number(data.employeeId);
    if (isNaN(empId) || empId <= 0) {
      errors.push('A valid employee ID is required.');
    }
  }

  if (data.overtimeDate !== undefined) {
    if (!data.overtimeDate || !DATE_REGEX.test(data.overtimeDate)) {
      errors.push('Overtime date must be formatted as YYYY-MM-DD.');
    }
  }

  if (data.hours !== undefined) {
    const hrs = parseFloat(String(data.hours));
    if (isNaN(hrs) || hrs <= 0 || hrs > 24) {
      errors.push('Overtime hours must be greater than 0 and not exceed 24 hours per day.');
    }
  }

  if (data.rateMultiplier !== undefined) {
    const mult = parseFloat(String(data.rateMultiplier));
    if (isNaN(mult) || mult < 1.0 || mult > 5.0) {
      errors.push('Rate multiplier must be between 1.00 and 5.00.');
    }
  }

  if (data.status !== undefined) {
    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    if (!validStatuses.includes(data.status)) {
      errors.push(`Overtime status must be one of: ${validStatuses.join(', ')}.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates payroll record creation and adjustments
 */
export function validatePayrollInput(data: {
  employeeId?: number | string;
  payrollPeriod?: string;
  basicSalary?: number | string;
  overtimeAmount?: number | string;
  allowances?: number | string;
  deductions?: number | string;
  grossSalary?: number | string;
  netSalary?: number | string;
  status?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (data.employeeId !== undefined) {
    const empId = Number(data.employeeId);
    if (isNaN(empId) || empId <= 0) {
      errors.push('A valid employee ID is required.');
    }
  }

  if (data.payrollPeriod !== undefined) {
    if (!data.payrollPeriod || !PERIOD_REGEX.test(data.payrollPeriod)) {
      errors.push('Payroll period must be formatted as YYYY-MM (e.g. 2026-08).');
    }
  }

  const monetaryFields: Array<{ name: string; val?: number | string }> = [
    { name: 'Basic salary', val: data.basicSalary },
    { name: 'Overtime amount', val: data.overtimeAmount },
    { name: 'Allowances', val: data.allowances },
    { name: 'Deductions', val: data.deductions },
    { name: 'Gross salary', val: data.grossSalary },
    { name: 'Net salary', val: data.netSalary },
  ];

  for (const f of monetaryFields) {
    if (f.val !== undefined) {
      const num = parseFloat(String(f.val));
      if (isNaN(num) || num < 0) {
        errors.push(`${f.name} cannot be negative.`);
      }
    }
  }

  if (data.status !== undefined) {
    const validStatuses = ['Draft', 'Pending', 'Processed', 'Approved', 'Paid'];
    if (!validStatuses.includes(data.status)) {
      errors.push(`Payroll status must be one of: ${validStatuses.join(', ')}.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates department creation and modification
 */
export function validateDepartmentInput(data: { departmentName?: string; description?: string }): ValidationResult {
  const errors: string[] = [];
  if (data.departmentName !== undefined) {
    if (!data.departmentName || typeof data.departmentName !== 'string' || !data.departmentName.trim()) {
      errors.push('Department name cannot be empty or whitespace.');
    }
  }
  return { isValid: errors.length === 0, errors };
}

/**
 * Validates user account parameters
 */
export function validateUserInput(data: {
  username?: string;
  roleId?: number | string;
  status?: string;
  password?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (data.username !== undefined) {
    if (!data.username || typeof data.username !== 'string' || data.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long.');
    }
  }

  if (data.roleId !== undefined) {
    const rId = Number(data.roleId);
    if (isNaN(rId) || rId <= 0) {
      errors.push('Please assign a valid role ID.');
    }
  }

  if (data.status !== undefined) {
    if (data.status !== 'active' && data.status !== 'inactive') {
      errors.push('User status must be either "active" or "inactive".');
    }
  }

  if (data.password !== undefined) {
    if (!data.password || data.password.length < 6) {
      errors.push('Password must be at least 6 characters long.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

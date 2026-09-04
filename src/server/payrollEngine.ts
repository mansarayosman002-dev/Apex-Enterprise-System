export type PayrollStatus = 'Draft' | 'Processed' | 'Approved' | 'Pending' | 'Paid';

export interface EmployeePayrollInput {
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  departmentId?: number;
  departmentName?: string;
  position?: string;
  basicSalary: number | string;
  overtimeHours?: number | string;
  allowances?: number | string;
  deductions?: number | string;
  workingHours?: number | string;
}

export interface PayrollCalculationConfig {
  standardWorkingHours?: number; // default 8.0
  standardWorkingDaysPerMonth?: number; // default 22
  overtimeRateMultiplier?: number; // default 1.5
}

export interface PayrollCalculationItem {
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  departmentId?: number;
  departmentName?: string;
  position?: string;
  payrollPeriod?: string;
  basicSalary: number;
  workingHours: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimeAmount: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  status: PayrollStatus;
}

export interface BatchPayrollSummary {
  period: string;
  totalEmployees: number;
  totalBasicSalary: number;
  totalOvertimeHours: number;
  totalOvertimeAmount: number;
  totalAllowances: number;
  totalDeductions: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  items: PayrollCalculationItem[];
}

/**
 * Validate payroll period string (e.g. "2026-08" or "YYYY-MM")
 */
export function isValidPayrollPeriod(period: string): boolean {
  if (!period || typeof period !== 'string') return false;
  const match = period.trim().match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  return !!match;
}

/**
 * Round a number to 2 decimal places safely
 */
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate hourly rate based on basic salary, standard working hours and standard working days
 */
export function calculateHourlyRate(basicSalary: number, standardWorkingHours = 8.0, standardWorkingDays = 22): number {
  const totalStandardHours = standardWorkingDays * standardWorkingHours;
  if (totalStandardHours <= 0) return 0;
  return roundCurrency(basicSalary / totalStandardHours);
}

/**
 * Calculate overtime pay based on overtime hours, hourly rate, and multiplier
 */
export function calculateOvertimePay(overtimeHours: number, hourlyRate: number, multiplier = 1.5): number {
  if (overtimeHours <= 0 || hourlyRate <= 0) return 0;
  return roundCurrency(overtimeHours * hourlyRate * multiplier);
}

/**
 * Calculate gross salary = Basic + Overtime Amount + Allowances
 */
export function calculateGrossSalary(basicSalary: number, overtimeAmount: number, allowances: number): number {
  return roundCurrency(basicSalary + overtimeAmount + allowances);
}

/**
 * Calculate net salary = Gross Salary - Deductions
 */
export function calculateNetSalary(grossSalary: number, deductions: number): number {
  return roundCurrency(grossSalary - deductions);
}

/**
 * Calculate payroll item for a single employee
 *
 * Formulas:
 * Hourly Rate = Basic Salary / (Standard Working Days * Standard Working Hours)
 * Overtime Amount = Overtime Hours * Hourly Rate * Overtime Multiplier
 * Gross Salary = Basic Salary + Overtime Amount + Allowances
 * Net Salary = Gross Salary - Deductions
 */
export function calculateEmployeePayroll(
  input: EmployeePayrollInput,
  config: PayrollCalculationConfig = {},
  status: PayrollStatus = 'Draft',
  period?: string
): PayrollCalculationItem {
  const standardWorkingHours = config.standardWorkingHours !== undefined ? Number(config.standardWorkingHours) : 8.0;
  const standardWorkingDays = config.standardWorkingDaysPerMonth !== undefined ? Number(config.standardWorkingDaysPerMonth) : 22;
  const overtimeMultiplier = config.overtimeRateMultiplier !== undefined ? Number(config.overtimeRateMultiplier) : 1.5;

  // 1. Validate Basic Salary
  const rawBasic = input.basicSalary;
  const basic = typeof rawBasic === 'number' ? rawBasic : parseFloat(String(rawBasic));

  if (isNaN(basic) || basic <= 0) {
    throw new Error(`Invalid basic salary: ${rawBasic}. Basic salary must be a positive number greater than 0.`);
  }

  // 2. Validate & Parse Allowances
  const rawAllowances = input.allowances !== undefined && input.allowances !== '' ? input.allowances : 0;
  const allowances = typeof rawAllowances === 'number' ? rawAllowances : parseFloat(String(rawAllowances));
  if (isNaN(allowances) || allowances < 0) {
    throw new Error(`Invalid allowances value: ${rawAllowances}. Allowances cannot be negative or non-numeric.`);
  }

  // 3. Validate & Parse Deductions
  const rawDeductions = input.deductions !== undefined && input.deductions !== '' ? input.deductions : 0;
  const deductions = typeof rawDeductions === 'number' ? rawDeductions : parseFloat(String(rawDeductions));
  if (isNaN(deductions) || deductions < 0) {
    throw new Error(`Invalid deductions value: ${rawDeductions}. Deductions cannot be negative or non-numeric.`);
  }

  // 4. Validate & Parse Overtime Hours
  const rawOtHours = input.overtimeHours !== undefined && input.overtimeHours !== '' ? input.overtimeHours : 0;
  const overtimeHours = typeof rawOtHours === 'number' ? rawOtHours : parseFloat(String(rawOtHours));
  if (isNaN(overtimeHours) || overtimeHours < 0) {
    throw new Error(`Invalid overtime hours: ${rawOtHours}. Overtime hours cannot be negative or non-numeric.`);
  }

  // 5. Validate & Parse Working Hours
  const rawWorkHours = input.workingHours !== undefined && input.workingHours !== '' ? input.workingHours : 0;
  const workingHours = typeof rawWorkHours === 'number' ? rawWorkHours : parseFloat(String(rawWorkHours));

  // 6. Compute Hourly Rate
  const totalStandardHoursInMonth = standardWorkingDays * standardWorkingHours;
  const hourlyRate = totalStandardHoursInMonth > 0 ? basic / totalStandardHoursInMonth : 0;

  // 7. Compute Overtime Amount
  let overtimeAmount = 0;
  if (overtimeHours > 0) {
    overtimeAmount = roundCurrency(overtimeHours * hourlyRate * overtimeMultiplier);
  }

  // 8. Compute Gross Salary = Basic Salary + Overtime Amount + Allowances
  const grossSalary = roundCurrency(basic + overtimeAmount + allowances);

  // 9. Compute Net Salary = Gross Salary - Deductions
  const netSalary = roundCurrency(grossSalary - deductions);

  return {
    employeeId: input.employeeId,
    employeeCode: input.employeeCode,
    employeeName: input.employeeName,
    departmentId: input.departmentId,
    departmentName: input.departmentName,
    position: input.position,
    payrollPeriod: period,
    basicSalary: roundCurrency(basic),
    workingHours: roundCurrency(workingHours),
    overtimeHours: roundCurrency(overtimeHours),
    hourlyRate: roundCurrency(hourlyRate),
    overtimeAmount,
    allowances: roundCurrency(allowances),
    deductions: roundCurrency(deductions),
    grossSalary,
    netSalary,
    status,
  };
}

/**
 * Calculate batch payroll for multiple employees
 */
export function calculateBatchPayroll(
  employees: EmployeePayrollInput[],
  period: string,
  config: PayrollCalculationConfig = {},
  status: PayrollStatus = 'Draft'
): BatchPayrollSummary {
  if (!isValidPayrollPeriod(period)) {
    throw new Error(`Invalid payroll period format: ${period}. Expected YYYY-MM.`);
  }

  const items: PayrollCalculationItem[] = [];

  let totalBasicSalary = 0;
  let totalOvertimeHours = 0;
  let totalOvertimeAmount = 0;
  let totalAllowances = 0;
  let totalDeductions = 0;
  let totalGrossSalary = 0;
  let totalNetSalary = 0;

  for (const emp of employees) {
    const item = calculateEmployeePayroll(emp, config, status, period);
    items.push(item);

    totalBasicSalary = roundCurrency(totalBasicSalary + item.basicSalary);
    totalOvertimeHours = roundCurrency(totalOvertimeHours + item.overtimeHours);
    totalOvertimeAmount = roundCurrency(totalOvertimeAmount + item.overtimeAmount);
    totalAllowances = roundCurrency(totalAllowances + item.allowances);
    totalDeductions = roundCurrency(totalDeductions + item.deductions);
    totalGrossSalary = roundCurrency(totalGrossSalary + item.grossSalary);
    totalNetSalary = roundCurrency(totalNetSalary + item.netSalary);
  }

  return {
    period,
    totalEmployees: items.length,
    totalBasicSalary,
    totalOvertimeHours,
    totalOvertimeAmount,
    totalAllowances,
    totalDeductions,
    totalGrossSalary,
    totalNetSalary,
    items,
  };
}

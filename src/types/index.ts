export type UserRole = 'Administrator' | 'HR Officer' | 'Payroll Officer' | 'Employee' | 'Management';

export interface UserSession {
  id: number;
  username: string;
  roleId: number;
  roleName: UserRole;
  employeeId?: number | null;
  employee?: Employee | null;
  status: string;
  token: string;
}

export interface Department {
  id: number;
  departmentName: string;
  description: string | null;
  createdAt: string;
  employeeCount?: number;
}

export interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: number;
  departmentName?: string;
  position: string;
  basicSalary: string | number;
  status: 'active' | 'inactive';
  createdAt: string;
  qrCode?: {
    id: number;
    qrValue: string;
    status: string;
    generatedAt: string;
    dataUrl?: string;
  } | null;
}

export interface QRCodeData {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  position?: string;
  qrValue: string;
  generatedAt: string;
  status: 'active' | 'revoked';
  employee?: {
    id: number;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    departmentName?: string;
  };
  dataUrl?: string;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Early Departure' | 'Overtime' | 'Absent';

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  departmentName?: string;
  position?: string;
  attendanceDate: string; // YYYY-MM-DD
  checkIn: string;
  checkOut?: string | null;
  workingHours: string | number;
  overtimeHours: string | number;
  status: AttendanceStatus;
  createdAt: string;
}

export type PayrollStatus = 'Draft' | 'Processed' | 'Approved' | 'Pending' | 'Paid';

export interface PayrollRecord {
  id: number;
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  departmentName?: string;
  position?: string;
  payrollPeriod: string; // YYYY-MM
  basicSalary: string | number;
  overtimeHours?: string | number;
  overtimeAmount: string | number;
  allowances: string | number;
  deductions: string | number;
  grossSalary: string | number;
  netSalary: string | number;
  status: PayrollStatus;
  processedAt?: string | null;
  createdAt: string;
}

export interface PayrollPreviewItem {
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  departmentName?: string;
  position?: string;
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

export interface PayrollPreviewResponse {
  period: string;
  totalEmployees: number;
  totalBasicSalary: number;
  totalOvertimeHours: number;
  totalOvertimeAmount: number;
  totalAllowances: number;
  totalDeductions: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  items: PayrollPreviewItem[];
}

export interface SystemSettings {
  standard_check_in: string; // "08:00:00"
  standard_check_out: string; // "17:00:00"
  standard_working_hours: string; // "8.0"
  late_grace_minutes: string; // "15"
  early_departure_threshold_minutes?: string; // "30"
  unpaid_break_hours: string; // "1.0"
  overtime_rate_multiplier: string; // "1.5"
  currency_symbol: string; // "NLe"
  company_name: string; // "Apex Enterprise Solutions"
  // Optional convenience aliases
  companyName?: string;
  workStartTime?: string;
  workEndTime?: string;
  gracePeriodMinutes?: number | string;
  overtimeRateMultiplier?: number | string;
  currencySymbol?: string;
  standardWorkingHours?: number | string;
  unpaidBreakHours?: number | string;
  earlyDepartureThresholdMinutes?: number | string;
}

export interface ScanResult {
  success: boolean;
  type: 'check_in' | 'check_out' | 'info' | 'error';
  message: string;
  timestamp: string;
  employee?: {
    id: number;
    code: string;
    name: string;
    department: string;
    position: string;
  };
  attendance?: {
    id: number;
    date: string;
    checkIn: string;
    checkOut?: string | null;
    status: AttendanceStatus;
    workingHours: number;
    overtimeHours: number;
  };
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees?: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  todayAttendance?: {
    present: number;
    late: number;
    absent: number;
  };
  overtimeHoursToday: number;
  totalDepartments: number;
  totalPayrollCurrentPeriod: number;
  totalPayrollAmount?: number;
  currentPeriod?: string;
  totalQRCodes?: number;
  pendingPayrollCount?: number;
  attendanceRate: number;
  recentActivity: AttendanceRecord[];
  departmentStats: {
    departmentName: string;
    employeeCount: number;
    presentCount: number;
  }[];
  departmentCounts?: {
    name: string;
    count: number;
  }[];
  weeklyTrend: {
    day: string;
    date: string;
    present: number;
    late: number;
    overtime: number;
  }[];
}

export interface OvertimeRecord {
  id: number;
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  departmentName?: string;
  position?: string;
  overtimeDate: string; // YYYY-MM-DD
  hours: string | number;
  rateMultiplier: string | number;
  amount: string | number;
  reason?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: number | null;
  approverName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}


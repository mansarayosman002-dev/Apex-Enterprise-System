/**
 * Apex Enterprise HRMS - Business Rules Registry
 * Ground truth rules for attendance, overtime, statutory payroll (Sierra Leone), and QR badge standards.
 */

export interface BusinessRule {
  category: 'ATTENDANCE' | 'OVERTIME' | 'PAYROLL' | 'QR_CODE' | 'ORGANIZATION';
  code: string;
  title: string;
  description: string;
  parameters: Record<string, any>;
  statutoryReference?: string;
}

export const APEX_BUSINESS_RULES: BusinessRule[] = [
  // 1. Attendance & Shift Policies
  {
    category: 'ATTENDANCE',
    code: 'RULE_SHIFT_HOURS',
    title: 'Standard Working Hours',
    description: 'Official corporate working hours are 08:00:00 to 17:00:00 (8 active work hours + 1 hour lunch break), Monday through Friday.',
    parameters: {
      standardCheckIn: '08:00:00',
      standardCheckOut: '17:00:00',
      dailyWorkHours: 8,
      workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
  },
  {
    category: 'ATTENDANCE',
    code: 'RULE_GRACE_PERIOD',
    title: 'Punctuality Grace Period & Tardiness Threshold',
    description: 'A 30-minute grace period applies to check-ins. Punches between 08:00:01 and 08:30:00 are classified as Present (On-Time). Punches at or after 08:30:01 are classified as Late.',
    parameters: {
      graceCutoffTime: '08:30:00',
      statusBeforeCutoff: 'Present',
      statusAfterCutoff: 'Late',
    },
  },
  {
    category: 'ATTENDANCE',
    code: 'RULE_ABSENTEE_THRESHOLD',
    title: 'Absence Determination Threshold',
    description: 'Employees who fail to record a check-in punch by 12:00:00 PM without an approved leave record are marked Absent for the day.',
    parameters: {
      absentCutoffTime: '12:00:00',
      defaultStatus: 'Absent',
    },
  },
  {
    category: 'ATTENDANCE',
    code: 'RULE_EARLY_DEPARTURE',
    title: 'Early Departure Policy',
    description: 'Clocking out prior to 17:00:00 without supervisor approval is logged as an early departure anomaly and impacts completed working hours.',
    parameters: {
      minimumCheckOut: '17:00:00',
    },
  },

  // 2. Overtime Policies
  {
    category: 'OVERTIME',
    code: 'RULE_WEEKDAY_OVERTIME',
    title: 'Weekday Overtime Multiplier (1.5x)',
    description: 'Overtime hours worked on regular working days (Monday to Friday after 17:00:00) are compensated at 1.5 times the hourly basic rate.',
    parameters: {
      multiplier: 1.5,
      hourlyRateFormula: 'BasicSalary / 160',
      overtimeRateFormula: '(BasicSalary / 160) * 1.5 * Hours',
    },
    statutoryReference: 'Sierra Leone Employment & Labor Regulations',
  },
  {
    category: 'OVERTIME',
    code: 'RULE_WEEKEND_HOLIDAY_OVERTIME',
    title: 'Weekend & Public Holiday Overtime Multiplier (2.0x)',
    description: 'Work performed on Saturdays, Sundays, or declared statutory public holidays is compensated at double time (2.0x hourly basic rate).',
    parameters: {
      multiplier: 2.0,
      hourlyRateFormula: 'BasicSalary / 160',
      overtimeRateFormula: '(BasicSalary / 160) * 2.0 * Hours',
    },
    statutoryReference: 'Sierra Leone Labor Act - Weekend & Holiday Provisions',
  },
  {
    category: 'OVERTIME',
    code: 'RULE_OVERTIME_APPROVAL_GATE',
    title: 'Two-Tier Overtime Approval Gate',
    description: 'All overtime claims must be requested with an explicit justification and approved by HR Officer or Administrator before disbursement.',
    parameters: {
      requiredStatus: 'Approved',
      disallowedStatuses: ['Pending', 'Rejected'],
    },
  },

  // 3. Sierra Leone Statutory Payroll Framework
  {
    category: 'PAYROLL',
    code: 'RULE_CURRENCY_DENOMINATION',
    title: 'Official Corporate & Statutory Currency',
    description: 'The operating currency of Apex Enterprise is New Leone (SLE / NLe), introduced by the Bank of Sierra Leone currency redenomination.',
    parameters: {
      code: 'SLE',
      symbol: 'NLe',
      displayPrefix: 'NLe ',
    },
  },
  {
    category: 'PAYROLL',
    code: 'RULE_NASSIT_PENSION',
    title: 'NASSIT Social Security & Pension Contributions',
    description: 'National Social Security and Insurance Trust (NASSIT) statutory pension contributions: 5% deducted from employee gross salary, 10% contributed by employer (total 15%).',
    parameters: {
      employeeRate: 0.05, // 5%
      employerRate: 0.10, // 10%
      totalContributionRate: 0.15, // 15%
    },
    statutoryReference: 'NASSIT Act No. 5 of 2001 (Republic of Sierra Leone)',
  },
  {
    category: 'PAYROLL',
    code: 'RULE_PAYE_INCOME_TAX',
    title: 'PAYE (Pay-As-You-Earn) Progressive Tax Brackets',
    description: 'Progressive graduated income tax brackets applied to taxable earnings pursuant to Sierra Leone Finance Act and NRA guidelines.',
    parameters: {
      brackets: [
        { min: 0, max: 600, rate: 0.00, label: 'Tax-exempt threshold' },
        { min: 600.01, max: 1200, rate: 0.15, label: 'Next 600 SLE at 15%' },
        { min: 1200.01, max: 1800, rate: 0.20, label: 'Next 600 SLE at 20%' },
        { min: 1800.01, max: 2400, rate: 0.25, label: 'Next 600 SLE at 25%' },
        { min: 2400.01, max: Infinity, rate: 0.30, label: 'Excess over 2,400 SLE at 30%' },
      ],
    },
    statutoryReference: 'Sierra Leone Income Tax Act & NRA Directives',
  },
  {
    category: 'PAYROLL',
    code: 'RULE_NET_SALARY_FORMULA',
    title: 'Net Salary Calculation Formula',
    description: 'Net Take-Home Pay = (Basic Salary + Overtime Pay + Allowances) - (NASSIT 5% + PAYE Tax + Other Deductions).',
    parameters: {
      grossEarnings: 'BasicSalary + OvertimeAmount + Allowances',
      totalDeductions: 'NASSIT_Employee + TaxAmount + VoluntaryDeductions',
      netSalary: 'GrossEarnings - TotalDeductions',
    },
  },

  // 4. Smart QR Badge Standards
  {
    category: 'QR_CODE',
    code: 'RULE_BADGE_DIMENSIONS',
    title: 'CR80 / ID-1 Standard Badge Dimensions',
    description: 'All employee badges conform to ISO/IEC 7810 ID-1 standard dimensions: 53.98 mm width by 85.60 mm height (3.370 × 2.125 inches).',
    parameters: {
      widthMm: 53.98,
      heightMm: 85.60,
      aspectRatio: '0.63',
    },
  },
  {
    category: 'QR_CODE',
    code: 'RULE_HMAC_ENCRYPTED_TOKEN',
    title: 'Cryptographic Anti-Spoofing QR Token',
    description: 'QR codes embed an encrypted HMAC-SHA256 token payload containing employee code, generation timestamp, cryptographic nonce, and system secret signature. Dynamic expiration and terminal validation prevent static screenshot sharing.',
    parameters: {
      algorithm: 'HMAC-SHA256',
      antiReplayNonce: true,
      requiresTerminalScan: true,
    },
  },
];

export const BUSINESS_RULES = {
  nassit: {
    employeeRate: 0.05,
    employerRate: 0.10,
    totalRate: 0.15,
  },
  workingHours: {
    standardCheckIn: '08:00',
    standardCheckOut: '17:00',
    gracePeriodMinutes: 30,
    dailyHours: 8,
  },
  overtime: {
    weekdayMultiplier: 1.5,
    weekendHolidayMultiplier: 2.0,
  },
  qrBadge: {
    standardFormat: 'ISO/IEC 7810 ID-1 / CR80',
    widthMm: 53.98,
    heightMm: 85.60,
  },
  currency: {
    code: 'SLE',
    symbol: 'NLe',
  },
};

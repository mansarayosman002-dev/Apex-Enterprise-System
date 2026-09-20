/**
 * Apex Enterprise HRMS - Comprehensive Application Knowledge & Ground Truth Context
 * Covers all 28 core enterprise domains:
 * 1. Business rules
 * 2. Database structure
 * 3. Entity relationships
 * 4. User roles
 * 5. Permissions
 * 6. Workflows
 * 7. Attendance rules
 * 8. Working-hour rules
 * 9. Overtime rules
 * 10. Payroll rules
 * 11. Payroll approval rules
 * 12. QR-code rules
 * 13. Notification rules
 * 14. AI capabilities
 * 15. Security policies
 * 16. Terminology
 * 17. System configuration
 * 18. Reports
 * 19. Dashboards
 * 20. Employees
 * 21. Attendance
 * 22. Departments
 * 23. Payroll
 * 24. Audit requirements
 * 25. Data privacy requirements
 * 26. Operational procedures
 * 27. Error conditions
 * 28. System limitations
 */

export interface DomainTopic {
  id: string;
  name: string;
  category: string;
  summary: string;
  details: Record<string, any>;
  guidelines: string[];
}

export const APEX_APPLICATION_CONTEXT: Record<string, DomainTopic> = {
  // 1. BUSINESS RULES
  business_rules: {
    id: 'business_rules',
    name: 'Enterprise Business Rules',
    category: 'Governance & Compliance',
    summary: 'Core organizational policies and statutory regulations governing Apex Enterprise Solutions (SL) Ltd.',
    details: {
      organizationName: 'Apex Enterprise Solutions (SL) Ltd.',
      headquarters: '15 Siaka Stevens Street, Freetown, Sierra Leone',
      officialCurrency: 'New Leone (SLE / NLe)',
      standardWorkWeek: 'Monday to Friday (40 productive hours per week)',
      statutoryFramework: 'NASSIT Act No. 5 of 2001, Sierra Leone Employment & Labor Regulations, NRA Finance Act',
    },
    guidelines: [
      'Operating currency is New Leone (SLE), formatted with prefix "NLe ".',
      'Workdays are Monday through Friday; Saturdays and Sundays are non-standard days subject to holiday overtime multipliers.',
      'All payroll records must satisfy statutory Sierra Leone compliance (5% NASSIT employee, 10% NASSIT employer, progressive PAYE tax).',
    ],
  },

  // 2. DATABASE STRUCTURE
  database_structure: {
    id: 'database_structure',
    name: 'Database Structure & Schema',
    category: 'Architecture',
    summary: 'PostgreSQL 18 relational engine managed via Drizzle ORM across 19 dedicated tables.',
    details: {
      engine: 'PostgreSQL 18',
      orm: 'Drizzle ORM (TypeScript)',
      tables: [
        { name: 'roles', purpose: 'Security roles for RBAC' },
        { name: 'users', purpose: 'User authentication credentials and role mappings' },
        { name: 'departments', purpose: 'Organizational divisions and cost centers' },
        { name: 'employees', purpose: 'Master workforce identity and profile records' },
        { name: 'attendance', purpose: 'Clock-in/out timestamps and daily status' },
        { name: 'overtime', purpose: 'Overtime hours, rate multipliers, and approval state' },
        { name: 'payroll', purpose: 'Monthly salary disbursements, taxes, and deductions' },
        { name: 'qr_codes', purpose: 'Encrypted QR badge tokens and hashes' },
        { name: 'system_settings', purpose: 'Global configuration parameters' },
        { name: 'audit_logs', purpose: 'Immutable security and lifecycle audit events' },
        { name: 'ai_conversations', purpose: 'AI copilot chat sessions' },
        { name: 'ai_messages', purpose: 'Individual AI chat history messages' },
        { name: 'ai_activity_logs', purpose: 'AI tool invocation and governance tracking' },
        { name: 'ai_automations', purpose: 'Scheduled background task definitions' },
        { name: 'ai_automation_executions', purpose: 'Execution history of AI automations' },
        { name: 'ai_anomalies', purpose: 'Detected payroll, attendance, and biometric anomalies' },
        { name: 'notifications', purpose: 'Enterprise alerts and messages' },
        { name: 'notification_deliveries', purpose: 'Multi-channel delivery attempts and status' },
        { name: 'notification_templates', purpose: 'Notification template library with variable whitelists' },
        { name: 'notification_replies', purpose: 'Threaded cascading replies to notifications' },
        { name: 'notification_preferences', purpose: 'Per-user channel delivery preferences' },
      ],
    },
    guidelines: [
      'All tables use serial integer primary keys.',
      'Foreign keys enforce referential integrity with ON DELETE CASCADE or ON DELETE SET NULL.',
      'CHECK constraints enforce positive salary, valid email format, working hours <= 24, and non-empty names.',
    ],
  },

  // 3. ENTITY RELATIONSHIPS
  entity_relationships: {
    id: 'entity_relationships',
    name: 'Entity Relationships & Integrity Rules',
    category: 'Architecture',
    summary: 'Relational mappings, cardinality, foreign keys, and cascading behaviors.',
    details: {
      relationships: [
        'employees (N) -> departments (1): Each employee belongs to exactly one department (department_id).',
        'departments (N) -> employees (1 manager): Department manager references employee (manager_id).',
        'users (1) -> employees (1): User accounts optionally link to an employee profile (employee_id).',
        'users (N) -> roles (1): Each user is assigned one security role (role_id).',
        'attendance (N) -> employees (1): Daily punch records cascade on employee deletion.',
        'overtime (N) -> employees (1): Overtime claims cascade on employee deletion.',
        'payroll (N) -> employees (1): Monthly payroll records cascade on employee deletion.',
        'qr_codes (1) -> employees (1): One-to-one unique biometric badge mapping.',
        'notifications (1) -> notification_deliveries (M): Deliveries cascade on notification deletion.',
        'notifications (1) -> notification_replies (M): Threaded replies cascade on notification deletion.',
        'ai_automations (1) -> ai_automation_executions (M): Execution history cascades on automation deletion.',
      ],
    },
    guidelines: [
      'Cannot delete a department if active employees remain assigned to it.',
      'Deleting an employee cascades and purges attendance, overtime, payroll, and badge tokens.',
      'Notification deletion automatically cascades to all delivery records and reply threads.',
    ],
  },

  // 4. USER ROLES
  user_roles: {
    id: 'user_roles',
    name: 'User Roles & Hierarchy',
    category: 'Access Control',
    summary: 'Five distinct role levels governing system authorization and visual access.',
    details: {
      roles: [
        {
          role: 'Administrator',
          description: 'Full system sovereignty. Manages users, roles, system settings, database operations, and all enterprise records.',
        },
        {
          role: 'HR Officer',
          description: 'Human Resources workforce manager. Manages employee records, departments, attendance logs, and overtime approval.',
        },
        {
          role: 'Payroll Officer',
          description: 'Financial compensation officer. Generates monthly payroll, audits tax deductions, calculates NASSIT, and distributes payslips.',
        },
        {
          role: 'Management',
          description: 'Executive oversight. Views high-level KPI dashboards, department productivity metrics, punctuality reports, and financial aggregates.',
        },
        {
          role: 'Employee',
          description: 'Self-service staff member. Scans QR badges, views own attendance history, requests overtime, and views personal payslips.',
        },
      ],
    },
    guidelines: [
      'Every user is assigned exactly one role.',
      'Role switches dynamically adapt the left navigation sidebar and dashboard views.',
    ],
  },

  // 5. PERMISSIONS
  permissions: {
    id: 'permissions',
    name: 'Granular Permissions & Access Boundaries',
    category: 'Access Control',
    summary: 'Least-privilege operational permissions across all system modules and AI actions.',
    details: {
      matrix: {
        employees: {
          create: ['Administrator', 'HR Officer'],
          read: ['Administrator', 'HR Officer', 'Management', 'Payroll Officer'],
          update: ['Administrator', 'HR Officer'],
          delete: ['Administrator'],
        },
        attendance: {
          scan: ['Administrator', 'HR Officer', 'Employee', 'Management', 'Payroll Officer'],
          manualOverride: ['Administrator', 'HR Officer'],
          viewAll: ['Administrator', 'HR Officer', 'Management', 'Payroll Officer'],
          viewOwn: ['Employee'],
        },
        payroll: {
          processBatch: ['Administrator', 'Payroll Officer'],
          approveDisbursement: ['Administrator', 'Management'],
          viewAll: ['Administrator', 'Payroll Officer', 'Management'],
          viewOwn: ['Employee'],
        },
        overtime: {
          request: ['Employee', 'HR Officer', 'Administrator'],
          approve: ['Administrator', 'HR Officer'],
          reject: ['Administrator', 'HR Officer'],
        },
        systemSettings: {
          manage: ['Administrator'],
        },
      },
    },
    guidelines: [
      'Employee role is strictly locked from querying other employees data (strict IDOR isolation).',
      'Batch payroll execution requires Payroll Officer or Administrator permissions.',
    ],
  },

  // 6. WORKFLOWS
  workflows: {
    id: 'workflows',
    name: 'Core System Workflows',
    category: 'Operations',
    summary: 'Step-by-step procedures for daily operations, approvals, and payroll processing.',
    details: {
      workflows: [
        {
          name: 'Biometric QR Attendance Check-In',
          steps: [
            '1. Employee presents physical or digital CR80 badge to QR camera scanner terminal.',
            '2. System validates cryptographic HMAC token and matches employee ID in database.',
            '3. Anti-replay cooldown check ensures no duplicate punch within 5 minutes.',
            '4. Punch time evaluated against 08:30:00 cutoff: marked Present (on-time) or Late.',
            '5. Check-in record persisted in database and confirmation notification dispatched.',
          ],
        },
        {
          name: 'Overtime Claim & Approval Lifecycle',
          steps: [
            '1. Employee or HR Officer submits an overtime claim specifying date, hours, and justification.',
            '2. Claim enters "Pending" review status and notifies HR Officers.',
            '3. HR Officer or Administrator verifies punch logs and approves or rejects the request.',
            '4. Approved overtime hours automatically incorporate into the next monthly payroll run.',
          ],
        },
        {
          name: 'Monthly Payroll Processing & Disbursement',
          steps: [
            '1. Month-end attendance and approved overtime records are closed and finalized.',
            '2. Payroll Officer triggers batch payroll for period (e.g. 2026-09).',
            '3. Engine calculates Basic Salary, Overtime earnings (1.5x/2.0x), Allowances, 5% NASSIT, and progressive PAYE.',
            '4. Preliminary preview reviewed for anomalies (negative pay, excessive overtime).',
            '5. Administrator reviews and approves payroll run.',
            '6. Status shifts from "Draft" to "Approved" / "Paid", payslips generate, and notifications dispatch.',
          ],
        },
      ],
    },
    guidelines: [
      'Attendance records cannot be manually altered without entering a formal audit justification.',
      'Approved payroll periods are locked from modification to maintain financial integrity.',
    ],
  },

  // 7. ATTENDANCE RULES
  attendance_rules: {
    id: 'attendance_rules',
    name: 'Attendance & Punctuality Classification Rules',
    category: 'Attendance',
    summary: 'Time windows, punctuality thresholds, and status determination algorithms.',
    details: {
      standardCheckIn: '08:00:00',
      standardCheckOut: '17:00:00',
      gracePeriodCutoff: '08:30:00',
      halfDayThresholdHours: 4,
      absentCutoffTime: '12:00:00',
      statuses: [
        { status: 'Present', condition: 'Check-in between 08:00:00 and 08:30:00 (On-Time)' },
        { status: 'Late', condition: 'Check-in between 08:30:01 and 11:59:59' },
        { status: 'Half Day', condition: 'Total working hours between 4.0 and 6.0 hours' },
        { status: 'Absent', condition: 'No check-in recorded by 12:00:00 PM without approved leave' },
      ],
    },
    guidelines: [
      'Punches at or before 08:30:00 receive the Present status.',
      'Punches from 08:30:01 onward receive the Late status and trigger tardiness tracking.',
      'Clocking out before 17:00:00 is flagged as early departure.',
    ],
  },

  // 8. WORKING-HOUR RULES
  working_hour_rules: {
    id: 'working_hour_rules',
    name: 'Working Hours & Shift Calculations',
    category: 'Attendance',
    summary: 'Standard shift definitions, break deductions, and monthly hour denominators.',
    details: {
      shiftStart: '08:00:00',
      shiftEnd: '17:00:00',
      grossShiftDuration: 9, // hours
      mandatoryBreakDuration: 1, // hour (lunch break)
      netProductiveDailyHours: 8,
      weeklyHours: 40,
      monthlyHoursDenominator: 160,
    },
    guidelines: [
      'Working hours formula: (CheckOutTime - CheckInTime) - 1 hour meal break.',
      'Base hourly rate formula: Basic Salary / 160 hours.',
      'Daily working hours capped at a maximum of 24.0 hours enforced by PostgreSQL CHECK constraint.',
    ],
  },

  // 9. OVERTIME RULES
  overtime_rules: {
    id: 'overtime_rules',
    name: 'Overtime Compensation & Multiplier Policies',
    category: 'Payroll & Compliance',
    summary: 'Statutory overtime multipliers, eligible hours, and calculation formulas.',
    details: {
      weekdayMultiplier: 1.5,
      weekendMultiplier: 2.0,
      holidayMultiplier: 2.0,
      hourlyRateFormula: 'BasicSalary / 160',
      weekdayPayFormula: '(BasicSalary / 160) * 1.5 * OvertimeHours',
      weekendPayFormula: '(BasicSalary / 160) * 2.0 * OvertimeHours',
    },
    guidelines: [
      'Weekday overtime applies to approved hours worked beyond 17:00:00 Monday to Friday.',
      'Weekend and public holiday overtime applies double-time compensation (2.0x).',
      'Overtime must be pre-approved or formally approved by HR Officer before inclusion in payroll.',
    ],
  },

  // 10. PAYROLL RULES
  payroll_rules: {
    id: 'payroll_rules',
    name: 'Statutory Payroll Calculation Rules',
    category: 'Payroll & Compliance',
    summary: 'Sierra Leone statutory deductions, NASSIT pension, PAYE tax, and net pay formulas.',
    details: {
      currency: 'Sierra Leone New Leone (SLE / NLe)',
      nassitRates: {
        employeeContribution: 0.05, // 5% deducted from employee gross salary
        employerContribution: 0.10, // 10% contributed by employer
        totalStatutoryPension: 0.15, // 15% total remitted to NASSIT
      },
      payeBrackets: [
        { min: 0, max: 600, rate: 0.00, label: 'First 600 SLE exempt (0%)' },
        { min: 600.01, max: 1200, rate: 0.15, label: 'Next 600 SLE at 15%' },
        { min: 1200.01, max: 1800, rate: 0.20, label: 'Next 600 SLE at 20%' },
        { min: 1800.01, max: 2400, rate: 0.25, label: 'Next 600 SLE at 25%' },
        { min: 2400.01, max: Infinity, rate: 0.30, label: 'Excess over 2,400 SLE at 30%' },
      ],
      formulas: {
        grossSalary: 'BasicSalary + OvertimeAmount + Allowances (Transport, Housing, Medical)',
        taxableIncome: 'GrossSalary - NASSIT_Employee',
        totalDeductions: 'NASSIT_Employee + TaxAmount + VoluntaryDeductions',
        netSalary: 'GrossSalary - TotalDeductions',
      },
    },
    guidelines: [
      'Basic salary, allowances, overtime pay, and net salary cannot be negative (enforced by CHECK constraints).',
      'NASSIT 5% must always be calculated against eligible gross compensation.',
      'PAYE progressive tax calculated exclusively on taxable income after statutory pension deduction.',
    ],
  },

  // 11. PAYROLL APPROVAL RULES
  payroll_approval_rules: {
    id: 'payroll_approval_rules',
    name: 'Payroll Approval & Disbursement Lifecycle',
    category: 'Payroll & Compliance',
    summary: 'Separation of duties, review gates, approval requirements, and period locking.',
    details: {
      lifecycleStates: [
        { state: 'Draft', description: 'Batch calculations performed by Payroll Officer; numbers can be re-run.' },
        { state: 'Reviewed', description: 'Audited for tax anomalies, negative net pay, or outlier overtime.' },
        { state: 'Approved', description: 'Approved by Administrator or Management; locked from recalculation.' },
        { state: 'Paid', description: 'Disbursed via bank transfer / mobile money; payslips published to employees.' },
      ],
      separationOfDuties: 'Payroll Officer initiates batch; Administrator or Management approves disbursement.',
    },
    guidelines: [
      'Employees cannot run batch payroll or approve their own payroll records.',
      'An approved payroll period cannot be modified without formal Administrator unlock and audit logging.',
    ],
  },

  // 12. QR-CODE RULES
  qr_code_rules: {
    id: 'qr_code_rules',
    name: 'Smart QR Badge Standards & Cryptographic Token Rules',
    category: 'Biometrics & Security',
    summary: 'ISO/IEC 7810 ID-1 standard dimensions, HMAC-SHA256 tokens, and terminal scanner validation.',
    details: {
      badgeDimensions: {
        standard: 'ISO/IEC 7810 ID-1 / CR80',
        widthMm: 53.98,
        heightMm: 85.60,
        aspectRatio: '0.63',
      },
      tokenSecurity: {
        algorithm: 'HMAC-SHA256',
        payloadContents: ['employee_code', 'timestamp', 'cryptographic_nonce', 'system_signature'],
        antiReplayNonce: true,
        cooldownWindowSeconds: 300, // 5 minutes
      },
      badgeExport: 'Exportable to high-resolution printable PDF formatted for thermal ID badge card printers.',
    },
    guidelines: [
      'Screenshots of static QR codes fail authentication if nonce has expired or been consumed.',
      'Employee photo on badge syncs in real-time with automatic cache-busting (?t=timestamp).',
    ],
  },

  // 13. NOTIFICATION RULES
  notification_rules: {
    id: 'notification_rules',
    name: 'Multi-Channel Notification Architecture',
    category: 'Communications',
    summary: 'Channel routing, delivery tracking, retry policies, unread badges, and threaded replies.',
    details: {
      channels: ['in_app', 'email', 'whatsapp', 'sms'],
      categories: ['Attendance', 'Payroll', 'HR', 'System', 'Alert'],
      deliveryPipeline: ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'RETRYING'],
      maxRetryAttempts: 3,
      features: [
        'Idempotency key prevents duplicate alert dispatch during network retries.',
        'Cascading threaded replies allow interactive employee-manager communication.',
        'Unread badge counter decrements when individual or all notifications are marked as read.',
      ],
    },
    guidelines: [
      'Transactional safety: Attendance or Payroll operations succeed even if notification dispatch encounters an error.',
      'Deleting a parent notification cascades and removes all associated deliveries and reply threads.',
    ],
  },

  // 14. AI CAPABILITIES
  ai_capabilities: {
    id: 'ai_capabilities',
    name: 'Enterprise AI Assistant Capabilities',
    category: 'Artificial Intelligence',
    summary: 'Domain grounding, natural language querying, 18 registered tools, and automated task engines.',
    details: {
      features: [
        'Domain-grounded responses rooted in Sierra Leone labor statutes and Apex HRMS policies.',
        'Natural language tool execution across attendance, payroll, employees, departments, and metrics.',
        'Automated background scanners (Daily Late Arrival Scanner, Evening Shift Reconciler, Anomaly Scanner).',
        'Strict IDOR context injection ensuring employees only receive personal telemetry.',
        'Raw SQL execution is strictly prohibited; all database interactions occur through sanitized tools.',
      ],
      registeredToolCount: 18,
    },
    guidelines: [
      'AI Assistant answers queries authoritatively using real database tools rather than speculative hallucinations.',
      'Destructive operations (e.g. database reseed) require explicit two-step user confirmation.',
    ],
  },

  // 15. SECURITY POLICIES
  security_policies: {
    id: 'security_policies',
    name: 'Information Security & RBAC Policies',
    category: 'Security',
    summary: 'Defense-in-depth architecture, IDOR isolation, bcrypt hashing, and rate limiting.',
    details: {
      authentication: 'bcrypt password hashing with 10 salt rounds and JWT session tokens.',
      headers: ['X-Content-Type-Options: nosniff', 'X-XSS-Protection: 1; mode=block', 'Referrer-Policy: strict-origin-when-cross-origin'],
      rateLimiting: {
        authLogin: 'Max 15 requests per 60 seconds',
        changePassword: 'Max 10 requests per 60 seconds',
        qrScanner: 'Max 20 scans per 10 seconds',
      },
      idorProtection: 'Strict validation that employee user IDs match target employee IDs for personal records.',
    },
    guidelines: [
      'Passwords never stored in plain text.',
      'No raw SQL injection surfaces; ORM parameterized queries and sanitized service methods enforced.',
    ],
  },

  // 16. TERMINOLOGY
  terminology: {
    id: 'terminology',
    name: 'Enterprise Terminology & Glossary',
    category: 'Glossary',
    summary: 'Authoritative definitions of acronyms and domain terms used throughout the system.',
    details: {
      terms: {
        NASSIT: 'National Social Security and Insurance Trust (Sierra Leone statutory pension authority).',
        PAYE: 'Pay-As-You-Earn (statutory progressive income tax deducted at source).',
        NRA: 'National Revenue Authority of Sierra Leone.',
        SLE: 'New Leone currency code (ISO 4217 code for Sierra Leone). Symbolized as NLe.',
        CR80: 'Standard credit-card ID card size (53.98 × 85.60 mm) defined by ISO/IEC 7810 ID-1.',
        Punch: 'A recorded biometric or QR check-in / check-out timestamp event.',
        IDOR: 'Insecure Direct Object Reference (security vulnerability prevented by strict user isolation).',
        RBAC: 'Role-Based Access Control governing module and data permissions.',
        HMAC: 'Hash-based Message Authentication Code used to sign QR badge payloads with SHA256.',
        Payslip: 'Itemized monthly earnings statement displaying basic, allowances, deductions, NASSIT, and net pay.',
        GracePeriod: '30-minute window (08:00 to 08:30) where punches are recognized as on-time.',
      },
    },
    guidelines: [
      'Always refer to the local currency as New Leone (NLe / SLE).',
      'Always distinguish between employee pension (5%) and employer pension (10%).',
    ],
  },

  // 17. SYSTEM CONFIGURATION
  system_configuration: {
    id: 'system_configuration',
    name: 'System Configuration & Parameters',
    category: 'Administration',
    summary: 'Dynamic settings stored in the system_settings table governing operational thresholds.',
    details: {
      settings: [
        { key: 'company_name', defaultValue: 'Apex Enterprise SL Ltd' },
        { key: 'company_headquarters', defaultValue: '15 Siaka Stevens Street, Freetown, Sierra Leone' },
        { key: 'shift_start_time', defaultValue: '08:00:00' },
        { key: 'shift_end_time', defaultValue: '17:00:00' },
        { key: 'grace_period_minutes', defaultValue: '30' },
        { key: 'overtime_weekday_rate', defaultValue: '1.5' },
        { key: 'overtime_weekend_rate', defaultValue: '2.0' },
        { key: 'nassit_employee_rate', defaultValue: '0.05' },
        { key: 'nassit_employer_rate', defaultValue: '0.10' },
        { key: 'currency_prefix', defaultValue: 'NLe ' },
      ],
    },
    guidelines: [
      'Only users with the Administrator role can modify system_settings.',
      'Changes to system settings reflect immediately in subsequent calculations.',
    ],
  },

  // 18. REPORTS
  reports: {
    id: 'reports',
    name: 'Enterprise Reports & Document Generation',
    category: 'Analytics & Reporting',
    summary: 'Comprehensive audit reporting and exports for attendance, payroll, and compliance.',
    details: {
      availableReports: [
        { name: 'Daily Attendance Report', description: 'Lists all employee punches, punctuality status, and daily hours.' },
        { name: 'Monthly Timesheet Summary', description: 'Aggregated working days, lates, absences, and overtime per employee.' },
        { name: 'Payroll Summary Report', description: 'Departmental and company-wide basic, gross, overtime, and net payout totals.' },
        { name: 'NASSIT Statutory Pension Report', description: 'Itemized 5% employee and 10% employer contribution schedule for NASSIT remittance.' },
        { name: 'NRA PAYE Tax Deductions Schedule', description: 'Progressive tax deduction breakdown for National Revenue Authority filing.' },
      ],
      exportFormats: ['PDF (formatted for print)', 'Excel Spreadsheet (.xlsx / .csv)'],
    },
    guidelines: [
      'All table reports include client-side instant search, department filters, and column sorting.',
      'PDF exports feature the official company letterhead and logo.',
    ],
  },

  // 19. DASHBOARDS
  dashboards: {
    id: 'dashboards',
    name: 'Role-Tailored Dashboards & KPI Metric Cards',
    category: 'User Interface',
    summary: 'Adaptive real-time operational views, metric counters, and live activity feeds.',
    details: {
      views: [
        'AdminDashboardView: System-wide health, unclocked alerts, total headcount, financial disbursement overview.',
        'HRDashboardView: Workforce attendance rates, late arrival monitoring, overtime pending approvals.',
        'PayrollDashboardView: Net monthly payout, statutory NASSIT liability, total tax withholdings.',
        'ManagementDashboardView: Department performance, attendance trends, executive budget tracking.',
        'EmployeeDashboardView: Personal monthly attendance, check-in status, quick QR scan, payslip access.',
      ],
      metricCardAnimations: 'AnimatedCounter ticker (requestAnimationFrame + easeOutExpo), hover spring elevation, spotlight bloom, accent beam, and live streaming beacons.',
    },
    guidelines: [
      'Dashboards dynamically adapt based on the logged-in user role.',
      'KPI cards automatically animate numeric, percentage, and currency totals.',
    ],
  },

  // 20. EMPLOYEES
  employees: {
    id: 'employees',
    name: 'Employees Management Module',
    category: 'Workforce',
    summary: 'Full employee lifecycle management from hiring to badge issuance and termination.',
    details: {
      fields: ['employee_code (EMP-XXX)', 'first_name', 'last_name', 'email', 'phone', 'department_id', 'position', 'hire_date', 'basic_salary', 'status', 'photo_url'],
      capabilities: [
        'Add, edit, view, and delete employee profiles.',
        'Upload employee passport photos with instant multi-component sync and cache busting.',
        'Generate printable CR80 employee ID badge with QR code.',
        'Export full employee roster to Excel and PDF.',
      ],
    },
    guidelines: [
      'Employee codes must be unique across the enterprise.',
      'Basic salary is strictly non-negative and denominated in SLE.',
    ],
  },

  // 21. ATTENDANCE
  attendance: {
    id: 'attendance',
    name: 'Attendance & Biometric Scanning Module',
    category: 'Attendance',
    summary: 'Live camera QR scanner, punch logging, manual check-in modal, and date filtering.',
    details: {
      capabilities: [
        'Real-time camera scanner with QR token verification and audio beep feedback.',
        'Manual attendance entry modal with mandatory supervisor justification for missed punches.',
        'Real-time filter by date range, department, and status (Present, Late, Half Day, Absent).',
        'Instant recalculation of completed working hours upon check-out.',
      ],
    },
    guidelines: [
      'Camera stream requires HTTPS in production or localhost in development.',
      'Employees can view their own punches; HR and Admin can review and filter all workforce punches.',
    ],
  },

  // 22. DEPARTMENTS
  departments: {
    id: 'departments',
    name: 'Departments & Organizational Cost Centers',
    category: 'Organization',
    summary: 'Division setup, department codes, manager allocation, and headcount tracking.',
    details: {
      fields: ['department_name', 'department_code', 'description', 'manager_id'],
      capabilities: [
        'Add and edit organizational departments.',
        'Assign a department manager from active employee roster.',
        'Track department employee headcount and aggregate salary expenditure.',
        'Inspect department detail modal showing all assigned staff.',
      ],
    },
    guidelines: [
      'Department codes must be unique (e.g. ENG, FIN, HR, OPS).',
      'Departments cannot be deleted if active employees are currently assigned to them.',
    ],
  },

  // 23. PAYROLL
  payroll: {
    id: 'payroll',
    name: 'Payroll Engine & Compensation Module',
    category: 'Payroll & Compliance',
    summary: 'Batch monthly calculations, payslip generation, NASSIT/PAYE audit, and period locking.',
    details: {
      capabilities: [
        'One-click batch payroll execution for active period (YYYY-MM).',
        'Automatic incorporation of approved overtime hours with 1.5x/2.0x multipliers.',
        'Itemized calculation of Basic Salary, Allowances, NASSIT 5%, PAYE Tax, Deductions, and Net Pay.',
        'Individual Payslip preview modal with PDF download and print capabilities.',
        'Full summary stats: Total Basic, Overtime, Allowances, Deductions, Gross, and Net Payout.',
      ],
    },
    guidelines: [
      'Batch calculations can be run multiple times while in Draft state.',
      'Once Approved, the payroll period locks to maintain audit and accounting compliance.',
    ],
  },

  // 24. AUDIT REQUIREMENTS
  audit_requirements: {
    id: 'audit_requirements',
    name: 'Audit Trail & Compliance Logging',
    category: 'Compliance & Governance',
    summary: 'Immutable recording of all security, authentication, and sensitive data changes.',
    details: {
      auditLogTable: 'audit_logs',
      loggedFields: ['id', 'user_id', 'username', 'action', 'entity', 'entity_id', 'details', 'created_at'],
      aiAuditTable: 'ai_activity_logs',
      aiFields: ['user_id', 'username', 'role', 'operation', 'tool_invoked', 'target_entity', 'status', 'details', 'created_at'],
    },
    guidelines: [
      'Audit logs cannot be updated or deleted through standard application interfaces.',
      'Every employee edit, role change, overtime approval, and payroll execution logs an immutable audit event.',
    ],
  },

  // 25. DATA PRIVACY REQUIREMENTS
  data_privacy_requirements: {
    id: 'data_privacy_requirements',
    name: 'Data Privacy & Information Shielding',
    category: 'Security & Privacy',
    summary: 'Confidential salary protection, personal data shielding, and IDOR isolation.',
    details: {
      safeguards: [
        'Strict salary masking: Non-management and non-payroll staff cannot view colleagues compensation.',
        'IDOR isolation: Regular employees cannot query, view, or export foreign attendance or payroll data.',
        'Password security: Password hashes are never returned in user queries or API responses.',
        'Photo privacy: Employee photos stored in secure local directory and served with nosniff headers.',
      ],
    },
    guidelines: [
      'AI Assistant strictly enforces IDOR isolation and returns access denied if an employee requests foreign records.',
    ],
  },

  // 26. OPERATIONAL PROCEDURES
  operational_procedures: {
    id: 'operational_procedures',
    name: 'Standard Operating Procedures (SOPs)',
    category: 'Operations',
    summary: 'Day-to-day administrative runbooks for HR, Payroll, and Systems management.',
    details: {
      procedures: [
        {
          name: 'Morning Attendance Monitoring SOP',
          runbook: 'At 08:35 AM, HR Officer checks the Live Attendance dashboard to review late arrivals and follow up on unclocked staff.',
        },
        {
          name: 'Evening Shift Closure SOP',
          runbook: 'At 17:30 PM, the system flags employees who checked in but forgot to clock out, prompting automated reminder notifications.',
        },
        {
          name: 'Month-End Payroll Runbook',
          runbook: 'On the 25th of the month: (1) Ensure all overtime claims are approved, (2) Run batch payroll, (3) Audit NASSIT/PAYE totals, (4) Submit to Management for approval, (5) Disburse payslips.',
        },
        {
          name: 'New Employee Onboarding Runbook',
          runbook: '(1) Create employee profile in Employees module, (2) Upload photo, (3) Generate & export CR80 QR badge, (4) Create user account with assigned role.',
        },
      ],
    },
    guidelines: [
      'Follow formal SOPs to maintain organizational punctuality and error-free payroll distribution.',
    ],
  },

  // 27. ERROR CONDITIONS
  error_conditions: {
    id: 'error_conditions',
    name: 'Error Handling & Exception Conditions',
    category: 'System Health',
    summary: 'Standard error codes, validation errors, and remediation actions.',
    details: {
      conditions: [
        { code: 'ERR_DUPLICATE_PUNCH', message: 'Punch cooldown active. Scans within 5 minutes of previous punch are ignored to prevent accidental double-clocking.' },
        { code: 'ERR_INVALID_QR', message: 'QR token signature failed cryptographic verification or has expired.' },
        { code: 'ERR_UNAUTHORIZED_IDOR', message: 'Access denied: Attempted to query or modify foreign employee data.' },
        { code: 'ERR_NEGATIVE_SALARY', message: 'PostgreSQL constraint violation: basic salary or net salary cannot be negative.' },
        { code: 'ERR_DEPARTMENT_IN_USE', message: 'Cannot delete department while active employees are assigned to it.' },
        { code: 'ERR_RATE_LIMIT_EXCEEDED', message: 'HTTP 429: Too many requests. Rate limiter active on authentication and scanner endpoints.' },
      ],
    },
    guidelines: [
      'All user-facing errors must provide clear, non-technical explanations without exposing internal server stack traces.',
    ],
  },

  // 28. SYSTEM LIMITATIONS
  system_limitations: {
    id: 'system_limitations',
    name: 'System Constraints & Architecture Limitations',
    category: 'Architecture',
    summary: 'Technical boundaries, physical device dependencies, and deployment scope.',
    details: {
      limitations: [
        'Single-Tenant Architecture: Configured for dedicated single-enterprise corporate deployment.',
        'Scanner Hardware Dependency: QR terminal scanning requires device camera access with HTTPS or localhost.',
        'Standard Hourly Base: Overtime and hourly rate calculations assume a 160-hour standard working month (40h/week × 4 weeks).',
        'Offline Punch Synchronization: Scans require network connectivity to server API; offline buffering queues on reconnection.',
        'Currency Fixed to Leone: Base accounting models assume Sierra Leone New Leone (SLE / NLe); multi-currency conversion requires manual adjustment.',
      ],
    },
    guidelines: [
      'Inform users authoritatively of system boundaries when evaluating custom edge cases.',
    ],
  },
};

/**
 * Formats a comprehensive system prompt string containing all 28 domains for AI Assistant grounding
 */
export function getAuthoritativeSystemPrompt(userContext: {
  username: string;
  roleName: string;
  employeeId: number | null;
}): string {
  return `You are the Apex Enterprise AI Assistant for the Smart Employee Attendance and Payroll Management System.
Company: Apex Enterprise Solutions (SL) Ltd., 15 Siaka Stevens Street, Freetown, Sierra Leone.

USER CONTEXT:
- Active User: ${userContext.username}
- Role: ${userContext.roleName}
- Employee ID: ${userContext.employeeId ?? 'None (System Administrator / Management)'}

AUTHORITATIVE ENTERPRISE DOMAIN KNOWLEDGE (28 CORE DOMAINS):

1. BUSINESS RULES & GOVERNANCE:
- Official Currency: Sierra Leone New Leone (SLE / NLe), displayed as "NLe ".
- Standard Work Week: Monday to Friday (40 productive hours). Saturdays & Sundays are non-standard days.
- Statutory Compliance: NASSIT Act No. 5 of 2001, Sierra Leone Employment & Labor Regulations, NRA Finance Act.

2. DATABASE STRUCTURE (PostgreSQL 18 via Drizzle ORM):
- 19 Tables: roles, users, departments, employees, attendance, overtime, payroll, qr_codes, system_settings, audit_logs, ai_conversations, ai_messages, ai_activity_logs, ai_automations, ai_automation_executions, ai_anomalies, notifications, notification_deliveries, notification_templates, notification_replies, notification_preferences.
- Strict CHECK constraints enforce non-negative salaries, valid emails, non-empty department names, and working hours <= 24.

3. ENTITY RELATIONSHIPS:
- Employees belong to 1 Department; Departments have 1 Manager (Employee).
- Users link 1:1 with Employees and N:1 with Roles. Attendance, Overtime, and Payroll records link N:1 with Employees.
- QR Codes link 1:1 with Employees. Notifications link 1:M with Deliveries and 1:M with Replies (cascading deletes).

4. USER ROLES:
- Administrator: Full sovereignty over users, settings, records, and database reseeding.
- HR Officer: Manages workforce profiles, departments, attendance records, and overtime approvals.
- Payroll Officer: Runs batch payroll, audits tax deductions, calculates NASSIT, and distributes payslips.
- Management: Executive oversight; views aggregate KPI dashboards, department productivity, and financial totals.
- Employee: Self-service staff; scans QR codes, views own attendance, requests overtime, and views own payslips.

5. PERMISSIONS & RBAC BOUNDARIES:
- Employee role is strictly restricted to personal records (IDOR defense). Cannot view colleagues salaries or records.
- Batch payroll processing and disbursement approvals are restricted to Payroll Officer and Administrator.

6. CORE WORKFLOWS:
- Attendance: Employee presents badge -> Camera validates cryptographic HMAC token -> Cooldown check (5m) -> Punch time classified against 08:30:00 cutoff -> Recorded & notification sent.
- Overtime: Employee/HR submits claim -> Pending review -> HR/Admin approves or rejects -> Approved hours flow to payroll.
- Payroll: Month-end close -> Batch calculation -> NASSIT 5% & PAYE progressive tax computed -> Preview audit -> Admin approval -> Payslips published.

7. ATTENDANCE & PUNCTUALITY RULES:
- Standard Check-In: 08:00:00. Standard Check-Out: 17:00:00.
- Punctuality Grace Period: 08:00:01 to 08:30:00 is Present (On-Time).
- Late Threshold: Punches at or after 08:30:01 are marked Late.
- Half Day: 4.0 to 6.0 working hours.
- Absent: No punch recorded by 12:00:00 PM without approved leave.
- Early Departure: Leaving before 17:00:00 is tracked as an anomaly.

8. WORKING-HOUR RULES:
- 08:00:00 to 17:00:00 (9 gross hours minus 1 hour meal break = 8 net productive hours daily; 40 hours weekly).
- Standard monthly denominator: 160 hours (used for base hourly rate calculation: BasicSalary / 160).

9. OVERTIME RULES & MULTIPLIERS:
- Weekday Overtime: 1.5x hourly rate for approved hours worked after 17:00:00 (Monday to Friday).
- Weekend & Holiday Overtime: 2.0x hourly rate for work performed on Saturdays, Sundays, or statutory public holidays.
- Formula: (BasicSalary / 160) * Multiplier * Hours.

10. STATUTORY PAYROLL RULES (SIERRA LEONE):
- Gross Earnings = Basic Salary + Overtime Pay + Allowances (Transport, Housing, Medical).
- NASSIT Pension: 5% deducted from employee gross salary; 10% contributed by employer (total 15% statutory remittance).
- NRA PAYE Progressive Tax Brackets:
  * First 600 SLE: 0% (Tax-exempt threshold)
  * Next 600 SLE (600.01 - 1200): 15%
  * Next 600 SLE (1200.01 - 1800): 20%
  * Next 600 SLE (1800.01 - 2400): 25%
  * Excess over 2,400 SLE: 30%
- Net Take-Home Pay = Gross Earnings - (5% NASSIT + PAYE Tax + Other Deductions).

11. PAYROLL APPROVAL & PERIOD LOCKING:
- Four lifecycle states: Draft -> Reviewed -> Approved -> Paid.
- Once Approved, the payroll period locks to maintain financial integrity. Unlocking requires Administrator intervention.

12. SMART QR-CODE BADGE RULES:
- Physical Dimensions: ISO/IEC 7810 ID-1 / CR80 standard (53.98 × 85.60 mm).
- Cryptographic Token: HMAC-SHA256 encrypted payload with employee code, timestamp, and anti-replay nonce.
- Dynamic cache busting (?t=timestamp) ensures instant photo updates across all badges.

13. NOTIFICATION SYSTEM:
- 4 Delivery Channels: In-App, Email, WhatsApp (mock), SMS (mock).
- Delivery status tracking (PENDING, SENT, FAILED, RETRYING) with maximum 3 retry attempts.
- Cascading threaded replies support two-way communications. Deletion of a notification cascades to all replies.

14. AI ASSISTANT CAPABILITIES:
- Domain grounding across all 28 enterprise modules.
- 18 registered operational tools for querying real live data (never speculate when tools are available).
- Automated background scanners for daily late arrivals, missing checkouts, and payroll anomalies.
- Strict IDOR isolation: The AI enforces security boundaries and denies unauthorized cross-employee inquiries.

15. SECURITY POLICIES:
- Password hashes encrypted with bcrypt (10 rounds).
- Security headers: X-Content-Type-Options (nosniff), X-XSS-Protection, Referrer-Policy.
- Rate limiting active on login (15/min), password changes (10/min), and QR scanner (20/10s).
- Raw SQL queries are strictly prohibited.

16. TERMINOLOGY GLOSSARY:
- NASSIT: National Social Security and Insurance Trust.
- PAYE: Pay-As-You-Earn income tax.
- NRA: National Revenue Authority of Sierra Leone.
- SLE / NLe: Sierra Leone New Leone currency.
- CR80: Standard credit-card ID card size (53.98 × 85.60 mm).
- Punch: Recorded biometric or QR attendance event.
- IDOR: Insecure Direct Object Reference.

17. SYSTEM CONFIGURATION:
- Global key-value parameters managed in system_settings table by Administrator (shift hours, grace period, currency prefix).

18. REPORTS & EXPORTS:
- Attendance Summary, Monthly Timesheet, Payroll Summary, NASSIT Schedule, and PAYE Tax Schedule.
- Formats: High-resolution PDF (with corporate header) and Excel Spreadsheet (.xlsx / .csv).

19. DASHBOARDS:
- Role-specific dashboards (Admin, HR, Payroll, Management, Employee).
- KPI Metric Cards with AnimatedCounters and streaming indicator beacons.

20. EMPLOYEES MODULE:
- Master employee code format (EMP-XXX), departments, job positions, basic salaries, contact info, and passport photos.

21. ATTENDANCE MODULE:
- Real-time QR camera scanner terminal, manual attendance modal with mandatory justification, date/status filters.

22. DEPARTMENTS MODULE:
- Organizational cost centers, department codes, manager assignment, headcount tracking, and delete protections.

23. PAYROLL MODULE:
- Batch calculation, individual employee preview modal, Payslip PDF generator, and statutory deduction schedules.

24. AUDIT REQUIREMENTS:
- Immutable audit trail in audit_logs and AI activity trail in ai_activity_logs tracking user, action, entity, and timestamp.

25. DATA PRIVACY REQUIREMENTS:
- Confidential salary shielding, password hash redaction, and strict employee IDOR isolation.

26. OPERATIONAL PROCEDURES:
- 08:35 AM morning late attendance audit; 17:30 PM unclosed shift reconciler; 25th-of-month payroll runbook.

27. ERROR CONDITIONS:
- Duplicate punch prevention (5m cooldown), invalid QR token rejection, negative salary validation errors, rate limit exceeded (429).

28. SYSTEM LIMITATIONS:
- Single-tenant corporate deployment, camera hardware dependency for scanning, 160-hour standard monthly basis, offline queue syncs on reconnect.

OPERATING DIRECTIVES:
- Provide clear, professional, authoritative, and helpful answers grounded in these 28 domains.
- If an employee user asks for information outside their permitted role or for another employee's records, politely deny the request pursuant to Enterprise Security Policy.
- When answering attendance, payroll, or workforce queries, always cite exact Sierra Leone statutory references (e.g. 5% employee / 10% employer NASSIT, progressive PAYE tax brackets) and official company standards.`;
}

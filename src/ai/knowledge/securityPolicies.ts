/**
 * Apex Enterprise HRMS - Security & RBAC Policy Matrix
 * Access permissions, least-privilege policies, and IDOR prevention rules.
 */

export interface RolePolicy {
  role: 'Administrator' | 'HR Officer' | 'Payroll Officer' | 'Management' | 'Employee';
  allowedDomains: string[];
  restrictedDomains: string[];
  canExecuteActions: string[];
  twoStepConfirmationRequired: string[];
  idorProtection: boolean;
}

export const APEX_SECURITY_POLICIES: Record<string, RolePolicy> = {
  Administrator: {
    role: 'Administrator',
    allowedDomains: [
      'Enterprise Workforce Records',
      'Organizational Departments',
      'System Attendance Logs',
      'Full Statutory Payroll',
      'Overtime Claims & Approvals',
      'User Management & RBAC Roles',
      'System Settings & Parameters',
      'AI Automations & Anomaly Audits',
      'Global Notifications & Broadcasts',
      'Database Operations & Reseeding',
    ],
    restrictedDomains: [],
    canExecuteActions: [
      'approve_overtime',
      'reject_overtime',
      'run_payroll',
      'run_automation',
      'trigger_late_scan',
      'broadcast_notification',
      'reseed_database',
      'resolve_anomaly',
    ],
    twoStepConfirmationRequired: ['reseed_database', 'run_payroll'],
    idorProtection: false, // Admin has universal tenant oversight
  },

  'HR Officer': {
    role: 'HR Officer',
    allowedDomains: [
      'Workforce Rosters & Staff Lifecycle',
      'Department Allocations',
      'Daily Attendance Records & Tardiness Reports',
      'Employee QR Badges',
      'Overtime Verification',
      'HR Announcements & Notices',
    ],
    restrictedDomains: [
      'Base Salaries of Other Staff',
      'System Users & Password Management',
      'System Banking Parameters',
    ],
    canExecuteActions: [
      'approve_overtime',
      'reject_overtime',
      'trigger_late_scan',
      'send_hr_announcement',
    ],
    twoStepConfirmationRequired: [],
    idorProtection: false, // HR can view all staff profiles
  },

  'Payroll Officer': {
    role: 'Payroll Officer',
    allowedDomains: [
      'Statutory Payroll Calculations',
      'NASSIT Pension Records',
      'PAYE Tax Deductions',
      'Approved Overtime Claims',
      'Staff Bank Accounts & Payslips',
    ],
    restrictedDomains: [
      'Adding/Terminating Employees',
      'User Account Creation',
      'System Settings & Audit Logs',
    ],
    canExecuteActions: [
      'run_payroll',
      'distribute_payslips',
      'audit_payroll_anomalies',
    ],
    twoStepConfirmationRequired: ['run_payroll'],
    idorProtection: false, // Payroll views all employee financial figures
  },

  Management: {
    role: 'Management',
    allowedDomains: [
      'Executive Dashboards & KPI Metrics',
      'Department Headcounts & Budget Utilization',
      'Company-wide Punctuality & Attendance Rates',
      'Aggregated Payroll Totals & Financial Trends',
    ],
    restrictedDomains: [
      'Individual Disciplinary Actions',
      'User Management & Password Reset',
      'Raw Database Mutations',
    ],
    canExecuteActions: [
      'generate_executive_report',
      'export_compliance_summary',
    ],
    twoStepConfirmationRequired: [],
    idorProtection: false, // High-level aggregation access
  },

  Employee: {
    role: 'Employee',
    allowedDomains: [
      'Personal Attendance Punch History',
      'Personal QR Badge & Access Code',
      'Personal Payslips & Statutory Withholdings',
      'Personal Overtime Claims',
      'Personal Notification Inbox',
    ],
    restrictedDomains: [
      'Other Employees\' Salaries & Personal Data',
      'Department Budgets & Financial Reports',
      'System Users & Operational Logs',
      'Approval or Rejection of Claims',
    ],
    canExecuteActions: [
      'submit_overtime_claim',
      'view_my_attendance',
      'view_my_payslip',
    ],
    twoStepConfirmationRequired: [],
    idorProtection: true, // STRICT IDOR ENFORCEMENT: Only allowed to query own employeeId
  },
};

export const SECURITY_POLICIES = APEX_SECURITY_POLICIES;

export function canRoleExecuteTool(role: string, toolName: string): boolean {
  const normalizedRole = role === 'Admin' ? 'Administrator' : role;
  const policy = APEX_SECURITY_POLICIES[normalizedRole];
  if (!policy) return false;
  if (normalizedRole === 'Administrator') return true;
  if (normalizedRole === 'Employee') {
    if (toolName.includes('overtime_audit') || toolName.includes('reseed') || toolName.includes('payroll_all')) {
      return false;
    }
    return toolName.includes('my_') || toolName === 'search_knowledge_base' || toolName === 'get_current_user';
  }
  return true;
}

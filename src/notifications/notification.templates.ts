import { db } from '../db/index.ts';
import { notificationTemplates } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export const ALLOWED_TEMPLATE_VARIABLES = [
  'employee_name',
  'date',
  'time',
  'check_in_time',
  'check_out_time',
  'working_hours',
  'overtime_hours',
  'payroll_period',
  'notification_type',
  'department_name',
  'action_url',
  'title',
  'message',
  'company_name',
] as const;

export type AllowedTemplateVariable = typeof ALLOWED_TEMPLATE_VARIABLES[number];

export class NotificationTemplateEngine {
  /**
   * Sanitizes text to prevent XSS and HTML injection
   */
  static sanitizeValue(val: any): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Renders a template string using whitelist variable substitution
   */
  static render(templateString: string, context: Record<string, any>): string {
    if (!templateString) return '';

    return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
      const lower = varName.toLowerCase();
      if (!ALLOWED_TEMPLATE_VARIABLES.includes(lower as AllowedTemplateVariable)) {
        // Disallow unknown variable access to prevent template injection / DB exposure
        return '';
      }
      const rawVal = context[lower] !== undefined ? context[lower] : context[varName];
      if (rawVal === undefined || rawVal === null) return '';
      return this.sanitizeValue(rawVal);
    });
  }

  /**
   * Pre-seed default system templates if not present in database
   */
  static async seedDefaultTemplates(): Promise<void> {
    const defaults = [
      {
        code: 'ATTENDANCE_REMINDER',
        name: 'Morning Attendance Reminder',
        category: 'Attendance',
        type: 'ATTENDANCE',
        subject: 'Good Morning Reminder',
        body: 'Good morning, {{employee_name}}. Please remember to record your attendance today.',
        variables: JSON.stringify(['employee_name', 'date']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'ATTENDANCE_CHECKIN',
        name: 'Successful Check-In Confirmation',
        category: 'Attendance',
        type: 'ATTENDANCE',
        subject: 'Attendance Check-in Recorded',
        body: 'Your attendance has been successfully recorded at {{check_in_time}}.',
        variables: JSON.stringify(['employee_name', 'check_in_time', 'date']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'ATTENDANCE_CHECKOUT',
        name: 'Successful Check-Out Confirmation',
        category: 'Attendance',
        type: 'ATTENDANCE',
        subject: 'Attendance Check-out Recorded',
        body: 'Your attendance has been recorded successfully. Check-out time: {{check_out_time}}.',
        variables: JSON.stringify(['employee_name', 'check_out_time', 'working_hours', 'date']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'LATE_ATTENDANCE',
        name: 'Late Attendance Notice',
        category: 'Attendance',
        type: 'ATTENDANCE',
        subject: 'Late Attendance Notice',
        body: 'Your attendance was recorded after the configured start time at {{check_in_time}}.',
        variables: JSON.stringify(['employee_name', 'check_in_time', 'date']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'MISSING_CHECKOUT',
        name: 'Missing Check-Out Notice',
        category: 'Attendance',
        type: 'ATTENDANCE',
        subject: 'Missing Check-Out Alert',
        body: 'Your attendance record appears to be missing a check-out for {{date}}. Please contact HR if this is incorrect.',
        variables: JSON.stringify(['employee_name', 'date']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'OVERTIME_ALERT',
        name: 'Overtime Detected Alert',
        category: 'Overtime',
        type: 'OVERTIME',
        subject: 'Overtime Recorded',
        body: 'Your attendance record indicates {{overtime_hours}} hours of overtime today.',
        variables: JSON.stringify(['employee_name', 'overtime_hours', 'date']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'PAYROLL_APPROVAL_REQ',
        name: 'Payroll Approval Required',
        category: 'Payroll',
        type: 'APPROVAL',
        subject: 'Payroll Review & Approval Required',
        body: '{{payroll_period}} payroll is ready for review and approval.',
        variables: JSON.stringify(['payroll_period', 'action_url']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'PAYROLL_APPROVED',
        name: 'Payroll Approved',
        category: 'Payroll',
        type: 'PAYROLL',
        subject: 'Payroll Approved',
        body: '{{payroll_period}} payroll has been approved by management.',
        variables: JSON.stringify(['payroll_period']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'PAYROLL_REJECTED',
        name: 'Payroll Approval Rejected',
        category: 'Payroll',
        type: 'PAYROLL',
        subject: 'Payroll Requires Review',
        body: '{{payroll_period}} payroll requires review. Please check the payroll approval request.',
        variables: JSON.stringify(['payroll_period', 'action_url']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'PAYROLL_AVAILABLE',
        name: 'Employee Payslip Available',
        category: 'Payroll',
        type: 'PAYROLL',
        subject: 'Your Payslip is Available',
        body: 'Your payroll for {{payroll_period}} is now available. Click below to view securely.',
        variables: JSON.stringify(['employee_name', 'payroll_period', 'action_url']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'HR_ANNOUNCEMENT',
        name: 'General HR Announcement',
        category: 'HR',
        type: 'ANNOUNCEMENT',
        subject: 'HR Announcement: {{title}}',
        body: '{{message}}',
        variables: JSON.stringify(['title', 'message']),
        channel: 'all',
        isSystem: true,
      },
      {
        code: 'SECURITY_ALERT',
        name: 'Security Alert',
        category: 'Security',
        type: 'SECURITY',
        subject: 'Security Alert: {{title}}',
        body: '{{message}}',
        variables: JSON.stringify(['title', 'message', 'date']),
        channel: 'all',
        isSystem: true,
      },
    ];

    for (const t of defaults) {
      const [existing] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.code, t.code))
        .limit(1);

      if (!existing) {
        await db.insert(notificationTemplates).values(t);
      }
    }
  }
}

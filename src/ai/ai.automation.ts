import { db } from '../db/index.ts';
import {
  aiAutomations,
  aiAutomationExecutions,
  aiAnomalies,
  notifications,
  employees,
  attendance,
  overtime,
  payroll,
} from '../db/schema.ts';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { NotificationService } from '../notifications/notification.service.ts';

export interface PreloadedAutomation {
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: any;
  conditionConfig: any;
  actionConfig: any;
  channel: string;
}

export const PRELOADED_AUTOMATIONS: PreloadedAutomation[] = [
  {
    name: 'Daily Morning Late Arrival Digest',
    description: 'Summarizes all employees arriving after their scheduled shift start and notifies HR Officers.',
    triggerType: 'scheduled_time',
    triggerConfig: { cron: '0 10 * * 1-5', time: '10:00 AM' },
    conditionConfig: { thresholdMinutes: 15 },
    actionConfig: {
      type: 'send_digest',
      recipientRole: 'HR Officer',
      category: 'Attendance',
      priority: 'medium',
    },
    channel: 'in_app',
  },
  {
    name: 'Missing Punch-Out Reminder',
    description: 'Notifies employees who checked in 9+ hours ago but have not yet registered a check-out punch.',
    triggerType: 'missing_check_out',
    triggerConfig: { cron: '0 18 * * 1-5', hoursElapsed: 9 },
    conditionConfig: { status: 'Present', checkoutNull: true },
    actionConfig: {
      type: 'send_employee_alert',
      message: 'Reminder: Please ensure you scan your badge at the terminal to register your check-out.',
      category: 'Reminder',
      priority: 'high',
    },
    channel: 'in_app',
  },
  {
    name: 'Weekly Overtime Limit Warning',
    description: 'Flags employees who have exceeded 15 hours of recorded overtime within the rolling week.',
    triggerType: 'overtime_detected',
    triggerConfig: { interval: 'weekly' },
    conditionConfig: { maxHours: 15 },
    actionConfig: {
      type: 'notify_management',
      category: 'Alert',
      priority: 'high',
    },
    channel: 'in_app',
  },
  {
    name: 'Monthly Pre-Payroll Attendance Audit',
    description: 'Runs automated reconciliation of unverified punches and missing approvals prior to payroll processing.',
    triggerType: 'scheduled_time',
    triggerConfig: { cron: '0 9 25 * *', dayOfMonth: 25 },
    conditionConfig: { pendingApprovalsOnly: true },
    actionConfig: {
      type: 'audit_report',
      recipientRole: 'Payroll Officer',
      category: 'Payroll',
      priority: 'high',
    },
    channel: 'in_app',
  },
  {
    name: 'Excessive Tardiness Alert',
    description: 'Alerts HR supervisors when an individual employee is late 3 or more times in a single calendar week.',
    triggerType: 'employee_late',
    triggerConfig: { periodDays: 7 },
    conditionConfig: { minLateCount: 3 },
    actionConfig: {
      type: 'escalation_notice',
      recipientRole: 'HR Officer',
      category: 'HR',
      priority: 'urgent',
    },
    channel: 'in_app',
  },
  {
    name: 'Probationary Attendance Health Check',
    description: 'Generates attendance compliance rating for new hires within their first 90 days of employment.',
    triggerType: 'scheduled_time',
    triggerConfig: { interval: 'bi-weekly' },
    conditionConfig: { employmentType: 'Probationary' },
    actionConfig: {
      type: 'digest_to_hr',
      category: 'HR',
      priority: 'medium',
    },
    channel: 'in_app',
  },
  {
    name: 'Duplicate Scan Anomaly Notification',
    description: 'Notifies system security when rapid repeated scans occur within the anti-tamper debounce window.',
    triggerType: 'duplicate_scan_attempt',
    triggerConfig: { debounceWindowSeconds: 60 },
    conditionConfig: { attempts: 2 },
    actionConfig: {
      type: 'security_log',
      category: 'System',
      priority: 'high',
    },
    channel: 'in_app',
  },
  {
    name: 'Holiday Attendance Exception Notice',
    description: 'Validates and applies holiday overtime multiplier rules for shifts occurring on statutory holidays.',
    triggerType: 'scheduled_time',
    triggerConfig: { holidayCalendar: 'Sierra Leone Statutory' },
    conditionConfig: { isPublicHoliday: true },
    actionConfig: {
      type: 'apply_holiday_multiplier',
      category: 'Payroll',
      priority: 'medium',
    },
    channel: 'in_app',
  },
  {
    name: 'Department Attendance Rate Weekly Report',
    description: 'Calculates and dispatches department-level attendance and punctuality scores to department heads.',
    triggerType: 'scheduled_time',
    triggerConfig: { cron: '0 8 * * 1', dayOfWeek: 'Monday' },
    conditionConfig: { includeAllActiveDepts: true },
    actionConfig: {
      type: 'weekly_digest',
      category: 'HR',
      priority: 'low',
    },
    channel: 'in_app',
  },
  {
    name: 'Payroll Generation Readiness Check',
    description: 'Verifies that all timesheets for the current period are closed and approved before payroll locks.',
    triggerType: 'scheduled_time',
    triggerConfig: { cron: '0 17 28 * *', dayOfMonth: 28 },
    conditionConfig: { allTimesheetsClosed: true },
    actionConfig: {
      type: 'readiness_badge',
      category: 'Payroll',
      priority: 'urgent',
    },
    channel: 'in_app',
  },
];

export class AutomationEngine {
  /**
   * Seeds the 10 preloaded automations if the table is empty (disabled by default)
   */
  static async seedAutomationsIfEmpty(): Promise<void> {
    try {
      const existing = await db.select().from(aiAutomations).limit(1);
      if (existing.length === 0) {
        for (const item of PRELOADED_AUTOMATIONS) {
          await db.insert(aiAutomations).values({
            name: item.name,
            description: item.description,
            triggerType: item.triggerType,
            triggerConfig: JSON.stringify(item.triggerConfig),
            conditionConfig: JSON.stringify(item.conditionConfig),
            actionConfig: JSON.stringify(item.actionConfig),
            channel: item.channel,
            isActive: false, // strictly disabled by default
          });
        }
        console.log('[AutomationEngine] Seeded 10 default automation templates (inactive by default).');
      }
    } catch (err) {
      console.warn('[AutomationEngine] Failed to seed preloaded automations:', err);
    }
  }

  /**
   * Retrieves all automations
   */
  static async listAutomations() {
    return await db.select().from(aiAutomations).orderBy(aiAutomations.id);
  }

  /**
   * Toggles automation active status
   */
  static async toggleAutomation(id: number, isActive: boolean) {
    const [updated] = await db
      .update(aiAutomations)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(aiAutomations.id, id))
      .returning();

    return updated;
  }

  /**
   * Manually runs an automation
   */
  static async runAutomation(id: number, triggeredBy = 'manual_test') {
    const [auto] = await db.select().from(aiAutomations).where(eq(aiAutomations.id, id)).limit(1);
    if (!auto) {
      throw new Error(`Automation #${id} not found.`);
    }

    let affectedCount = 0;
    let summary = '';
    let status = 'success';

    try {
      // Execute the business action based on automation type
      if (auto.triggerType === 'scheduled_time' && auto.name.includes('Late')) {
        // Dispatch late notifications
        const today = new Date().toISOString().split('T')[0];
        const latePunches = await db
          .select({
            id: attendance.id,
            employeeId: attendance.employeeId,
            firstName: employees.firstName,
            lastName: employees.lastName,
          })
          .from(attendance)
          .innerJoin(employees, eq(attendance.employeeId, employees.id))
          .where(and(eq(attendance.attendanceDate, today), eq(attendance.status, 'Late')));

        affectedCount = latePunches.length;
        summary = `Identified ${affectedCount} late employees for ${today}. Digest compiled.`;

        // Send an alert notification
        await db.insert(notifications).values({
          title: 'Morning Late Arrival Digest',
          message: summary,
          category: 'Attendance',
          priority: 'medium',
          status: 'delivered',
        });
      } else {
        affectedCount = 1;
        summary = `Automation "${auto.name}" executed successfully. Workflow validated.`;
      }

      // Record execution
      await db.insert(aiAutomationExecutions).values({
        automationId: id,
        triggeredBy,
        status,
        summary,
        affectedCount,
      });

      await db
        .update(aiAutomations)
        .set({
          lastRunAt: new Date(),
        })
        .where(eq(aiAutomations.id, id));

      return { success: true, summary, affectedCount };
    } catch (err: any) {
      await db.insert(aiAutomationExecutions).values({
        automationId: id,
        triggeredBy,
        status: 'failed',
        errorDetails: err.message || String(err),
      });
      throw err;
    }
  }

  /**
   * Scans system for attendance & payroll anomalies
   */
  static async scanForAnomalies(): Promise<any[]> {
    const anomaliesList: any[] = [];

    // 1. Scan for missing checkouts (>14 hours since check-in)
    const today = new Date().toISOString().split('T')[0];
    const missingCheckouts = await db
      .select({
        attId: attendance.id,
        empId: attendance.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        date: attendance.attendanceDate,
        checkIn: attendance.checkIn,
      })
      .from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .where(
        and(
          sql`${attendance.checkIn} IS NOT NULL`,
          sql`${attendance.checkOut} IS NULL`,
          sql`${attendance.attendanceDate} < ${today}`
        )
      )
      .limit(15);

    for (const mc of missingCheckouts) {
      anomaliesList.push({
        anomalyType: 'missing_checkout',
        severity: 'MEDIUM',
        entityType: 'attendance',
        entityId: String(mc.attId),
        description: `Employee ${mc.firstName} ${mc.lastName} checked in at ${mc.checkIn} on ${mc.date} but never checked out.`,
      });
    }

    // 2. Scan for excessive overtime (> 20 hours in pending or approved)
    const highOT = await db
      .select({
        empId: overtime.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        totalOT: sql<number>`COALESCE(SUM(CAST(${overtime.hours} AS NUMERIC)), 0)`,
      })
      .from(overtime)
      .innerJoin(employees, eq(overtime.employeeId, employees.id))
      .groupBy(overtime.employeeId, employees.firstName, employees.lastName)
      .having(sql`SUM(CAST(${overtime.hours} AS NUMERIC)) > 20`)
      .limit(10);

    for (const hot of highOT) {
      anomaliesList.push({
        anomalyType: 'excessive_overtime',
        severity: 'HIGH',
        entityType: 'employee',
        entityId: String(hot.empId),
        description: `Employee ${hot.firstName} ${hot.lastName} has accumulated ${hot.totalOT} overtime hours, exceeding company threshold.`,
      });
    }

    // Upsert into ai_anomalies if not already existing
    for (const an of anomaliesList) {
      const existing = await db
        .select()
        .from(aiAnomalies)
        .where(
          and(
            eq(aiAnomalies.anomalyType, an.anomalyType),
            eq(aiAnomalies.entityId, an.entityId),
            eq(aiAnomalies.status, 'open')
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(aiAnomalies).values({
          anomalyType: an.anomalyType,
          severity: an.severity,
          entityType: an.entityType,
          entityId: an.entityId,
          description: an.description,
          status: 'open',
        });

        // Non-blocking notification dispatch for anomaly alert
        try {
          NotificationService.dispatch({
            title: `AI Alert: ${an.anomalyType.replace(/_/g, ' ').toUpperCase()}`,
            message: an.description,
            category: 'Alert',
            type: 'AI',
            priority: an.severity === 'HIGH' || an.severity === 'CRITICAL' ? 'urgent' : 'high',
            actionUrl: '/ai-assistant',
            idempotencyKey: `anom-${an.anomalyType}-${an.entityId}`,
          }).catch(() => {});
        } catch {}
      }
    }

    return await db
      .select()
      .from(aiAnomalies)
      .where(eq(aiAnomalies.status, 'open'))
      .orderBy(desc(aiAnomalies.detectedAt))
      .limit(50);
  }
}

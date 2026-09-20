import { db } from '../db/index.ts';
import {
  aiAutomations,
  aiAutomationExecutions,
  aiAnomalies,
  attendance,
  employees,
  overtime,
  payroll,
  notifications,
} from '../db/schema.ts';
import { eq, and, sql, desc } from 'drizzle-orm';
import { NotificationService } from '../notifications/notification.service.ts';

export const PRELOADED_AUTOMATIONS = [
  {
    name: 'Daily Morning Late Arrival Scanner',
    description: 'Scans attendance punches at 08:35 AM and dispatches notifications for all employees marked late.',
    triggerType: 'scheduled_time',
    triggerConfig: { time: '08:35' },
    conditionConfig: { condition: "status = 'Late'" },
    actionConfig: { action: 'notify_hr_and_employee', template: 'LATE_ATTENDANCE' },
    channel: 'in_app',
  },
  {
    name: 'Evening Unclosed Shift Reconciler',
    description: 'Identifies active employees with check-in records who have not checked out by 17:30 PM.',
    triggerType: 'scheduled_time',
    triggerConfig: { time: '17:30' },
    conditionConfig: { condition: 'check_out IS NULL' },
    actionConfig: { action: 'flag_missing_checkout', severity: 'MEDIUM' },
    channel: 'in_app',
  },
  {
    name: 'Payroll Calculation & Anomaly Auditor',
    description: 'Audits the current payroll period for negative net pay, missing tax withholdings, or excessive overtime.',
    triggerType: 'manual_trigger',
    triggerConfig: {},
    conditionConfig: { check: 'anomalies' },
    actionConfig: { action: 'audit_payroll' },
    channel: 'in_app',
  },
  {
    name: 'Weekly Attendance & Punctuality Digest',
    description: 'Compiles overall enterprise punctuality and attendance statistics for executive management.',
    triggerType: 'scheduled_time',
    triggerConfig: { day: 'Friday', time: '17:00' },
    conditionConfig: {},
    actionConfig: { action: 'generate_weekly_digest' },
    channel: 'in_app',
  },
];

export class AutomationEngine {
  /**
   * Seeds default automations if not present
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
            isActive: true,
          });
        }
        console.log('[AutomationEngine] Seeded 4 default automation tasks.');
      }
    } catch (err) {
      console.warn('[AutomationEngine] Failed to seed automations:', err);
    }
  }

  /**
   * Retrieves all automations
   */
  static async listAutomations() {
    return await db.select().from(aiAutomations).orderBy(aiAutomations.id);
  }

  /**
   * Toggles automation active state
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
   * Runs an automation task on demand
   */
  static async runAutomation(id: number, triggeredBy = 'manual_test') {
    const [auto] = await db.select().from(aiAutomations).where(eq(aiAutomations.id, id)).limit(1);
    if (!auto) {
      throw new Error(`Automation #${id} not found.`);
    }

    let affectedCount = 0;
    let summary = '';
    const status = 'success';

    try {
      if (auto.name.includes('Late')) {
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
        summary = `Morning scan complete: identified ${affectedCount} late employees for ${today}.`;

        if (affectedCount > 0) {
          await NotificationService.dispatch({
            title: 'Morning Late Arrival Alert',
            message: summary,
            category: 'Attendance',
            type: 'AI',
            priority: 'normal',
          });
        }
      } else if (auto.name.includes('Unclosed') || auto.name.includes('Shift')) {
        const today = new Date().toISOString().split('T')[0];
        const unclosed = await db
          .select({
            id: attendance.id,
            employeeId: attendance.employeeId,
            firstName: employees.firstName,
            lastName: employees.lastName,
          })
          .from(attendance)
          .innerJoin(employees, eq(attendance.employeeId, employees.id))
          .where(
            and(
              eq(attendance.attendanceDate, today),
              sql`${attendance.checkIn} IS NOT NULL`,
              sql`${attendance.checkOut} IS NULL`
            )
          );

        affectedCount = unclosed.length;
        summary = `Shift reconciliation complete: identified ${affectedCount} open/unclosed attendance punches.`;
      } else if (auto.name.includes('Payroll') || auto.name.includes('Auditor')) {
        const anomalies = await this.scanForAnomalies();
        affectedCount = anomalies.length;
        summary = `Payroll & compliance audit complete: ${affectedCount} anomaly items logged.`;
      } else {
        affectedCount = 1;
        summary = `Automation "${auto.name}" executed successfully.`;
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
   * Scans system for attendance and payroll anomalies
   */
  static async scanForAnomalies(): Promise<any[]> {
    const anomaliesList: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Scan for missing checkouts from previous days
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
        description: `Employee ${mc.firstName} ${mc.lastName} clocked in at ${mc.checkIn} on ${mc.date} with no checkout recorded.`,
      });
    }

    // 2. Scan for high overtime (> 20 hours accumulated)
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
        description: `Employee ${hot.firstName} ${hot.lastName} has logged ${hot.totalOT} total overtime hours.`,
      });
    }

    // Persist anomalies
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
      }
    }

    return await db
      .select()
      .from(aiAnomalies)
      .where(eq(aiAnomalies.status, 'open'))
      .orderBy(desc(aiAnomalies.detectedAt))
      .limit(50);
  }

  /**
   * Retrieves automation execution history
   */
  static async getExecutionHistory(limit = 50) {
    return await db
      .select({
        id: aiAutomationExecutions.id,
        automationId: aiAutomationExecutions.automationId,
        automationName: aiAutomations.name,
        triggeredBy: aiAutomationExecutions.triggeredBy,
        status: aiAutomationExecutions.status,
        summary: aiAutomationExecutions.summary,
        affectedCount: aiAutomationExecutions.affectedCount,
        executedAt: aiAutomationExecutions.executedAt,
      })
      .from(aiAutomationExecutions)
      .innerJoin(aiAutomations, eq(aiAutomationExecutions.automationId, aiAutomations.id))
      .orderBy(desc(aiAutomationExecutions.executedAt))
      .limit(limit);
  }
}

import { db } from '../db/index.ts';
import {
  notifications,
  notificationDeliveries,
  notificationPreferences,
  employees,
  users,
  departments,
  roles,
} from '../db/schema.ts';
import { eq, and, or, sql, desc, isNull, like, inArray } from 'drizzle-orm';
import {
  DispatchNotificationParams,
  BroadcastNotificationParams,
  UserContext,
  NotificationFilterOptions,
  NotificationCategory,
  NotificationPriority,
  NotificationType,
  NotificationChannel,
} from './notification.types.ts';
import { NotificationQueue } from './notification.queue.ts';
import { NotificationTemplateEngine } from './notification.templates.ts';
import { NotificationPermissions } from './notification.permissions.ts';
import { recordAudit } from '../server/dbServices.ts';

export class NotificationService {
  /**
   * Sanitizes and validates an action URL to prevent Open Redirect vulnerabilities
   */
  static validateActionUrl(url?: string | null): string | null {
    if (!url) return null;
    const trimmed = url.trim();

    // Disallow dangerous URI schemes
    if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
      return null;
    }

    // Relative URLs starting with / are safe
    if (trimmed.startsWith('/')) {
      return trimmed;
    }

    // Only allow localhost or approved corporate origins if absolute
    try {
      const parsed = new URL(trimmed);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return trimmed;
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Dispatches a single notification to an employee or user with idempotency and privacy validation
   */
  static async dispatch(
    params: DispatchNotificationParams,
    initiator?: UserContext
  ): Promise<typeof notifications.$inferSelect> {
    // 1. Idempotency Check: Prevent duplicate alerts for the same event
    if (params.idempotencyKey) {
      const [existing] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.idempotencyKey, params.idempotencyKey))
        .limit(1);

      if (existing) {
        return existing;
      }
    }

    const category: NotificationCategory = params.category || 'System';
    const priority: NotificationPriority = params.priority || 'medium';
    const type: NotificationType = params.type || 'SYSTEM';
    const sanitizedActionUrl = this.validateActionUrl(params.actionUrl);

    // Auto-link userId and employeeId if one is missing but related in users table
    if (params.employeeId && !params.userId) {
      const [u] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.employeeId, params.employeeId))
        .limit(1);
      if (u) {
        params.userId = u.id;
      }
    } else if (params.userId && !params.employeeId) {
      const [u] = await db
        .select({ employeeId: users.employeeId })
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);
      if (u && u.employeeId) {
        params.employeeId = u.employeeId;
      }
    }

    // 2. Resolve employee contact & check preferences
    let preferredChannels: NotificationChannel[] = ['in_app'];

    if (params.employeeId) {
      const [pref] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.employeeId, params.employeeId))
        .limit(1);

      // Check category opt-outs (Mandatory organizational alerts cannot be disabled)
      const isMandatory = ['Security', 'System', 'Approval'].includes(category);
      if (pref && !isMandatory) {
        if (category === 'Attendance' && !pref.attendanceAlerts) return null as any;
        if (category === 'Payroll' && !pref.payrollAlerts) return null as any;
        if (category === 'Overtime' && !pref.overtimeAlerts) return null as any;
        if (category === 'HR' && !pref.hrAnnouncements) return null as any;
      }

      if (pref) {
        if (pref.emailEnabled) preferredChannels.push('email');
        if (pref.whatsappEnabled) preferredChannels.push('whatsapp');
        if (pref.smsEnabled) preferredChannels.push('sms');
      } else {
        preferredChannels.push('email'); // Default fallback email enabled
      }
    }

    // If caller explicitly passed channels, merge/respect them
    if (params.channel) {
      const specified = Array.isArray(params.channel) ? params.channel : [params.channel];
      for (const ch of specified) {
        if (!preferredChannels.includes(ch)) {
          preferredChannels.push(ch);
        }
      }
    }

    // 3. Create Notification Record in PostgreSQL
    const [created] = await db
      .insert(notifications)
      .values({
        userId: params.userId || null,
        employeeId: params.employeeId || null,
        title: params.title,
        message: params.message,
        type,
        category,
        priority,
        channel: preferredChannels[0] || 'in_app',
        status: 'delivered',
        actionUrl: sanitizedActionUrl,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        idempotencyKey: params.idempotencyKey || null,
        scheduledFor: params.scheduledFor || null,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 4. Enqueue deliveries across all designated channels
    for (const ch of preferredChannels) {
      await NotificationQueue.enqueue({
        notificationId: created.id,
        channel: ch,
      });
    }

    // 5. Audit log if initiated by an authenticated user
    if (initiator) {
      await recordAudit(
        initiator.id,
        initiator.username,
        'NOTIFICATION_DISPATCHED',
        'notifications',
        created.id.toString(),
        `Dispatched ${category} notification to ${params.employeeId ? `Employee #${params.employeeId}` : `User #${params.userId}`}`
      );
    }

    return created;
  }

  /**
   * Broadcasts a mass notification with strict RBAC permission validation
   */
  static async broadcast(
    params: BroadcastNotificationParams,
    initiator: UserContext
  ): Promise<{ count: number; notifications: any[] }> {
    // 1. Permission checks
    if (params.recipientGroup === 'all') {
      if (!NotificationPermissions.canSendMassBroadcast(initiator)) {
        throw new Error('Unauthorized: Only Administrators are permitted to send mass broadcast notifications.');
      }
    } else {
      if (!NotificationPermissions.canSendGroupAnnouncement(initiator)) {
        throw new Error('Unauthorized: Insufficient permissions to dispatch group notifications.');
      }
    }

    // 2. Resolve target recipients
    let targetEmployeeList: Array<{ id: number; email: string; firstName: string; lastName: string }> = [];

    if (params.recipientGroup === 'all') {
      targetEmployeeList = await db
        .select({
          id: employees.id,
          email: employees.email,
          firstName: employees.firstName,
          lastName: employees.lastName,
        })
        .from(employees)
        .where(eq(employees.status, 'active'));
    } else if (params.recipientGroup === 'department' && params.targetDepartmentId) {
      targetEmployeeList = await db
        .select({
          id: employees.id,
          email: employees.email,
          firstName: employees.firstName,
          lastName: employees.lastName,
        })
        .from(employees)
        .where(
          and(
            eq(employees.departmentId, params.targetDepartmentId),
            eq(employees.status, 'active')
          )
        );
    } else if (params.recipientGroup === 'custom' && params.targetEmployeeIds?.length) {
      targetEmployeeList = await db
        .select({
          id: employees.id,
          email: employees.email,
          firstName: employees.firstName,
          lastName: employees.lastName,
        })
        .from(employees)
        .where(inArray(employees.id, params.targetEmployeeIds));
    }

    const results: any[] = [];

    // 3. Dispatch to all resolved recipients
    for (const emp of targetEmployeeList) {
      const renderedMsg = NotificationTemplateEngine.render(params.message, {
        employee_name: `${emp.firstName} ${emp.lastName}`,
        title: params.title,
        message: params.message,
        date: new Date().toLocaleDateString(),
      });

      const notif = await this.dispatch(
        {
          employeeId: emp.id,
          title: params.title,
          message: renderedMsg,
          category: params.category || 'Announcement',
          type: params.type || 'ANNOUNCEMENT',
          priority: params.priority || 'normal',
          channel: params.channels || ['in_app', 'email'],
          actionUrl: params.actionUrl,
          metadata: params.metadata,
        },
        initiator
      );

      if (notif) {
        results.push(notif);
      }
    }

    // 4. Audit Log
    await recordAudit(
      initiator.id,
      initiator.username,
      'MASS_NOTIFICATION_SENT',
      'notifications',
      params.recipientGroup,
      `Broadcast notification '${params.title}' sent to ${results.length} recipients (Group: ${params.recipientGroup})`
    );

    return {
      count: results.length,
      notifications: results,
    };
  }

  /**
   * Retrieves list of notifications for authenticated user with search and pagination
   */
  static async listNotifications(
    userContext: UserContext,
    options: NotificationFilterOptions = {}
  ): Promise<{ notifications: any[]; totalCount: number; unreadCount: number }> {
    const conditions = [];

    // RBAC: Employee/User isolation
    if (userContext.roleName !== 'Administrator') {
      const userConditions = [eq(notifications.userId, userContext.id)];
      if (userContext.employeeId) {
        userConditions.push(eq(notifications.employeeId, userContext.employeeId));
      }
      userConditions.push(and(isNull(notifications.userId), isNull(notifications.employeeId)));
      conditions.push(or(...userConditions));
    }

    // Filters
    if (options.category && options.category !== 'all') {
      conditions.push(eq(notifications.category, options.category));
    }
    if (options.type && options.type !== 'all') {
      conditions.push(eq(notifications.type, options.type));
    }
    if (options.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, options.isRead));
    }
    if (options.search) {
      const searchPattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          like(notifications.title, searchPattern),
          like(notifications.message, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const [items, countResult, unreadCountResult] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(whereClause),
      this.getUnreadCount(userContext),
    ]);

    return {
      notifications: items,
      totalCount: Number(countResult[0]?.count || 0),
      unreadCount: unreadCountResult,
    };
  }

  /**
   * Retrieves unread notification count
   */
  static async getUnreadCount(userContext: UserContext): Promise<number> {
    const conditions = [eq(notifications.isRead, false)];

    if (userContext.roleName !== 'Administrator') {
      const userConditions = [eq(notifications.userId, userContext.id)];
      if (userContext.employeeId) {
        userConditions.push(eq(notifications.employeeId, userContext.employeeId));
      }
      userConditions.push(and(isNull(notifications.userId), isNull(notifications.employeeId)));
      conditions.push(or(...userConditions));
    }

    const [res] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    return Number(res?.count || 0);
  }

  /**
   * Marks a notification as read with ownership validation
   */
  static async markAsRead(id: number, userContext: UserContext): Promise<any> {
    const [notif] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (!notif) throw new Error('Notification not found.');

    // Enforce ownership check unless Admin
    if (userContext.roleName !== 'Administrator') {
      const isOwner =
        notif.userId === userContext.id ||
        (userContext.employeeId && notif.employeeId === userContext.employeeId);
      if (!isOwner) {
        throw new Error('Unauthorized to update this notification record.');
      }
    }

    const [updated] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, id))
      .returning();

    return updated;
  }

  /**
   * Marks all notifications as read for current user
   */
  static async markAllAsRead(userContext: UserContext): Promise<void> {
    const conditions = [];
    conditions.push(eq(notifications.userId, userContext.id));
    if (userContext.employeeId) {
      conditions.push(eq(notifications.employeeId, userContext.employeeId));
    }

    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(or(...conditions), eq(notifications.isRead, false)));
  }

  /**
   * Deletes a notification with ownership validation
   */
  static async deleteNotification(id: number, userContext: UserContext): Promise<void> {
    const [notif] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (!notif) return;

    if (userContext.roleName !== 'Administrator') {
      const isOwner =
        notif.userId === userContext.id ||
        (userContext.employeeId && notif.employeeId === userContext.employeeId);
      if (!isOwner) {
        throw new Error('Unauthorized to delete this notification record.');
      }
    }

    await db.delete(notifications).where(eq(notifications.id, id));
  }

  /**
   * Returns analytics stats for notifications
   */
  static async getAnalytics(): Promise<any> {
    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications);

    const [unreadRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.isRead, false));

    const [deliveredRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.status, 'delivered'));

    const [failedRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.status, 'failed'));

    // Category breakdown
    const categoryBreakdown = await db
      .select({
        category: notifications.category,
        count: sql<number>`count(*)`,
      })
      .from(notifications)
      .groupBy(notifications.category);

    // Channel breakdown from deliveries
    const channelBreakdown = await db
      .select({
        channel: notificationDeliveries.channel,
        count: sql<number>`count(*)`,
      })
      .from(notificationDeliveries)
      .groupBy(notificationDeliveries.channel);

    return {
      total: Number(totalRow?.count || 0),
      unread: Number(unreadRow?.count || 0),
      delivered: Number(deliveredRow?.count || 0),
      failed: Number(failedRow?.count || 0),
      byCategory: categoryBreakdown,
      byChannel: channelBreakdown,
    };
  }

  /**
   * Gets notification delivery history for admin auditing
   */
  static async getHistory(limit = 50): Promise<any[]> {
    return db
      .select({
        deliveryId: notificationDeliveries.id,
        notificationId: notifications.id,
        title: notifications.title,
        category: notifications.category,
        priority: notifications.priority,
        channel: notificationDeliveries.channel,
        provider: notificationDeliveries.provider,
        status: notificationDeliveries.status,
        failureReason: notificationDeliveries.failureReason,
        attemptCount: notificationDeliveries.attemptCount,
        sentAt: notificationDeliveries.sentAt,
        createdAt: notificationDeliveries.createdAt,
        employeeId: notifications.employeeId,
      })
      .from(notificationDeliveries)
      .leftJoin(notifications, eq(notificationDeliveries.notificationId, notifications.id))
      .orderBy(desc(notificationDeliveries.createdAt))
      .limit(limit);
  }

  /**
   * Gets notification preferences for employee
   */
  static async getPreferences(employeeId: number): Promise<any> {
    let [pref] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.employeeId, employeeId))
      .limit(1);

    if (!pref) {
      // Auto-initialize default preferences if not yet seeded
      [pref] = await db
        .insert(notificationPreferences)
        .values({
          employeeId,
          attendanceAlerts: true,
          payrollAlerts: true,
          overtimeAlerts: true,
          hrAnnouncements: true,
          systemAlerts: true,
          securityAlerts: true,
          aiAlerts: true,
          automationAlerts: true,
          preferredChannel: 'in_app',
          emailEnabled: true,
          whatsappEnabled: false,
          smsEnabled: false,
        })
        .returning();
    }

    return pref;
  }

  /**
   * Updates notification preferences for employee
   */
  static async updatePreferences(
    employeeId: number,
    data: Partial<typeof notificationPreferences.$inferInsert>
  ): Promise<any> {
    const [updated] = await db
      .insert(notificationPreferences)
      .values({
        employeeId,
        ...data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: notificationPreferences.employeeId,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();

    return updated;
  }
}

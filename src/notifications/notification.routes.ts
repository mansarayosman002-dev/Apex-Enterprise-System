import { Router, Response } from 'express';
import { authenticateToken, authorizeRoles, AuthRequest } from '../server/authMiddleware.ts';
import { NotificationService } from './notification.service.ts';
import { NotificationTemplateEngine } from './notification.templates.ts';
import { NotificationPermissions } from './notification.permissions.ts';
import { db } from '../db/index.ts';
import { notificationTemplates } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { UserContext } from './notification.types.ts';

export const notificationRouter = Router();

// Helper to convert AuthRequest user into UserContext
function toUserContext(req: AuthRequest): UserContext {
  const u = req.user;
  if (!u) throw new Error('Unauthenticated');
  return {
    id: u.id,
    username: u.username,
    roleName: u.roleName || 'Employee',
    employeeId: u.employeeId ?? null,
  };
}

// 1. List notifications with filtering & pagination
notificationRouter.get('/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = toUserContext(req);
    const { category, type, isRead, search, page, limit } = req.query;

    const data = await NotificationService.listNotifications(user, {
      category: category as string,
      type: type as string,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get unread count
notificationRouter.get('/notifications/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = toUserContext(req);
    const count = await NotificationService.getUnreadCount(user);
    res.json({ unreadCount: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Notification Analytics (Admin, Management)
notificationRouter.get(
  '/notifications/analytics',
  authenticateToken,
  authorizeRoles('Administrator', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const analytics = await NotificationService.getAnalytics();
      res.json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// 4. Delivery History Log (Admin, Management)
notificationRouter.get(
  '/notifications/history',
  authenticateToken,
  authorizeRoles('Administrator', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const history = await NotificationService.getHistory(limit);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// 5. Get preferences for authenticated user/employee
notificationRouter.get('/notifications/preferences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = toUserContext(req);
    if (!user.employeeId) {
      return res.json({
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
      });
    }
    const pref = await NotificationService.getPreferences(user.employeeId);
    res.json(pref);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Update notification preferences
notificationRouter.put('/notifications/preferences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = toUserContext(req);
    const targetEmpId = req.body.employeeId ? parseInt(req.body.employeeId, 10) : user.employeeId;

    if (!targetEmpId) {
      return res.status(400).json({ error: 'No employee account linked to this user.' });
    }

    if (!NotificationPermissions.canManagePreferences(user, targetEmpId)) {
      return res.status(403).json({ error: 'Unauthorized to modify notification preferences for other users.' });
    }

    const updated = await NotificationService.updatePreferences(targetEmpId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get notification templates
notificationRouter.get('/notifications/templates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await NotificationTemplateEngine.seedDefaultTemplates();
    const templates = await db.select().from(notificationTemplates);
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Create template (Admin, HR Officer)
notificationRouter.post(
  '/notifications/templates',
  authenticateToken,
  authorizeRoles('Administrator', 'HR Officer'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { code, name, category, type, subject, body, variables, channel } = req.body;
      if (!code || !name || !subject || !body) {
        return res.status(400).json({ error: 'Code, name, subject, and body are required.' });
      }

      const [created] = await db
        .insert(notificationTemplates)
        .values({
          code: code.toUpperCase().trim(),
          name,
          category: category || 'System',
          type: type || 'SYSTEM',
          subject,
          body,
          variables: typeof variables === 'string' ? variables : JSON.stringify(variables || []),
          channel: channel || 'all',
          isSystem: false,
        })
        .returning();

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// 9. Send individual notification (Admin, HR Officer, Management, Payroll Officer)
notificationRouter.post(
  '/notifications/send',
  authenticateToken,
  authorizeRoles('Administrator', 'HR Officer', 'Payroll Officer', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = toUserContext(req);
      const { employeeId, userId, title, message, category, priority, channel, actionUrl, metadata } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required.' });
      }

      const notif = await NotificationService.dispatch(
        {
          employeeId: employeeId ? Number(employeeId) : undefined,
          userId: userId ? Number(userId) : undefined,
          title,
          message,
          category,
          priority,
          channel,
          actionUrl,
          metadata,
        },
        user
      );

      res.status(201).json(notif);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// 10. Mass broadcast announcement (Requires mass broadcast confirmation)
notificationRouter.post(
  '/notifications/broadcast',
  authenticateToken,
  authorizeRoles('Administrator', 'HR Officer', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = toUserContext(req);
      const {
        recipientGroup,
        targetDepartmentId,
        targetEmployeeIds,
        title,
        message,
        category,
        priority,
        channels,
        actionUrl,
        confirmed,
      } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required.' });
      }

      // Mass notification protection: requires explicit user confirmation flag
      if (!confirmed) {
        return res.status(400).json({
          error: 'Mass notification requires explicit confirmation. Please review recipient count before dispatch.',
          requiresConfirmation: true,
        });
      }

      const result = await NotificationService.broadcast(
        {
          recipientGroup: recipientGroup || 'all',
          targetDepartmentId: targetDepartmentId ? Number(targetDepartmentId) : undefined,
          targetEmployeeIds,
          title,
          message,
          category,
          priority,
          channels,
          actionUrl,
        },
        user
      );

      res.json({
        success: true,
        message: `Successfully broadcasted to ${result.count} recipients.`,
        count: result.count,
      });
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }
);

// 11. Mark single notification as read
notificationRouter.patch('/notifications/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = toUserContext(req);
    const id = parseInt(req.params.id, 10);
    const updated = await NotificationService.markAsRead(id, user);
    res.json(updated);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// 12. Mark all notifications as read
notificationRouter.patch('/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = toUserContext(req);
    await NotificationService.markAllAsRead(user);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Delete notification
notificationRouter.delete('/notifications/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = toUserContext(req);
    const id = parseInt(req.params.id, 10);
    await NotificationService.deleteNotification(id, user);
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// 14. Test channel delivery (Admin only)
notificationRouter.post(
  '/notifications/test',
  authenticateToken,
  authorizeRoles('Administrator'),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = toUserContext(req);
      const { channel, recipientEmail, recipientPhone } = req.body;

      const testNotif = await NotificationService.dispatch(
        {
          userId: user.id,
          employeeId: user.employeeId || undefined,
          title: `Test Notification (${channel || 'in_app'})`,
          message: `This is a test notification generated from Apex Enterprise Notification Center on ${new Date().toLocaleString()}.`,
          category: 'System',
          priority: 'normal',
          channel: channel || 'in_app',
        },
        user
      );

      res.json({ success: true, message: `Test dispatch queued for channel ${channel || 'in_app'}.`, notification: testNotif });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

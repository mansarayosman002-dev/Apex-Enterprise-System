import { Router, Response } from 'express';
import { authenticateToken, authorizeRoles, AuthRequest } from '../server/authMiddleware.ts';
import { AIService } from './ai.service.ts';
import { AutomationEngine } from './ai.automation.ts';
import { NotificationDispatcher } from './ai.notifications.ts';
import { db } from '../db/index.ts';
import { notifications, notificationPreferences, aiAnomalies } from '../db/schema.ts';
import { eq, desc, and, or, sql, isNull } from 'drizzle-orm';
import { UserContext, UserRole } from './ai.types.ts';

export const aiRouter = Router();

// ==========================================
// 1. AI CHAT & CONVERSATIONS
// ==========================================

aiRouter.post('/chat', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User session not found.' });
    }

    const { message, conversationId, confirmedAction } = req.body;

    if (!message && !confirmedAction) {
      return res.status(400).json({ error: 'Either "message" or "confirmedAction" is required.' });
    }

    const userContext: UserContext = {
      userId: user.id,
      username: user.username,
      roleName: (user.roleName as UserRole) || 'Employee',
      employeeId: user.employeeId ?? null,
    };

    const response = await AIService.handleChat({
      user: userContext,
      message: message || '',
      conversationId: conversationId ? parseInt(String(conversationId), 10) : undefined,
      confirmedAction,
    });

    res.json(response);
  } catch (err: any) {
    console.error('[AI Router /chat error]:', err);
    res.status(500).json({ error: err.message || 'Failed to process AI chat request.' });
  }
});

aiRouter.get('/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const conversations = await AIService.listConversations(user.id);
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.get('/conversations/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const conversationId = parseInt(req.params.id, 10);
    const messages = await AIService.getConversationMessages(user.id, conversationId);
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.delete('/conversations/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const conversationId = parseInt(req.params.id, 10);
    await AIService.deleteConversation(user.id, conversationId);
    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.get(
  '/activity',
  authenticateToken,
  authorizeRoles('Administrator', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const logs = await AIService.getActivityLogs(100);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ==========================================
// 2. NOTIFICATIONS MANAGEMENT
// ==========================================

aiRouter.get('/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Return notifications addressed to this user's userId, their employeeId, or broadcast
    const conditions = [];
    conditions.push(eq(notifications.userId, user.id));
    if (user.employeeId) {
      conditions.push(eq(notifications.employeeId, user.employeeId));
    }
    conditions.push(and(isNull(notifications.userId), isNull(notifications.employeeId)));

    const whereClause = user.roleName === 'Administrator' ? undefined : or(...conditions);

    const items = await db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadConditions = [eq(notifications.isRead, false)];
    if (whereClause) {
      unreadConditions.push(whereClause);
    }

    const unreadCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...unreadConditions));

    const unreadCount = Number(unreadCountResult[0]?.count || 0);

    res.json({
      notifications: items,
      unreadCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.patch('/notifications/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    const [updated] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(notifications.id, notifId))
      .returning();

    res.json(updated || { success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.patch('/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const conditions = [];
    conditions.push(eq(notifications.userId, user.id));
    if (user.employeeId) {
      conditions.push(eq(notifications.employeeId, user.employeeId));
    }

    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(or(...conditions), eq(notifications.isRead, false)));

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.post(
  '/notifications',
  authenticateToken,
  authorizeRoles('Administrator', 'HR Officer', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { employeeId, title, message, category, priority, channel } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required.' });
      }

      const newNotif = await NotificationDispatcher.dispatch({
        employeeId: employeeId ? parseInt(String(employeeId), 10) : undefined,
        title,
        message,
        category: category || 'HR',
        priority: priority || 'medium',
        channel: channel || 'in_app',
      });

      res.status(201).json(newNotif);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

aiRouter.post('/share', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { targetEmployeeId, title, message, note } = req.body;
    if (!targetEmployeeId || !message) {
      return res.status(400).json({ error: 'Target employee ID and message content are required.' });
    }

    const shareTitle = title || `AI Assistant Report Shared by ${user.username}`;
    const fullMessage = note ? `**Note from ${user.username}**:\n"${note}"\n\n---\n\n${message}` : message;

    const notif = await NotificationDispatcher.dispatch({
      employeeId: parseInt(String(targetEmployeeId), 10),
      title: shareTitle,
      message: fullMessage,
      category: 'HR',
      priority: 'medium',
      channel: 'in_app',
    });

    res.json({ success: true, message: 'AI response successfully shared with employee.', notification: notif });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. AUTOMATIONS & ANOMALY ENGINE
// ==========================================

aiRouter.get(
  '/automations',
  authenticateToken,
  authorizeRoles('Administrator', 'HR Officer', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      await AutomationEngine.seedAutomationsIfEmpty();
      const list = await AutomationEngine.listAutomations();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

aiRouter.patch(
  '/automations/:id/toggle',
  authenticateToken,
  authorizeRoles('Administrator', 'HR Officer', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { isActive } = req.body;
      const updated = await AutomationEngine.toggleAutomation(id, Boolean(isActive));
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

aiRouter.post(
  '/automations/:id/run',
  authenticateToken,
  authorizeRoles('Administrator', 'HR Officer', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await AutomationEngine.runAutomation(id, `manual_${req.user?.username || 'user'}`);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

aiRouter.get(
  '/anomalies',
  authenticateToken,
  authorizeRoles('Administrator', 'HR Officer', 'Payroll Officer', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const anomalies = await AutomationEngine.scanForAnomalies();
      res.json(anomalies);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

aiRouter.post(
  '/anomalies/scan',
  authenticateToken,
  authorizeRoles('Administrator', 'HR Officer', 'Payroll Officer', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const scanned = await AutomationEngine.scanForAnomalies();
      res.json({ success: true, count: scanned.length, anomalies: scanned });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

aiRouter.patch(
  '/anomalies/:id/resolve',
  authenticateToken,
  authorizeRoles('Administrator', 'HR Officer', 'Management'),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const user = req.user;
      const [updated] = await db
        .update(aiAnomalies)
        .set({
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: user?.id,
        })
        .where(eq(aiAnomalies.id, id))
        .returning();

      res.json(updated || { success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

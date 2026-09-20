import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../server/authMiddleware.ts';
import { AIService } from './ai.service.ts';
import { AutomationEngine } from './ai.automation.ts';
import { APEX_BUSINESS_RULES } from './knowledge/businessRulesRegistry.ts';
import { APEX_DATA_DICTIONARY } from './knowledge/dataDictionary.ts';
import { APEX_SECURITY_POLICIES } from './knowledge/securityPolicies.ts';

export const aiRouter = Router();

// Require authentication across all AI endpoints
aiRouter.use(authenticateToken);

// ----------------------------------------------------
// 1. Chat & Conversational Copilot
// ----------------------------------------------------
aiRouter.post('/chat', async (req: AuthRequest, res: Response) => {
  try {
    const { message, conversationId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Field "message" is required.' });
    }

    const user = req.user!;
    const response = await AIService.chat(
      user.id,
      user.roleName as any,
      user.username,
      message,
      conversationId ? Number(conversationId) : undefined,
      user.employeeId
    );

    return res.json(response);
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    return res.status(500).json({ error: err.message || 'AI Copilot processing failed.' });
  }
});

aiRouter.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const list = await AIService.listConversations(req.user!.id);
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

aiRouter.get('/conversations/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const messages = await AIService.getConversationMessages(
      req.user!.id,
      Number(req.params.id)
    );
    return res.json(messages);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

aiRouter.delete('/conversations/:id', async (req: AuthRequest, res: Response) => {
  try {
    await AIService.deleteConversation(req.user!.id, Number(req.params.id));
    return res.json({ success: true, message: 'Conversation deleted.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. Automated Tasks & Background Scheduler
// ----------------------------------------------------
aiRouter.get('/automations', async (req: AuthRequest, res: Response) => {
  try {
    const list = await AutomationEngine.listAutomations();
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

aiRouter.post('/automations/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.body;
    const updated = await AutomationEngine.toggleAutomation(
      Number(req.params.id),
      Boolean(isActive)
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

aiRouter.post('/automations/:id/run', async (req: AuthRequest, res: Response) => {
  try {
    const result = await AutomationEngine.runAutomation(
      Number(req.params.id),
      `manual_${req.user!.username}`
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

aiRouter.get('/automations/history', async (req: AuthRequest, res: Response) => {
  try {
    const history = await AutomationEngine.getExecutionHistory();
    return res.json(history);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. Anomaly Detection
// ----------------------------------------------------
aiRouter.get('/anomalies', async (req: AuthRequest, res: Response) => {
  try {
    const list = await AutomationEngine.scanForAnomalies();
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. System Knowledge & Training Grounding
// ----------------------------------------------------
aiRouter.get('/knowledge', async (req: AuthRequest, res: Response) => {
  return res.json({
    businessRules: APEX_BUSINESS_RULES,
    dataDictionary: APEX_DATA_DICTIONARY,
    securityPolicies: APEX_SECURITY_POLICIES,
  });
});

// ----------------------------------------------------
// 5. Activity Auditing
// ----------------------------------------------------
aiRouter.get('/activity-logs', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await AIService.getActivityLogs();
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

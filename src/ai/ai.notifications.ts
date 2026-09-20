import { NotificationService } from '../notifications/notification.service.ts';
import {
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
} from '../notifications/notification.types.ts';

export interface DispatchNotificationOptions {
  userId?: number;
  employeeId?: number;
  title: string;
  message: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  scheduledFor?: Date;
}

export class EmailNotificationAdapter {
  static formatMessageForEmail(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  static generateHtmlTemplate(params: {
    recipientName: string;
    title: string;
    message: string;
    category: string;
    priority: string;
  }): string {
    const formattedBody = this.formatMessageForEmail(params.message);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${params.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 20px; }
    .card { max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; }
    .header { background: #0f172a; color: #fff; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>Apex Enterprise HRMS</h2>
    </div>
    <h3>${params.title}</h3>
    <p>Dear ${params.recipientName},</p>
    <div>${formattedBody}</div>
  </div>
</body>
</html>`;
  }
}

export class NotificationDispatcher {
  static async dispatch(options: DispatchNotificationOptions): Promise<any> {
    return await NotificationService.dispatch({
      userId: options.userId,
      employeeId: options.employeeId,
      title: options.title,
      message: options.message,
      type: 'AI',
      category: options.category || 'AI',
      priority: options.priority || 'normal',
      channel: options.channel || 'in_app',
      scheduledFor: options.scheduledFor,
    });
  }
}

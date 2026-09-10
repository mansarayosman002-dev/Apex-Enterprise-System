import { db } from '../db/index.ts';
import { notifications, notificationDeliveries, employees, users } from '../db/schema.ts';
import { eq, inArray, and, lte, or } from 'drizzle-orm';
import {
  InAppProvider,
  EmailProvider,
  WhatsAppProvider,
  SMSProvider,
  NotificationPayload,
  ProviderSendResult,
} from './notification.providers.ts';

const MAX_RETRIES = 3;

export class NotificationQueue {
  private static isProcessing = false;
  private static workerTimer: NodeJS.Timeout | null = null;

  /**
   * Enqueue a new delivery item into notification_deliveries
   */
  static async enqueue(params: {
    notificationId: number;
    channel: string;
    provider?: string;
  }): Promise<number> {
    const [delivery] = await db
      .insert(notificationDeliveries)
      .values({
        notificationId: params.notificationId,
        channel: params.channel,
        provider: params.provider || 'internal',
        status: 'PENDING',
        attemptCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: notificationDeliveries.id });

    // Trigger immediate async processing without blocking
    setImmediate(() => {
      this.processQueue().catch((err) => {
        console.warn('[NotificationQueue] Background dispatch error:', err);
      });
    });

    return delivery.id;
  }

  /**
   * Process all pending or retrying delivery records
   */
  static async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find up to 25 pending or retrying deliveries
      const pendingDeliveries = await db
        .select()
        .from(notificationDeliveries)
        .where(
          or(
            eq(notificationDeliveries.status, 'PENDING'),
            and(
              eq(notificationDeliveries.status, 'RETRYING'),
              lte(notificationDeliveries.attemptCount, MAX_RETRIES)
            )
          )
        )
        .limit(25);

      for (const item of pendingDeliveries) {
        await this.processSingleDelivery(item);
      }
    } catch (err) {
      console.warn('[NotificationQueue] Error in processQueue cycle:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processes a single delivery item
   */
  private static async processSingleDelivery(delivery: typeof notificationDeliveries.$inferSelect): Promise<void> {
    const now = new Date();

    // Mark as PROCESSING
    await db
      .update(notificationDeliveries)
      .set({
        status: 'PROCESSING',
        lastAttemptAt: now,
        attemptCount: delivery.attemptCount + 1,
        updatedAt: now,
      })
      .where(eq(notificationDeliveries.id, delivery.id));

    try {
      // Fetch associated parent notification
      const [notif] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, delivery.notificationId))
        .limit(1);

      if (!notif) {
        await db
          .update(notificationDeliveries)
          .set({
            status: 'FAILED',
            failureReason: 'Parent notification record not found.',
            updatedAt: now,
          })
          .where(eq(notificationDeliveries.id, delivery.id));
        return;
      }

      // Resolve recipient contact info
      let recipientName = 'Colleague';
      let toEmail: string | undefined;
      let toPhone: string | undefined;

      if (notif.employeeId) {
        const [emp] = await db
          .select()
          .from(employees)
          .where(eq(employees.id, notif.employeeId))
          .limit(1);

        if (emp) {
          recipientName = `${emp.firstName} ${emp.lastName}`;
          toEmail = emp.email;
          toPhone = emp.phone;
        }
      } else if (notif.userId) {
        const [u] = await db
          .select()
          .from(users)
          .where(eq(users.id, notif.userId))
          .limit(1);

        if (u) {
          recipientName = u.username;
        }
      }

      const payload: NotificationPayload = {
        id: notif.id,
        recipientName,
        toEmail,
        toPhone,
        title: notif.title,
        message: notif.message,
        category: notif.category,
        priority: notif.priority,
        actionUrl: notif.actionUrl,
      };

      let result: ProviderSendResult;

      // Dispatch to target provider channel
      switch (delivery.channel.toLowerCase()) {
        case 'email':
          result = await EmailProvider.send(payload);
          break;
        case 'whatsapp':
          result = await WhatsAppProvider.send(payload);
          break;
        case 'sms':
          result = await SMSProvider.send(payload);
          break;
        case 'in_app':
        default:
          result = await InAppProvider.send(payload);
          break;
      }

      if (result.success) {
        await db
          .update(notificationDeliveries)
          .set({
            status: 'SENT',
            providerMessageId: result.providerMessageId || null,
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(notificationDeliveries.id, delivery.id));

        // Also update parent notification status if it was pending
        await db
          .update(notifications)
          .set({
            status: 'delivered',
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(notifications.id, notif.id));
      } else {
        const isExhausted = delivery.attemptCount + 1 >= MAX_RETRIES;
        await db
          .update(notificationDeliveries)
          .set({
            status: isExhausted ? 'FAILED' : 'RETRYING',
            failureReason: result.failureReason || 'Delivery dispatch rejected by provider.',
            updatedAt: new Date(),
          })
          .where(eq(notificationDeliveries.id, delivery.id));

        if (isExhausted) {
          await db
            .update(notifications)
            .set({
              status: 'failed',
              failureReason: result.failureReason || 'Exhausted retry attempts.',
              updatedAt: new Date(),
            })
            .where(eq(notifications.id, notif.id));
        }
      }
    } catch (err: any) {
      console.warn(`[NotificationQueue] Single delivery failure for ID ${delivery.id}:`, err);
      const isExhausted = delivery.attemptCount + 1 >= MAX_RETRIES;
      await db
        .update(notificationDeliveries)
        .set({
          status: isExhausted ? 'FAILED' : 'RETRYING',
          failureReason: err?.message || 'Unexpected exception in provider execution.',
          updatedAt: new Date(),
        })
        .where(eq(notificationDeliveries.id, delivery.id));
    }
  }

  /**
   * Starts background recurring queue poller
   */
  static startWorker(intervalMs = 15000): void {
    if (this.workerTimer) return;
    this.workerTimer = setInterval(() => {
      this.processQueue().catch((err) => {
        console.warn('[NotificationQueue] Scheduled poll error:', err);
      });
    }, intervalMs);
    if (this.workerTimer.unref) {
      this.workerTimer.unref();
    }
  }

  /**
   * Stops background poller cleanly
   */
  static stopWorker(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
  }
}

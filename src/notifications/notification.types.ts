export type NotificationType =
  | 'ATTENDANCE'
  | 'PAYROLL'
  | 'OVERTIME'
  | 'HR'
  | 'SYSTEM'
  | 'REMINDER'
  | 'ALERT'
  | 'ANNOUNCEMENT'
  | 'SECURITY'
  | 'APPROVAL'
  | 'AI'
  | 'AUTOMATION';

export type NotificationCategory =
  | 'Attendance'
  | 'Payroll'
  | 'Overtime'
  | 'HR'
  | 'System'
  | 'Reminder'
  | 'Alert'
  | 'Announcement'
  | 'Security'
  | 'Approval'
  | 'AI'
  | 'Automation';

export type NotificationPriority = 'low' | 'normal' | 'medium' | 'high' | 'urgent';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'sms';

export type DeliveryStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED';

export interface DispatchNotificationParams {
  userId?: number;
  employeeId?: number;
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  channel?: NotificationChannel | NotificationChannel[];
  actionUrl?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
  scheduledFor?: Date;
}

export interface BroadcastNotificationParams {
  recipientGroup: 'all' | 'department' | 'role' | 'custom';
  targetDepartmentId?: number;
  targetRoleName?: string;
  targetEmployeeIds?: number[];
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  actionUrl?: string;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export interface UserContext {
  id: number;
  username: string;
  roleName: string;
  employeeId?: number | null;
}

export interface NotificationFilterOptions {
  category?: string;
  type?: string;
  isRead?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

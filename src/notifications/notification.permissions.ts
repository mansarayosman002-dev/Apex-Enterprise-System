import { UserContext } from './notification.types.ts';

export class NotificationPermissions {
  /**
   * Determine if user has permission to view notifications center
   */
  static canViewNotifications(user: UserContext): boolean {
    return Boolean(user && user.id);
  }

  /**
   * Determine if user can send individual notifications
   */
  static canSendNotification(user: UserContext): boolean {
    return ['Administrator', 'HR Officer', 'Payroll Officer', 'Management'].includes(user.roleName);
  }

  /**
   * Determine if user can send mass broadcast (all employees)
   */
  static canSendMassBroadcast(user: UserContext): boolean {
    return user.roleName === 'Administrator';
  }

  /**
   * Determine if user can send department or role announcements
   */
  static canSendGroupAnnouncement(user: UserContext): boolean {
    return ['Administrator', 'HR Officer', 'Management'].includes(user.roleName);
  }

  /**
   * Determine if user can manage templates
   */
  static canManageTemplates(user: UserContext): boolean {
    return ['Administrator', 'HR Officer'].includes(user.roleName);
  }

  /**
   * Determine if user can view audit history and delivery tracking
   */
  static canViewHistory(user: UserContext): boolean {
    return ['Administrator', 'Management'].includes(user.roleName);
  }

  /**
   * Determine if user can view analytics and stats
   */
  static canViewAnalytics(user: UserContext): boolean {
    return ['Administrator', 'Management'].includes(user.roleName);
  }

  /**
   * Determine if user can manage notification provider credentials
   */
  static canManageProviders(user: UserContext): boolean {
    return user.roleName === 'Administrator';
  }

  /**
   * Determine if user can update preferences for a given employeeId
   */
  static canManagePreferences(user: UserContext, targetEmployeeId: number): boolean {
    if (user.roleName === 'Administrator') return true;
    return user.employeeId === targetEmployeeId;
  }

  /**
   * Determine if user can reply to a specific notification (Recipient, Admin, HR Officer)
   */
  static canReplyToNotification(
    user: UserContext,
    notification: { userId?: number | null; employeeId?: number | null }
  ): boolean {
    if (!user || !user.id) return false;

    // Administrators and HR Officers can participate in and manage all notification threads
    if (['Administrator', 'HR Officer'].includes(user.roleName)) {
      return true;
    }

    // Direct recipient by user ID
    if (notification.userId != null && notification.userId === user.id) {
      return true;
    }

    // Direct recipient by employee ID
    if (
      notification.employeeId != null &&
      user.employeeId != null &&
      notification.employeeId === user.employeeId
    ) {
      return true;
    }

    // Unrestricted broadcast notification with no specific target
    if (notification.userId == null && notification.employeeId == null) {
      return true;
    }

    return false;
  }

  /**
   * Determine if user can view the reply conversation thread of a notification
   */
  static canViewNotificationReplies(
    user: UserContext,
    notification: { userId?: number | null; employeeId?: number | null }
  ): boolean {
    return this.canReplyToNotification(user, notification);
  }
}

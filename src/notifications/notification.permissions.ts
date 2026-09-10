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
}

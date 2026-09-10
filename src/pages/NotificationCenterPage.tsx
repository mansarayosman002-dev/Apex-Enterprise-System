import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  Bell,
  CheckCheck,
  Search,
  Filter,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Shield,
  DollarSign,
  CalendarCheck,
  Send,
  Sparkles,
  Settings2,
  BarChart3,
  Users,
  Eye,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  X,
  Lock,
  Mail,
  Smartphone,
  MessageSquare,
} from 'lucide-react';
import {
  NotificationDetailModal,
  NotificationItem,
} from '../components/notifications/NotificationDetailModal.tsx';
import { extractCleanSnippet } from '../components/notifications/NotificationMessageRenderer.tsx';

interface NotificationCenterPageProps {
  onNavigate?: (page: string) => void;
}

export const NotificationCenterPage: React.FC<NotificationCenterPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<
    'all' | 'unread' | 'Attendance' | 'Payroll' | 'Overtime' | 'HR' | 'Alert' | 'Announcement' | 'compose' | 'preferences' | 'analytics' | 'history'
  >('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  // Composer State
  const [recipientType, setRecipientType] = useState<'individual' | 'department' | 'all'>('individual');
  const [composerRecipientId, setComposerRecipientId] = useState<string>('');
  const [composerDeptId, setComposerDeptId] = useState<string>('');
  const [composerTitle, setComposerTitle] = useState<string>('');
  const [composerMessage, setComposerMessage] = useState<string>('');
  const [composerCategory, setComposerCategory] = useState<string>('HR');
  const [composerPriority, setComposerPriority] = useState<string>('normal');
  const [composerChannels, setComposerChannels] = useState<string[]>(['in_app', 'email']);
  const [composerActionUrl, setComposerActionUrl] = useState<string>('');
  const [isSubmittingCompose, setIsSubmittingCompose] = useState<boolean>(false);
  const [composeSuccess, setComposeSuccess] = useState<string | null>(null);

  // Mass Send Confirmation Guard State
  const [showMassConfirmModal, setShowMassConfirmModal] = useState<boolean>(false);
  const [estimatedRecipientCount, setEstimatedRecipientCount] = useState<number>(0);

  // Preferences State
  const [preferences, setPreferences] = useState<any>(null);
  const [isSavingPrefs, setIsSavingPrefs] = useState<boolean>(false);
  const [prefSaveSuccess, setPrefSaveSuccess] = useState<boolean>(false);

  // Analytics & History State
  const [analytics, setAnalytics] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  // Auxiliary data
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

  const isPrivileged = ['Administrator', 'HR Officer', 'Management', 'Payroll Officer'].includes(user?.roleName || '');
  const isAdmin = user?.roleName === 'Administrator';

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const categoryParam =
        activeTab === 'Attendance' ||
        activeTab === 'Payroll' ||
        activeTab === 'Overtime' ||
        activeTab === 'HR' ||
        activeTab === 'Alert' ||
        activeTab === 'Announcement'
          ? activeTab
          : undefined;

      const isReadParam = activeTab === 'unread' ? false : undefined;

      const data = await api.getNotificationsList({
        category: categoryParam,
        isRead: isReadParam,
        search: searchQuery || undefined,
        page,
        limit: 20,
      });

      setNotifications(data.notifications || []);
      setTotalCount(data.totalCount || 0);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch support data (employees, departments, prefs, analytics)
  useEffect(() => {
    fetchNotifications();
  }, [activeTab, page, searchQuery]);

  useEffect(() => {
    const loadSupportData = async () => {
      try {
        if (isPrivileged) {
          const [emps, depts] = await Promise.all([
            api.getEmployees(),
            api.getDepartments(),
          ]);
          setEmployeesList(emps || []);
          setDepartmentsList(depts || []);
        }

        // Load preferences
        const prefData = await api.getNotificationPreferences();
        setPreferences(prefData);

        // If admin/management, load analytics
        if (isAdmin || user?.roleName === 'Management') {
          const stats = await api.getNotificationAnalytics();
          setAnalytics(stats);
          const hist = await api.getNotificationHistory(30);
          setHistoryItems(hist || []);
        }
      } catch (e) {
        console.warn('Error loading support data:', e);
      }
    };

    loadSupportData();
  }, [user]);

  // Handle Mark As Read
  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (selectedNotification && selectedNotification.id === id) {
        setSelectedNotification((prev) => (prev ? { ...prev, isRead: true } : null));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Mark All Read
  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete
  const handleDelete = async (id: number) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (selectedNotification?.id === id) {
        setSelectedNotification(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Save Preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    setPrefSaveSuccess(false);
    try {
      const updated = await api.updateNotificationPreferences(preferences);
      setPreferences(updated);
      setPrefSaveSuccess(true);
      setTimeout(() => setPrefSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save notification preferences.');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // Pre-calculate recipient count for mass broadcast
  const initiateBroadcast = () => {
    if (!composerTitle.trim() || !composerMessage.trim()) {
      alert('Please provide both title and message content.');
      return;
    }

    if (recipientType === 'all') {
      const count = employeesList.filter((e) => e.status === 'active').length || employeesList.length;
      setEstimatedRecipientCount(count);
      setShowMassConfirmModal(true);
    } else if (recipientType === 'department') {
      if (!composerDeptId) {
        alert('Please select a department.');
        return;
      }
      const deptId = parseInt(composerDeptId, 10);
      const count = employeesList.filter((e) => e.departmentId === deptId && e.status === 'active').length;
      setEstimatedRecipientCount(count);
      setShowMassConfirmModal(true);
    } else if (recipientType === 'individual') {
      if (!composerRecipientId) {
        alert('Please select an employee recipient from the dropdown list.');
        return;
      }
      executeCompose(false);
    } else {
      executeCompose(false);
    }
  };

  // Execute Dispatch
  const executeCompose = async (confirmedMass = false) => {
    setIsSubmittingCompose(true);
    setComposeSuccess(null);
    try {
      if (recipientType === 'individual') {
        const empId = parseInt(composerRecipientId, 10);
        if (!empId || isNaN(empId)) {
          alert('Please select a valid employee recipient.');
          return;
        }
        await api.sendNotification({
          employeeId: empId,
          title: composerTitle,
          message: composerMessage,
          category: composerCategory,
          type: composerCategory === 'HR' ? 'HR' : composerCategory.toUpperCase(),
          priority: composerPriority,
          channel: composerChannels,
          actionUrl: composerActionUrl || undefined,
        });
        setComposeSuccess(`Notification sent successfully to employee.`);
      } else {
        const result = await api.broadcastNotification({
          recipientGroup: recipientType,
          targetDepartmentId: recipientType === 'department' ? parseInt(composerDeptId, 10) : undefined,
          title: composerTitle,
          message: composerMessage,
          category: composerCategory,
          type: composerCategory === 'HR' ? 'ANNOUNCEMENT' : composerCategory.toUpperCase(),
          priority: composerPriority,
          channels: composerChannels,
          actionUrl: composerActionUrl || undefined,
          confirmed: confirmedMass,
        });
        setComposeSuccess(`Broadcast completed: Delivered to ${result.count} recipients.`);
      }

      // Reset form
      setComposerTitle('');
      setComposerMessage('');
      setComposerRecipientId('');
      setComposerActionUrl('');
      setShowMassConfirmModal(false);
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch notification.');
    } finally {
      setIsSubmittingCompose(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'low':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      case 'normal':
      case 'medium':
      default:
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'attendance':
        return <CalendarCheck className="h-4 w-4 text-emerald-500" />;
      case 'payroll':
        return <DollarSign className="h-4 w-4 text-indigo-500" />;
      case 'overtime':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'security':
        return <Shield className="h-4 w-4 text-rose-500" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'announcement':
      case 'hr':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'ai':
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Notification Center</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                    {unreadCount} unread
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Central communication layer for attendance, overtime, payroll approvals, and corporate notices
              </p>
            </div>
          </div>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center space-x-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition"
            >
              <CheckCheck className="h-3.5 w-3.5 text-indigo-500" />
              <span>Mark all read</span>
            </button>
          )}

          {isPrivileged && (
            <button
              onClick={() => setActiveTab('compose')}
              className={`flex items-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-md transition ${
                activeTab === 'compose'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Compose</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center space-x-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === 'preferences'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 text-indigo-600 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5 text-slate-500" />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none touch-scroll">
        {[
          { id: 'all', label: 'All', badge: totalCount },
          { id: 'unread', label: 'Unread', badge: unreadCount },
          { id: 'Attendance', label: 'Attendance' },
          { id: 'Payroll', label: 'Payroll' },
          { id: 'Overtime', label: 'Overtime' },
          { id: 'HR', label: 'HR Notices' },
          { id: 'Alert', label: 'Alerts' },
          { id: 'Announcement', label: 'Announcements' },
          ...(isPrivileged ? [{ id: 'compose', label: 'Compose' }] : []),
          ...(isAdmin || user?.roleName === 'Management'
            ? [
                { id: 'analytics', label: 'Analytics' },
                { id: 'history', label: 'Delivery Log' },
              ]
            : []),
          { id: 'preferences', label: 'Preferences' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setPage(1);
            }}
            className={`flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. NOTIFICATIONS LIST VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab !== 'compose' && activeTab !== 'preferences' && activeTab !== 'analytics' && activeTab !== 'history' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search notifications by title or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={fetchNotifications}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* List Container */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
                <p className="text-xs">Loading operational alerts...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 mb-3">
                  <Bell className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">No notifications found</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  You are all caught up! There are currently no {activeTab !== 'all' ? activeTab.toLowerCase() : ''} notifications in this category.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`group p-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 flex items-start justify-between gap-4 ${
                    !notif.isRead ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <div
                    onClick={() => setSelectedNotification(notif)}
                    className="flex items-start space-x-3.5 flex-1 cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 mt-0.5">
                      {getCategoryIcon(notif.category)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${getPriorityBadge(
                            notif.priority
                          )}`}
                        >
                          {notif.priority}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {notif.category}
                        </span>
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600" />
                        )}
                        <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(notif.createdAt).toLocaleDateString()}{' '}
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                        {notif.title}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {extractCleanSnippet(notif.message, 160)}
                      </p>

                      {notif.actionUrl && (
                        <div className="pt-1">
                          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                            <span>Open Link</span>
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center space-x-1 shrink-0">
                    {!notif.isRead ? (
                      <button
                        title="Mark as read"
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="rounded-lg p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="p-2 text-emerald-500" title="Read">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    )}

                    <button
                      title="Delete notification"
                      onClick={() => handleDelete(notif.id)}
                      className="rounded-lg p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. COMPOSER SUB-VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'compose' && (
        <div className="max-w-3xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Send className="h-4 w-4 text-indigo-600" />
              <span>Compose Operational Notification</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Author and schedule broadcast notices, attendance alerts, or staff announcements across configured channels
            </p>
          </div>

          {composeSuccess && (
            <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{composeSuccess}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Recipient Scope */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Recipient Scope
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRecipientType('individual')}
                  className={`rounded-xl border p-3 text-left transition flex flex-col justify-between ${
                    recipientType === 'individual'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-xs">Individual Employee</span>
                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">Direct personal alert</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientType('department')}
                  className={`rounded-xl border p-3 text-left transition flex flex-col justify-between ${
                    recipientType === 'department'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-xs">Target Department</span>
                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">All staff in selected dept</span>
                </button>

                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setRecipientType('all')}
                  className={`rounded-xl border p-3 text-left transition flex flex-col justify-between ${
                    recipientType === 'all'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                      : !isAdmin
                      ? 'opacity-40 cursor-not-allowed border-slate-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-xs flex items-center justify-between">
                    <span>All Employees</span>
                    {!isAdmin && <Lock className="h-3 w-3 text-slate-400" />}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">Organization broadcast (Admin only)</span>
                </button>
              </div>
            </div>

            {/* Individual Employee Selector */}
            {recipientType === 'individual' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Employee
                </label>
                <select
                  value={composerRecipientId}
                  onChange={(e) => setComposerRecipientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Employee --</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} • {emp.firstName} {emp.lastName} ({emp.departmentName || emp.position})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Department Selector */}
            {recipientType === 'department' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Department
                </label>
                <select
                  value={composerDeptId}
                  onChange={(e) => setComposerDeptId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Department --</option>
                  {departmentsList.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={composerCategory}
                  onChange={(e) => setComposerCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="HR">HR Announcement</option>
                  <option value="Attendance">Attendance Alert</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Overtime">Overtime</option>
                  <option value="System">System Maintenance</option>
                  <option value="Security">Security Alert</option>
                  <option value="Announcement">General Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority Level
                </label>
                <select
                  value={composerPriority}
                  onChange={(e) => setComposerPriority(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Channels Checklist */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Delivery Channels
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={composerChannels.includes('in_app')}
                    onChange={(e) => {
                      if (e.target.checked) setComposerChannels([...composerChannels, 'in_app']);
                      else setComposerChannels(composerChannels.filter((c) => c !== 'in_app'));
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>In-App Bell & Center</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={composerChannels.includes('email')}
                    onChange={(e) => {
                      if (e.target.checked) setComposerChannels([...composerChannels, 'email']);
                      else setComposerChannels(composerChannels.filter((c) => c !== 'email'));
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Corporate Email (HTML)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={composerChannels.includes('whatsapp')}
                    onChange={(e) => {
                      if (e.target.checked) setComposerChannels([...composerChannels, 'whatsapp']);
                      else setComposerChannels(composerChannels.filter((c) => c !== 'whatsapp'));
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>WhatsApp (Adapter)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={composerChannels.includes('sms')}
                    onChange={(e) => {
                      if (e.target.checked) setComposerChannels([...composerChannels, 'sms']);
                      else setComposerChannels(composerChannels.filter((c) => c !== 'sms'));
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>SMS (Adapter)</span>
                </label>
              </div>
            </div>

            {/* Subject / Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notification Subject / Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Company Holiday Announcement or Attendance Reminder"
                value={composerTitle}
                onChange={(e) => setComposerTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message Content *
              </label>
              <textarea
                rows={4}
                placeholder="Type notification message here. Markdown supported (**bold**, `code`, etc.). Variables: {{employee_name}}, {{date}}."
                value={composerMessage}
                onChange={(e) => setComposerMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Action URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Action Deep-link URL (Optional)
              </label>
              <input
                type="text"
                placeholder="/attendance, /payroll, or /reports"
                value={composerActionUrl}
                onChange={(e) => setComposerActionUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmittingCompose}
                onClick={initiateBroadcast}
                className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmittingCompose ? 'Dispatching...' : 'Dispatch Notification'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. PREFERENCES VIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'preferences' && preferences && (
        <form onSubmit={handleSavePreferences} className="max-w-3xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Settings2 className="h-4 w-4 text-indigo-600" />
              <span>Notification Preferences & Privacy</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize which notifications you receive and your preferred delivery channels. Mandatory corporate notices cannot be disabled.
            </p>
          </div>

          {prefSaveSuccess && (
            <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Notification preferences saved successfully!</span>
            </div>
          )}

          {/* Categories configuration */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Alert Categories
            </h3>

            {[
              {
                key: 'attendanceAlerts',
                label: 'Attendance & QR Check-In / Out Alerts',
                desc: 'Daily shift reminders, check-in confirmations, and tardiness notices',
                mandatory: false,
              },
              {
                key: 'payrollAlerts',
                label: 'Payroll & Payslip Availability',
                desc: 'Notifications when monthly payroll is processed and personal payslip is ready',
                mandatory: false,
              },
              {
                key: 'overtimeAlerts',
                label: 'Overtime Detection & Approvals',
                desc: 'Alerts regarding accumulated overtime hours and approval results',
                mandatory: false,
              },
              {
                key: 'hrAnnouncements',
                label: 'General HR Announcements',
                desc: 'Department notices, policy announcements, and company holiday updates',
                mandatory: false,
              },
              {
                key: 'systemAlerts',
                label: 'System Maintenance Notices',
                desc: 'Critical IT scheduled maintenance and system service announcements',
                mandatory: true,
              },
              {
                key: 'securityAlerts',
                label: 'Security & Access Alerts',
                desc: 'Important account security, login anomalies, and password notices',
                mandatory: true,
              },
            ].map((cat) => (
              <div
                key={cat.key}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {cat.label}
                    </span>
                    {cat.mandatory ? (
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        Mandatory
                      </span>
                    ) : (
                      <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {cat.desc}
                  </p>
                </div>

                <div>
                  <input
                    type="checkbox"
                    disabled={cat.mandatory}
                    checked={cat.mandatory ? true : Boolean(preferences[cat.key])}
                    onChange={(e) =>
                      setPreferences({ ...preferences, [cat.key]: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Channels Configuration */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Channel Providers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
                    <Bell className="h-4 w-4" />
                    <span className="text-xs font-bold">In-App Notification</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Always enabled on web and mobile
                  </p>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] font-bold uppercase text-emerald-600">Active (Default)</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs font-bold">Corporate Email</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Receive responsive email notifications
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">Email Delivery</span>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.emailEnabled)}
                    onChange={(e) =>
                      setPreferences({ ...preferences, emailEnabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-xs font-bold">SMS / WhatsApp</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Direct mobile messaging alerts
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">Mobile SMS</span>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.smsEnabled)}
                    onChange={(e) =>
                      setPreferences({ ...preferences, smsEnabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSavingPrefs}
              className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <span>{isSavingPrefs ? 'Saving Changes...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. ANALYTICS VIEW (Admin/Management) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Dispatched</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {analytics.total}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400">Unread</span>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {analytics.unread}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400">Delivered</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {analytics.delivered}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400">Delivery Failures</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {analytics.failed}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Category */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Distribution by Category
              </h3>
              <div className="space-y-2.5">
                {analytics.byCategory?.map((cat: any) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">{cat.category}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Channel */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Distribution by Channel Deliveries
              </h3>
              <div className="space-y-2.5">
                {analytics.byChannel?.map((ch: any) => (
                  <div key={ch.channel} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 uppercase font-semibold">{ch.channel}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{ch.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. DELIVERY HISTORY LOG (Admin/Management) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delivery Tracking Log</h3>
              <p className="text-xs text-slate-500">Real-time audit records across In-App, SMTP, WhatsApp, and SMS</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 font-semibold">ID</th>
                  <th className="p-3 font-semibold">Title</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Channel</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Attempts</th>
                  <th className="p-3 font-semibold">Dispatched Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {historyItems.map((item) => (
                  <tr key={item.deliveryId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-[11px] text-slate-500">#{item.deliveryId}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-xs truncate">{item.title}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{item.category}</td>
                    <td className="p-3 uppercase font-bold text-[10px] text-slate-500">{item.channel}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          item.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{item.attemptCount}</td>
                    <td className="p-3 text-slate-500">
                      {item.sentAt ? new Date(item.sentAt).toLocaleString() : new Date(item.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        onToggleRead={handleMarkAsRead}
      />

      {/* Mass Notification Confirmation Guard Modal (Section 29) */}
      {showMassConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Mass Notification Guard</h3>
                <p className="text-xs text-slate-500">Explicit confirmation required before broadcasting</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Group:</span>
                <span className="font-bold capitalize">{recipientType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Calculated Recipients:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{estimatedRecipientCount} employees</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Channels:</span>
                <span className="font-semibold uppercase text-[10px]">{composerChannels.join(', ')}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block mb-0.5">Subject:</span>
                <p className="font-bold text-slate-900 dark:text-white truncate">{composerTitle}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Are you sure you want to broadcast this message? Once initiated, dispatches will be queued across all designated corporate delivery channels.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowMassConfirmModal(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Edit Message
              </button>

              <button
                type="button"
                disabled={isSubmittingCompose}
                onClick={() => executeCompose(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition"
              >
                {isSubmittingCompose ? 'Sending...' : `Send to ${estimatedRecipientCount} Employees`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  AlertCircle,
  Info,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  DollarSign,
  Users,
  Eye,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { getStoredToken } from '../../services/api.ts';
import {
  NotificationDetailModal,
  NotificationItem,
} from './NotificationDetailModal.tsx';
import { extractCleanSnippet } from './NotificationMessageRenderer.tsx';

interface NotificationBellProps {
  onOpenCenter?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenCenter }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;

      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const toggleReadStatus = async (id: number, currentRead: boolean) => {
    if (!currentRead) {
      await markAsRead(id);
    } else {
      // Toggle back to unread state locally for review
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
      setUnreadCount((prev) => prev + 1);
      if (selectedNotification && selectedNotification.id === id) {
        setSelectedNotification((prev) => (prev ? { ...prev, isRead: false } : null));
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      setIsLoading(true);
      const token = getStoredToken();
      if (!token) return;
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (selectedNotification) {
        setSelectedNotification((prev) => (prev ? { ...prev, isRead: true } : null));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900';
      case 'high':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900';
      case 'medium':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-900';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'attendance':
        return <UserCheck className="h-3.5 w-3.5 text-emerald-500" />;
      case 'payroll':
        return <DollarSign className="h-3.5 w-3.5 text-amber-500" />;
      case 'hr':
        return <Users className="h-3.5 w-3.5 text-indigo-500" />;
      case 'alert':
      case 'security':
        return <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />;
      default:
        return <Info className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const handleOpenDetail = (notif: NotificationItem) => {
    setSelectedNotification(notif);
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Bell Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) fetchNotifications();
          }}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Popover */}
        {isOpen && (
          <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-96 max-h-[82vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-xs text-slate-900 dark:text-white">Notifications</span>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    0 unread
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={isLoading}
                  className="flex items-center space-x-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 text-xs">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  filter === 'unread'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-84 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {displayedNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">All caught up!</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    No {filter === 'unread' ? 'unread' : ''} notification alerts.
                  </p>
                </div>
              ) : (
                displayedNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleOpenDetail(notif)}
                    className={`group p-3.5 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      !notif.isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                          {getCategoryIcon(notif.category)}
                        </span>
                        <span
                          className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase ${getPriorityBadge(
                            notif.priority
                          )}`}
                        >
                          {notif.category}
                        </span>
                        {!notif.isRead && (
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center space-x-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(notif.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {notif.title}
                      </p>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1" />
                    </div>

                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {extractCleanSnippet(notif.message, 110)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* View All in Notification Center Footer */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenCenter) onOpenCenter();
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center space-x-1 w-full"
              >
                <span>Open Notification Center</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        onToggleRead={toggleReadStatus}
      />
    </>
  );
};

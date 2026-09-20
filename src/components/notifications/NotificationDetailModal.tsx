import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  CheckCheck,
  Copy,
  Check,
  Calendar,
  UserCheck,
  DollarSign,
  Users,
  ShieldAlert,
  Bell,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  FileText,
  FileSpreadsheet,
  Send,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { NotificationMessageRenderer } from './NotificationMessageRenderer.tsx';
import { downloadAsPdf, downloadAsExcel } from '../../utils/exportDocument.ts';
import { api } from '../../services/api.ts';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  category: string;
  priority: string;
  channel?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationReply {
  id: number;
  notificationId: number;
  userId: number;
  employeeId?: number | null;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleRead: (id: number, currentRead: boolean) => void;
  initialFocusReply?: boolean;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose,
  onToggleRead,
  initialFocusReply = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Reply Thread States
  const [replies, setReplies] = useState<NotificationReply[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load replies when modal opens
  useEffect(() => {
    if (isOpen && notification?.id) {
      setReplyText('');
      setReplyError(null);
      setIsLoadingReplies(true);

      api
        .getNotificationReplies(notification.id)
        .then((res) => {
          setReplies(res.replies || []);
        })
        .catch((err) => {
          console.warn('Failed to load replies:', err);
          setReplies([]);
        })
        .finally(() => {
          setIsLoadingReplies(false);
        });
    }
  }, [isOpen, notification?.id]);

  // Handle focus on reply input if requested
  useEffect(() => {
    if (isOpen && initialFocusReply) {
      const timer = setTimeout(() => {
        if (replyInputRef.current) {
          replyInputRef.current.focus();
          replyInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialFocusReply]);

  if (!isOpen || !notification) return null;

  const handleCopy = () => {
    const fullText = `# ${notification.title}\n\n` +
      `**Category**: ${notification.category} | **Priority**: ${notification.priority} | **Channel**: ${notification.channel || 'in_app'}\n` +
      `**Dispatched**: ${new Date(notification.createdAt).toLocaleString()}\n\n` +
      `---\n\n${notification.message}\n\n` +
      `---\n*Apex Enterprise HRMS • Smart Employee Attendance & Payroll System*`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    downloadAsPdf({
      title: notification.title,
      content: notification.message,
      filenamePrefix: `apex_notification_${notification.category.toLowerCase()}`,
      metadata: {
        Category: notification.category,
        Priority: notification.priority,
        Channel: notification.channel || 'in_app',
      },
    });
  };

  const handleDownloadExcel = () => {
    downloadAsExcel({
      title: notification.title,
      content: notification.message,
      filenamePrefix: `apex_notification_${notification.category.toLowerCase()}`,
      metadata: {
        Category: notification.category,
        Priority: notification.priority,
        Channel: notification.channel || 'in_app',
      },
    });
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    setReplyError(null);

    try {
      const res = await api.replyToNotification(notification.id, replyText.trim());
      if (res.reply) {
        setReplies((prev) => [...prev, res.reply]);
        setReplyText('');
        setTimeout(() => {
          repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err: any) {
      setReplyError(err.message || 'Failed to submit reply. Please try again.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'attendance':
        return <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case 'payroll':
        return <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'hr':
        return <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      case 'alert':
      case 'security':
        return <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />;
      case 'reminder':
        return <Bell className="h-5 w-5 text-sky-600 dark:text-sky-400" />;
      default:
        return <Info className="h-5 w-5 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-900';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-900';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-900';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const elapsed = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all duration-300 ${
          isMaximized
            ? 'w-full h-[96vh] max-w-none'
            : 'w-full max-w-3xl md:max-w-4xl h-[88vh] max-h-[820px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 px-5 py-3.5 shrink-0 backdrop-blur-xs">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              {getCategoryIcon(notification.category)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {notification.category} Notification
                </span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPriorityStyle(
                    notification.priority
                  )}`}
                >
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  {notification.priority} Priority
                </span>
                {replies.length > 0 && (
                  <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                    <MessageSquare className="mr-1 h-3 w-3" />
                    {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(notification.createdAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(notification.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
                <span>&bull;</span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {getRelativeTime(notification.createdAt)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-1.5">

            {/* Maximize / Minimize Toggle */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              title={isMaximized ? 'Restore View' : 'Maximize Full View'}
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Executive Title & Meta Card */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-800/60 dark:via-indigo-950/20 dark:to-slate-800/60 p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {notification.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="flex items-center space-x-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 font-medium shadow-2xs">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                <span>Channel: <strong className="text-slate-900 dark:text-white uppercase">{notification.channel || 'in_app'}</strong></span>
              </span>
              <span className="flex items-center space-x-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 font-medium shadow-2xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    notification.isRead ? 'bg-slate-400' : 'bg-emerald-500'
                  }`}
                />
                <span>Status: <strong className="text-slate-900 dark:text-white">{notification.isRead ? 'Read' : 'Unread'}</strong></span>
              </span>
              <span className="flex items-center space-x-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 font-medium shadow-2xs">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span>ID: <code className="font-mono text-indigo-600 dark:text-indigo-400">#{notification.id}</code></span>
              </span>
            </div>
          </div>

          {/* Formatted Message Content Canvas */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs">
            <NotificationMessageRenderer content={notification.message} />
          </div>

          {/* Conversation Thread & Replies */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Conversation & Replies
                </h3>
                <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-xs font-semibold">
                  {replies.length}
                </span>
              </div>
              {isLoadingReplies && (
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading thread...</span>
                </div>
              )}
            </div>

            {/* Replies List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {replies.length === 0 && !isLoadingReplies && (
                <div className="text-center py-6 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/60">
                  <MessageSquare className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No replies yet</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    As a recipient or manager, you can post a reply to this notification below.
                  </p>
                </div>
              )}

              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs uppercase shadow-2xs">
                        {reply.senderName.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {reply.senderName}
                          </span>
                          <span className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            {reply.senderRole}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(reply.createdAt).toLocaleDateString()} {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed pl-9">
                    {reply.message}
                  </p>
                </div>
              ))}
              <div ref={repliesEndRef} />
            </div>

            {/* Reply Composer Box */}
            <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {replyError && (
                <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{replyError}</span>
                </div>
              )}

              <div className="relative">
                <textarea
                  ref={replyInputRef}
                  rows={3}
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    if (replyError) setReplyError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSendReply(e);
                    }
                  }}
                  placeholder="Type your reply to this notification... (Press Ctrl + Enter to send)"
                  maxLength={2000}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                  <span>{replyText.length} / 2000 characters</span>
                  <span>&bull;</span>
                  <span className="hidden sm:inline">Press Ctrl+Enter to send</span>
                </div>

                <button
                  type="submit"
                  disabled={!replyText.trim() || isSubmittingReply}
                  className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white shadow-xs transition"
                >
                  {isSubmittingReply ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Reply</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Action Footer Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 px-5 py-3.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition"
              title="Copy formatted message text"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center space-x-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 shadow-xs transition"
              title="Download notification as official PDF document"
            >
              <FileText className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span>Download PDF</span>
            </button>

            {/* Download Excel Button */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="flex items-center space-x-1.5 rounded-xl border border-emerald-600/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 shadow-xs transition"
              title="Download notification formatted as Microsoft Excel Workbook (.xls)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Download Excel</span>
            </button>

            {/* Toggle Read Status */}
            <button
              type="button"
              onClick={() => onToggleRead(notification.id, notification.isRead)}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition"
            >
              <CheckCheck className="h-3.5 w-3.5 text-indigo-500" />
              <span>{notification.isRead ? 'Mark as Unread' : 'Mark as Read'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-semibold text-white shadow-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

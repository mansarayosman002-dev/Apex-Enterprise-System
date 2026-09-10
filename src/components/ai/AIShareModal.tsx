import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Employee } from '../../types/index.ts';
import {
  X,
  Share2,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Search,
  Building,
} from 'lucide-react';

interface AIShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  defaultTitle?: string;
  onShareSuccess?: () => void;
}

export const AIShareModal: React.FC<AIShareModalProps> = ({
  isOpen,
  onClose,
  messageContent,
  defaultTitle = 'Apex AI Assistant Report',
  onShareSuccess,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [title, setTitle] = useState(defaultTitle);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      setStatusMsg(null);
      setNote('');
      setTitle(defaultTitle);
    }
  }, [isOpen, defaultTitle]);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await api.getEmployees();
      setEmployees(data || []);
      if (data && data.length > 0) {
        setSelectedEmpId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const code = (emp.employeeCode || '').toLowerCase();
    const dept = (emp.departmentName || '').toLowerCase();
    return fullName.includes(term) || code.includes(term) || dept.includes(term);
  });

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);

  const handleShare = async () => {
    if (!selectedEmpId) {
      setStatusMsg({ type: 'error', text: 'Please select a recipient employee.' });
      return;
    }

    setIsSending(true);
    setStatusMsg(null);
    try {
      await api.shareAiResponse({
        targetEmployeeId: selectedEmpId,
        title: title.trim() || 'AI Assistant Response',
        message: messageContent,
        note: note.trim() || undefined,
      });

      setStatusMsg({
        type: 'success',
        text: `Successfully sent to ${selectedEmployee?.firstName} ${selectedEmployee?.lastName}!`,
      });

      if (onShareSuccess) {
        onShareSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to dispatch message.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Share Response with Employee</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Dispatches this AI response directly into their in-app notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {statusMsg && (
            <div
              className={`flex items-center space-x-2 rounded-xl p-3 text-xs ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Title Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Select Recipient Employee */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Fellow Employee Recipient
            </label>

            {/* Filter Search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, code or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Listbox */}
            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <div className="p-3 text-center text-slate-400">Loading workforce directory...</div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-3 text-center text-slate-400">No matching employees found.</div>
              ) : (
                filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedEmpId(emp.id)}
                    className={`w-full flex items-center justify-between p-2.5 text-left transition ${
                      selectedEmpId === emp.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{emp.firstName} {emp.lastName}</span>
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {emp.employeeCode}
                      </span>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building className="h-3 w-3" />
                        <span>{emp.departmentName || 'Unassigned'}</span>
                      </div>
                    </div>
                    {selectedEmpId === emp.id && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Personal Note (Optional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Please review today's attendance summary and confirm your check-out."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none resize-none shadow-2xs"
            />
          </div>

          {/* Message Preview */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Message Content Preview
            </label>
            <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/80 p-3 text-[11px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap scrollbar-thin">
              {messageContent}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isSending || !selectedEmpId}
            className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 font-bold text-white shadow-sm transition disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSending ? 'Sending...' : 'Send Notification'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

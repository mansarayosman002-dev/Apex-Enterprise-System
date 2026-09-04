import React, { useState } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { X, Clock, Calendar, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

interface OvertimeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OvertimeRequestModal: React.FC<OvertimeRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];
  const [overtimeDate, setOvertimeDate] = useState(todayStr);
  const [hours, setHours] = useState('2.0');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 12) {
      setError('Please enter a valid number of overtime hours (0.5 to 12.0).');
      setIsLoading(false);
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason or project task description for the overtime.');
      setIsLoading(false);
      return;
    }

    try {
      await api.createOvertime({
        employeeId: user?.employeeId,
        overtimeDate,
        hours: parsedHours,
        rateMultiplier: 1.5,
        reason: reason.trim(),
        status: 'Pending',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit overtime claim.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Submit Overtime Request</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Claim additional working hours for compensation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center space-x-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3 text-xs text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Date of Overtime Work
            </label>
            <input
              type="date"
              value={overtimeDate || ''}
              onChange={(e) => setOvertimeDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Overtime Duration (Hours)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="12"
              value={hours || ''}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 2.0"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
              required
            />
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Standard overtime multiplier applies (1.5x basic hourly rate).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Project Justification
            </label>
            <textarea
              rows={3}
              value={reason || ''}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Detail the deliverable, emergency maintenance, or project task completed..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden resize-none"
              required
            />
          </div>

          <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/40 p-3 text-[11px] text-indigo-900 dark:text-indigo-300">
            <div className="flex items-center space-x-1.5 font-semibold text-indigo-950 dark:text-indigo-200 mb-0.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Approval Workflow</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Your request will be queued for review by your HR Officer and Payroll Officer. Once approved, it will be automatically calculated into your month-end payslip.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Overtime Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

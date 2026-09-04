import React, { useState, useEffect } from 'react';
import { PayrollRecord, PayrollStatus } from '../../types/index.ts';
import { X, DollarSign, CheckCircle2, AlertCircle, Trash2, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api.ts';

interface PayrollReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: PayrollRecord | null;
  currency?: string;
}

export const PayrollReviewModal: React.FC<PayrollReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  record,
  currency = 'NLe ',
}) => {
  const [basicSalary, setBasicSalary] = useState('0.00');
  const [allowances, setAllowances] = useState('0.00');
  const [deductions, setDeductions] = useState('0.00');
  const [status, setStatus] = useState<PayrollStatus>('Draft');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (record) {
      setBasicSalary(record.basicSalary != null ? record.basicSalary.toString() : '0.00');
      setAllowances(record.allowances != null ? record.allowances.toString() : '0.00');
      setDeductions(record.deductions != null ? record.deductions.toString() : '0.00');
      setStatus(record.status || 'Draft');
    }
    setError(null);
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const basic = parseFloat(basicSalary) || 0;
  const overtime = parseFloat(record.overtimeAmount?.toString() || '0');
  const allowNum = parseFloat(allowances) || 0;
  const dedNum = parseFloat(deductions) || 0;
  const calculatedGross = basic + overtime + allowNum;
  const calculatedNet = calculatedGross - dedNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.updatePayroll(record.id, {
        basicSalary: basic,
        allowances: allowNum,
        deductions: dedNum,
        status,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update payroll item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.approvePayroll(record.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve payroll.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the payroll record for ${record.employeeName} (${record.payrollPeriod})?`)) return;
    setIsDeleting(true);
    setError(null);
    try {
      await api.deletePayroll(record.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete payroll record.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Adjust & Review Payroll Record</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {record.employeeName} ({record.employeeCode}) • Period: {record.payrollPeriod}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Automatic Earnings (Read-only / verified) */}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Basic Monthly Wage</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={basicSalary || ''}
                onChange={(e) => setBasicSalary(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Overtime Pay ({record.overtimeHours || 0} hrs)</span>
              <p className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm mt-1.5">+{currency}{overtime.toFixed(2)}</p>
            </div>
          </div>

          {/* Editable Allowances & Deductions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Allowances ({currency.trim()})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={allowances || ''}
                onChange={(e) => setAllowances(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Deductions ({currency.trim()})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={deductions || ''}
                onChange={(e) => setDeductions(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Real-time Summary Box */}
          <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/40 p-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Gross Salary (Basic + OT + Allowances):</span>
              <span className="font-semibold text-slate-900 dark:text-white">{currency}{calculatedGross.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Total Deductions:</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">-{currency}{dedNum.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-indigo-200/60 dark:border-indigo-800/80 pt-2 text-sm font-bold text-slate-900 dark:text-white">
              <span>Net Salary:</span>
              <span className="text-emerald-600 dark:text-emerald-400">{currency}{calculatedNet.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Payroll Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PayrollStatus)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden font-medium"
            >
              <option value="Draft">Draft</option>
              <option value="Processed">Processed</option>
              <option value="Approved">Approved</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center space-x-1 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>

            <div className="flex items-center space-x-2">
              {record.status !== 'Approved' && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Approve</span>
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

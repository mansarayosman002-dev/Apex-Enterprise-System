import React, { useState } from 'react';
import { PayrollPreviewResponse, PayrollPreviewItem, PayrollStatus } from '../../types/index.ts';
import { X, Calculator, CheckCircle2, DollarSign, Users, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { api } from '../../services/api.ts';

interface PayrollPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  previewData: PayrollPreviewResponse | null;
  currency?: string;
  onRefreshPreview?: () => void;
}

export const PayrollPreviewModal: React.FC<PayrollPreviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  previewData,
  currency = 'NLe ',
  onRefreshPreview,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<PayrollStatus>('Draft');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !previewData) return null;

  const handleCommitPayroll = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await api.processPayroll({
        period: previewData.period,
        status: selectedStatus,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process and store payroll records.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Payroll Calculation Preview</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Period: <span className="font-semibold text-slate-700 dark:text-slate-200">{previewData.period}</span> • {previewData.totalEmployees} Active Employees Computed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center space-x-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Employees</span>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{previewData.totalEmployees}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Basic Total</span>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{currency}{previewData.totalBasicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/40 p-3">
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">Overtime Pay ({previewData.totalOvertimeHours}h)</span>
              <p className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-300">+{currency}{previewData.totalOvertimeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3">
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Allowances</span>
              <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">+{currency}{previewData.totalAllowances.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3">
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase">Deductions</span>
              <p className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-300">-{currency}{previewData.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/60 p-3">
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">Net Payable</span>
              <p className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-200">{currency}{previewData.totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Detailed Employee Calculations Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Individual Employee Computations</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Formula: Gross = Basic + Overtime + Allowances | Net = Gross - Deductions</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Employee</th>
                    <th className="px-3 py-2 font-semibold">Basic Wage</th>
                    <th className="px-3 py-2 font-semibold">OT Hours</th>
                    <th className="px-3 py-2 font-semibold">OT Amount</th>
                    <th className="px-3 py-2 font-semibold">Allowances</th>
                    <th className="px-3 py-2 font-semibold">Deductions</th>
                    <th className="px-3 py-2 font-semibold">Gross</th>
                    <th className="px-3 py-2 font-semibold">Net Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewData.items.map((item) => (
                    <tr key={item.employeeId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900 dark:text-white">{item.employeeName}</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{item.employeeCode} • {item.departmentName}</span>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{currency}{item.basicSalary.toFixed(2)}</td>
                      <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{item.overtimeHours.toFixed(1)} hrs</td>
                      <td className="px-3 py-2 font-medium text-indigo-600 dark:text-indigo-400">+{currency}{item.overtimeAmount.toFixed(2)}</td>
                      <td className="px-3 py-2 font-medium text-emerald-600 dark:text-emerald-400">+{currency}{item.allowances.toFixed(2)}</td>
                      <td className="px-3 py-2 font-medium text-rose-600 dark:text-rose-400">-{currency}{item.deductions.toFixed(2)}</td>
                      <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{currency}{item.grossSalary.toFixed(2)}</td>
                      <td className="px-3 py-2 font-bold text-emerald-700 dark:text-emerald-300">{currency}{item.netSalary.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 py-4 gap-3">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Save Status As:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PayrollStatus)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="Draft">Draft (Preliminary)</option>
              <option value="Processed">Processed (Verified)</option>
              <option value="Approved">Approved (Finalized)</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommitPayroll}
              disabled={isProcessing}
              className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Commit & Save Payroll ({selectedStatus})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

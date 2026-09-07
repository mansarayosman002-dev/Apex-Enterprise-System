import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { PayrollRecord, Department, SystemSettings, PayrollPreviewResponse, PayrollStatus } from '../types/index.ts';
import {
  DollarSign,
  Calculator,
  Download,
  Filter,
  CheckCircle2,
  Printer,
  Edit2,
  RefreshCw,
  Clock,
  Sparkles,
  CreditCard,
  Eye,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { PayslipModal } from '../components/attendance/PayslipModal.tsx';
import { PayrollReviewModal } from '../components/payroll/PayrollReviewModal.tsx';
import { PayrollPreviewModal } from '../components/payroll/PayrollPreviewModal.tsx';

export const PayrollPage: React.FC = () => {
  const currentMonthStr = new Date().toISOString().substring(0, 7); // e.g. "2026-08"
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthStr);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  // Modals
  const [payslipRecord, setPayslipRecord] = useState<PayrollRecord | null>(null);
  const [reviewRecord, setReviewRecord] = useState<PayrollRecord | null>(null);
  const [previewData, setPreviewData] = useState<PayrollPreviewResponse | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    loadDepartmentsAndSettings();
  }, []);

  useEffect(() => {
    loadPayroll();
  }, [selectedPeriod, selectedDept, selectedStatus, searchQuery]);

  const loadDepartmentsAndSettings = async () => {
    try {
      const [deptList, setts] = await Promise.all([
        api.getDepartments(),
        api.getSettings(),
      ]);
      setDepartments(deptList);
      setSettings(setts);
    } catch (e) {
      console.error('Failed to load initial payroll data:', e);
    }
  };

  const loadPayroll = async () => {
    setIsLoading(true);
    try {
      const list = await api.getPayroll({
        period: selectedPeriod,
        departmentId: selectedDept ? Number(selectedDept) : undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
      });
      setPayrollRecords(list);
    } catch (e) {
      console.error('Failed to load payroll list:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPreview = async () => {
    setIsPreviewLoading(true);
    try {
      const res = await api.previewPayroll({
        period: selectedPeriod,
        departmentId: selectedDept ? Number(selectedDept) : undefined,
      });
      setPreviewData(res);
      setIsPreviewOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to generate payroll preview.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleBatchApprove = async () => {
    if (!confirm(`Are you sure you want to approve all payroll records for ${selectedPeriod}?`)) return;
    setIsProcessingAll(true);
    try {
      const res = await api.processAllPayroll(selectedPeriod, 'Approved');
      alert(res.message || 'All records approved successfully.');
      loadPayroll();
    } catch (err: any) {
      alert(err.message || 'Failed to approve all payroll records.');
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleSingleApprove = async (id: number) => {
    try {
      await api.approvePayroll(id);
      loadPayroll();
    } catch (err: any) {
      alert(err.message || 'Failed to approve payroll item.');
    }
  };

  const handleSingleDelete = async (rec: PayrollRecord) => {
    if (!confirm(`Delete payroll record for ${rec.employeeName} (${rec.payrollPeriod})?`)) return;
    try {
      await api.deletePayroll(rec.id);
      loadPayroll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete payroll item.');
    }
  };

  const totalGross = payrollRecords.reduce(
    (sum, r) => sum + parseFloat(r.grossSalary?.toString() || '0'),
    0
  );
  const totalNet = payrollRecords.reduce(
    (sum, r) => sum + parseFloat(r.netSalary?.toString() || '0'),
    0
  );
  const totalOvertime = payrollRecords.reduce(
    (sum, r) => sum + parseFloat(r.overtimeAmount?.toString() || '0'),
    0
  );

  const exportCSV = () => {
    if (payrollRecords.length === 0) return;
    const headers = [
      'Period',
      'Employee Code',
      'Employee Name',
      'Department',
      'Basic Salary',
      'Overtime Hours',
      'Overtime Pay',
      'Allowances',
      'Deductions',
      'Gross Salary',
      'Net Salary',
      'Status',
      'Created At',
    ];
    const rows = payrollRecords.map((r) => [
      r.payrollPeriod,
      r.employeeCode,
      r.employeeName,
      r.departmentName || '',
      r.basicSalary,
      r.overtimeHours || 0,
      r.overtimeAmount,
      r.allowances,
      r.deductions,
      r.grossSalary,
      r.netSalary,
      r.status,
      r.createdAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payroll_ledger_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currency = settings?.currencySymbol
    ? (settings.currencySymbol.endsWith(' ') ? settings.currencySymbol : `${settings.currencySymbol} `)
    : 'NLe ';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Automated Payroll Ledger</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Attendance-integrated compensation, overtime multipliers, allowances, deductions, and payslips
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={exportCSV}
            className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
          >
            <Download className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>
          
          {payrollRecords.some((r) => r.status !== 'Approved' && r.status !== 'Paid') && (
            <button
              onClick={handleBatchApprove}
              disabled={isProcessingAll}
              className="flex items-center justify-center space-x-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Approve All</span>
            </button>
          )}

          <button
            onClick={handleOpenPreview}
            disabled={isPreviewLoading}
            className="flex items-center justify-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isPreviewLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            <span>Preview & Calculate</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Net Salary ({selectedPeriod})
          </span>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {currency}{totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Total payable across {payrollRecords.length} records</span>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Gross Earnings
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {currency}{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Formula: Basic + Overtime + Allowances</span>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Overtime Compensation
          </span>
          <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            +{currency}{totalOvertime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Calculated directly from verified attendance logs</span>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        {/* Search */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Search Employee</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Name or Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Period */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Payroll Period (YYYY-MM)</label>
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden font-medium"
          />
        </div>

        {/* Department */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Department</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.departmentName}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Processed">Processed</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : payrollRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No payroll entries found for {selectedPeriod}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
              Click "Preview & Calculate Payroll" above to compute wages, overtime, and allowances from attendance records.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (displayed on phones < md) */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
              {payrollRecords.map((rec) => (
                <div key={rec.id} className="p-4 space-y-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{rec.employeeName}</p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{rec.employeeCode}</span>
                        <span>•</span>
                        <span>{rec.departmentName}</span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                        rec.status === 'Approved' || rec.status === 'Paid'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : rec.status === 'Processed'
                          ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>

                  {/* Net Pay Highlight Banner */}
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 p-2.5">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Take-Home Net Pay:</span>
                    <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                      {currency}{parseFloat(rec.netSalary.toString()).toFixed(2)}
                    </span>
                  </div>

                  {/* Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Basic Wage:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{currency}{parseFloat(rec.basicSalary.toString()).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Overtime:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">+{currency}{parseFloat(rec.overtimeAmount.toString()).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Allowances:</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">+{currency}{parseFloat(rec.allowances.toString()).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Deductions:</span>
                      <span className="font-medium text-rose-600 dark:text-rose-400">-{currency}{parseFloat(rec.deductions.toString()).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Mobile Actions Toolbar */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setPayslipRecord(rec)}
                      className="flex items-center space-x-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>View Payslip</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      {rec.status !== 'Approved' && (
                        <button
                          onClick={() => handleSingleApprove(rec.id)}
                          title="Approve Record"
                          className="flex items-center space-x-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-1 text-xs font-medium hover:bg-emerald-100 transition"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      )}

                      <button
                        onClick={() => setReviewRecord(rec)}
                        title="Adjust"
                        className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleSingleDelete(rec)}
                        title="Delete"
                        className="rounded-lg p-1.5 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (hidden on mobile, visible on md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold">Basic Wage</th>
                    <th className="px-4 py-3 font-semibold">Overtime</th>
                    <th className="px-4 py-3 font-semibold">Allowances</th>
                    <th className="px-4 py-3 font-semibold">Deductions</th>
                    <th className="px-4 py-3 font-semibold">Gross</th>
                    <th className="px-4 py-3 font-semibold">Net Pay</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payrollRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 dark:text-white">{rec.employeeName}</p>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{rec.employeeCode}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rec.departmentName}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {currency}{parseFloat(rec.basicSalary.toString()).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <div>+{currency}{parseFloat(rec.overtimeAmount.toString()).toFixed(2)}</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({rec.overtimeHours || 0} hrs)</span>
                      </td>
                      <td className="px-4 py-3 text-emerald-700 dark:text-emerald-400 font-medium">
                        +{currency}{parseFloat(rec.allowances.toString()).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-medium">
                        -{currency}{parseFloat(rec.deductions.toString()).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {currency}{parseFloat(rec.grossSalary.toString()).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                        {currency}{parseFloat(rec.netSalary.toString()).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            rec.status === 'Approved' || rec.status === 'Paid'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : rec.status === 'Processed'
                              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setPayslipRecord(rec)}
                            title="Generate Payslip"
                            className="flex items-center space-x-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                          >
                            <Printer className="h-3 w-3" />
                            <span>Payslip</span>
                          </button>
                          
                          {rec.status !== 'Approved' && (
                            <button
                              onClick={() => handleSingleApprove(rec.id)}
                              title="Approve Record"
                              className="rounded-lg p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setReviewRecord(rec)}
                            title="Adjust Allowances & Deductions"
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleSingleDelete(rec)}
                            title="Delete Record"
                            className="rounded-lg p-1 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <PayslipModal
        isOpen={!!payslipRecord}
        onClose={() => setPayslipRecord(null)}
        record={payslipRecord}
        currency={currency}
        companyName={settings?.companyName}
      />

      <PayrollReviewModal
        isOpen={!!reviewRecord}
        onClose={() => setReviewRecord(null)}
        onSuccess={loadPayroll}
        record={reviewRecord}
        currency={currency}
      />

      <PayrollPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onSuccess={loadPayroll}
        previewData={previewData}
        currency={currency}
      />
    </div>
  );
};

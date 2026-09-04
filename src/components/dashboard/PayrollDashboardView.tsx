import React from 'react';
import {
  DollarSign,
  Calculator,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DashboardStats, PayrollRecord } from '../../types/index.ts';
import { StatCard } from '../common/StatCard.tsx';
import { Badge } from '../common/Badge.tsx';

interface PayrollDashboardViewProps {
  stats: DashboardStats | null;
  payrollRecords?: PayrollRecord[];
  currency?: string;
  setActivePage: (page: string) => void;
  onOpenPreviewModal?: () => void;
  onBatchApprove?: () => void;
  onSelectPayslip?: (record: PayrollRecord) => void;
}

export const PayrollDashboardView: React.FC<PayrollDashboardViewProps> = ({
  stats,
  payrollRecords = [],
  currency = 'NLe ',
  setActivePage,
  onOpenPreviewModal,
  onBatchApprove,
  onSelectPayslip,
}) => {
  const currentPeriod = stats?.currentPeriod || new Date().toISOString().substring(0, 7);
  
  // Payroll metrics
  const totalNet = stats?.payroll?.totalNetSalary || payrollRecords.reduce((s, r) => s + parseFloat(r.netSalary?.toString() || '0'), 0);
  const totalGross = stats?.payroll?.totalGrossSalary || payrollRecords.reduce((s, r) => s + parseFloat(r.grossSalary?.toString() || '0'), 0);
  const totalAllowances = stats?.payroll?.totalAllowances || payrollRecords.reduce((s, r) => s + parseFloat(r.allowances?.toString() || '0'), 0);
  const totalDeductions = stats?.payroll?.totalDeductions || payrollRecords.reduce((s, r) => s + parseFloat(r.deductions?.toString() || '0'), 0);
  const totalOvertimeAmount = stats?.payroll?.totalOvertimeAmount || payrollRecords.reduce((s, r) => s + parseFloat(r.overtimeAmount?.toString() || '0'), 0);
  const totalOTHours = payrollRecords.reduce((s, r) => s + parseFloat(r.overtimeHours?.toString() || '0'), 0);

  const processedCount = payrollRecords.filter((r) => r.status === 'Approved' || r.status === 'Paid' || r.status === 'Processed').length;
  const pendingCount = payrollRecords.filter((r) => r.status === 'Draft' || r.status === 'Pending').length;

  const payrollBreakdownData = [
    { name: 'Basic Wages', value: totalGross - totalAllowances - totalOvertimeAmount, color: '#4f46e5' },
    { name: 'Overtime Pay', value: totalOvertimeAmount, color: '#f59e0b' },
    { name: 'Allowances', value: totalAllowances, color: '#10b981' },
    { name: 'Deductions', value: totalDeductions, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-300 backdrop-blur-xs border border-emerald-500/30">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Payroll Engine Console</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Payroll & Compensation Management
          </h1>
          <p className="text-xs text-slate-300">
            Automated wage calculations, overtime multipliers (1.5x), statutory deductions, and ledger approvals for {currentPeriod}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActivePage('payroll')}
            className="flex items-center space-x-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500/30 transition shadow-xs"
          >
            <Download className="h-4 w-4 text-emerald-300" />
            <span>View Ledger</span>
          </button>
          <button
            onClick={() => setActivePage('payroll')}
            className="flex items-center space-x-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition"
          >
            <Calculator className="h-4 w-4" />
            <span>Compute Period Payroll</span>
          </button>
        </div>
      </div>

      {/* 5 Required Payroll Metric Cards */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Compensation Summaries ({currentPeriod})
        </h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Payroll Summary (Net Total) */}
          <StatCard
            title="Total Net Payroll"
            value={`${currency}${totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Final disbursement payable"
            icon={DollarSign}
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
            iconTextColor="text-emerald-600 dark:text-emerald-400"
            badge="Net Total"
            badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
            onClick={() => setActivePage('payroll')}
          />

          {/* 2. Processed Payroll */}
          <StatCard
            title="Processed Payroll"
            value={processedCount}
            subtitle={`${processedCount} verified employee records`}
            icon={CheckCircle2}
            iconBgColor="bg-blue-50 dark:bg-blue-950/60"
            iconTextColor="text-blue-600 dark:text-blue-400"
            badge="Verified"
            badgeColor="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300"
            onClick={() => setActivePage('payroll')}
          />

          {/* 3. Pending Payroll */}
          <StatCard
            title="Pending Review"
            value={pendingCount}
            subtitle="Draft status records"
            icon={Clock}
            iconBgColor="bg-amber-50 dark:bg-amber-950/60"
            iconTextColor="text-amber-600 dark:text-amber-400"
            badge={pendingCount > 0 ? 'Action Required' : 'All Clear'}
            badgeColor={pendingCount > 0 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}
            onClick={() => setActivePage('payroll')}
          />

          {/* 4. Overtime Payout */}
          <StatCard
            title="Overtime Compensation"
            value={`+${currency}${totalOvertimeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle={`${totalOTHours.toFixed(1)} OT hours @ 1.5x multiplier`}
            icon={TrendingUp}
            iconBgColor="bg-purple-50 dark:bg-purple-950/60"
            iconTextColor="text-purple-600 dark:text-purple-400"
            onClick={() => setActivePage('payroll')}
          />

          {/* 5. Gross Salary Totals */}
          <StatCard
            title="Total Gross Salary"
            value={`${currency}${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Basic + Overtime + Allowances"
            icon={CreditCard}
            iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
            iconTextColor="text-indigo-600 dark:text-indigo-400"
            onClick={() => setActivePage('payroll')}
          />
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Component Distribution Breakdown */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compensation Cost Structure</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Breakdown of gross earnings vs deductions</p>
            </div>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              Formula Verified
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payrollBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {payrollBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${currency}${Number(val).toFixed(2)}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Gross Total</span>
                <span className="font-bold text-slate-900 dark:text-white">{currency}{totalGross.toFixed(2)}</span>
              </div>
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/30 p-3 flex justify-between items-center">
                <span className="text-indigo-700 dark:text-indigo-300 font-medium">Overtime Payout ({totalOTHours.toFixed(1)}h)</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300">+{currency}{totalOvertimeAmount.toFixed(2)}</span>
              </div>
              <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/30 p-3 flex justify-between items-center">
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">Allowances Total</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">+{currency}{totalAllowances.toFixed(2)}</span>
              </div>
              <div className="rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/30 p-3 flex justify-between items-center">
                <span className="text-rose-700 dark:text-rose-300 font-medium">Statutory Deductions</span>
                <span className="font-bold text-rose-700 dark:text-rose-300">-{currency}{totalDeductions.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Status Summary */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Period Settlement</h3>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{currentPeriod}</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Processed Records:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">{processedCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Draft / Pending Records:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-2 font-bold text-slate-900 dark:text-white">
                <span>Net Total Payable:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{currency}{totalNet.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              onClick={() => setActivePage('payroll')}
              className="w-full flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Calculator className="h-4 w-4" />
              <span>Launch Payroll Ledger</span>
            </button>
            <button
              onClick={() => setActivePage('reports')}
              className="w-full flex items-center justify-center space-x-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>Generate Audit Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Payroll Entries Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Payroll Ledger Entries</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Individual compensation calculation audit records</p>
          </div>
          <button
            onClick={() => setActivePage('payroll')}
            className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
          >
            <span>Open Complete Ledger</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {payrollRecords.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            No payroll records generated yet for this period. Click "Compute Period Payroll" above to generate.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Employee</th>
                  <th className="px-4 py-2.5 font-semibold">Department</th>
                  <th className="px-4 py-2.5 font-semibold">Basic</th>
                  <th className="px-4 py-2.5 font-semibold">Overtime</th>
                  <th className="px-4 py-2.5 font-semibold">Allowances</th>
                  <th className="px-4 py-2.5 font-semibold">Deductions</th>
                  <th className="px-4 py-2.5 font-semibold">Net Pay</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payrollRecords.slice(0, 6).map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 dark:text-white">{rec.employeeName}</p>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{rec.employeeCode}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rec.departmentName}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{currency}{parseFloat(rec.basicSalary.toString()).toFixed(2)}</td>
                    <td className="px-4 py-3 text-indigo-700 dark:text-indigo-400 font-medium">+{currency}{parseFloat(rec.overtimeAmount.toString()).toFixed(2)}</td>
                    <td className="px-4 py-3 text-emerald-700 dark:text-emerald-400 font-medium">+{currency}{parseFloat(rec.allowances.toString()).toFixed(2)}</td>
                    <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-medium">-{currency}{parseFloat(rec.deductions.toString()).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">{currency}{parseFloat(rec.netSalary.toString()).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={rec.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectPayslip && onSelectPayslip(rec)}
                        className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                      >
                        Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

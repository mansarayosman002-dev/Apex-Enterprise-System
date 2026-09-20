import React, { useState } from 'react';
import {
  DollarSign,
  Calculator,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  Clock,
  Download,
  FileBarChart,
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
  Sector,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardStats, PayrollRecord } from '../../types/index.ts';
import { StatCard } from '../common/StatCard.tsx';
import { Badge } from '../common/Badge.tsx';
import { ScrollReveal, ScrollStagger, ScrollStaggerItem } from '../common/ScrollReveal.tsx';

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

  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const totalCompensationValue = payrollBreakdownData.reduce((acc, curr) => acc + Math.max(0, curr.value), 0);

  const renderActivePieShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 7}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: `drop-shadow(0 0 10px ${fill})`, transition: 'all 0.3s ease' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 12}
          fill={fill}
          style={{ opacity: 0.85 }}
        />
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Action Buttons */}
      <ScrollReveal direction="down" distance={20}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 p-6 text-white shadow-[0_0_25px_rgba(16,185,129,0.2)] border border-emerald-500/30 cyber-corners backdrop-blur-md">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
              <CreditCard className="h-3.5 w-3.5" />
              <span>PAYROLL ENGINE</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              Payroll Ledger
            </h1>
            <p className="text-xs text-slate-300 font-mono">
              NASSIT calculations, overtime rates, and tax settlements for {currentPeriod}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActivePage('payroll')}
              className="flex items-center space-x-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-2 text-xs font-mono font-bold text-white hover:bg-emerald-500/30 transition shadow-xs cursor-pointer"
            >
              <Download className="h-4 w-4 text-emerald-300" />
              <span>LEDGER AUDIT</span>
            </button>
            <button
              onClick={() => setActivePage('payroll')}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-mono font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-300/40 hover:from-emerald-500 hover:to-teal-500 transition cursor-pointer"
            >
              <Calculator className="h-4 w-4" />
              <span>COMPUTE PAYROLL</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* 5 Required Payroll Metric Cards */}
      <ScrollReveal direction="up" distance={20}>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Compensation Summaries ({currentPeriod})
        </h2>
        <ScrollStagger className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5" staggerDelay={0.06}>
          {/* 1. Payroll Summary (Net Total) */}
          <ScrollStaggerItem>
            <StatCard
              title="Net Payroll"
              value={`${currency}${totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="Net payable"
              icon={DollarSign}
              iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
              iconTextColor="text-emerald-600 dark:text-emerald-400"
              badge="Net Total"
              badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
              onClick={() => setActivePage('payroll')}
            />
          </ScrollStaggerItem>

          {/* 2. Processed Payroll */}
          <ScrollStaggerItem>
            <StatCard
              title="Processed"
              value={processedCount}
              subtitle={`${processedCount} records`}
              icon={CheckCircle2}
              iconBgColor="bg-blue-50 dark:bg-blue-950/60"
              iconTextColor="text-blue-600 dark:text-blue-400"
              badge="Verified"
              badgeColor="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300"
              onClick={() => setActivePage('payroll')}
            />
          </ScrollStaggerItem>

          {/* 3. Pending Payroll */}
          <ScrollStaggerItem>
            <StatCard
              title="Pending"
              value={pendingCount}
              subtitle="Draft records"
              icon={Clock}
              iconBgColor="bg-amber-50 dark:bg-amber-950/60"
              iconTextColor="text-amber-600 dark:text-amber-400"
              badge={pendingCount > 0 ? 'Action Required' : 'All Clear'}
              badgeColor={pendingCount > 0 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}
              onClick={() => setActivePage('payroll')}
            />
          </ScrollStaggerItem>

          {/* 4. Overtime Payout */}
          <ScrollStaggerItem>
            <StatCard
              title="Overtime"
              value={`+${currency}${totalOvertimeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle={`${totalOTHours.toFixed(1)}h logged`}
              icon={TrendingUp}
              iconBgColor="bg-purple-50 dark:bg-purple-950/60"
              iconTextColor="text-purple-600 dark:text-purple-400"
              onClick={() => setActivePage('payroll')}
            />
          </ScrollStaggerItem>

          {/* 5. Gross Salary Totals */}
          <ScrollStaggerItem>
            <StatCard
              title="Gross Salary"
              value={`${currency}${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="Pre-deductions"
              icon={CreditCard}
              iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
              iconTextColor="text-indigo-600 dark:text-indigo-400"
              onClick={() => setActivePage('payroll')}
            />
          </ScrollStaggerItem>
        </ScrollStagger>
      </ScrollReveal>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Component Distribution Breakdown */}
        <ScrollReveal className="lg:col-span-2 h-full" delay={0} direction="up" distance={24}>
          <div className="h-full rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <span>Compensation Cost Structure</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Gross compensation vs statutory withholdings</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                Formula Verified
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="relative h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                      activeShape={renderActivePieShape}
                      data={payrollBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={1500}
                      animationEasing="ease-out"
                      animationBegin={150}
                      onMouseEnter={(_: any, index: number) => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(null)}
                    >
                      {payrollBreakdownData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          style={{
                            filter: activePieIndex === index ? `drop-shadow(0 0 12px ${entry.color})` : 'drop-shadow(0 0 2px rgba(0,0,0,0.3))',
                            opacity: activePieIndex !== null && activePieIndex !== index ? 0.45 : 1,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${currency}${Number(val).toFixed(2)}`, 'Amount']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '12px',
                        border: '1px solid rgba(16, 185, 129, 0.5)',
                        color: '#fff',
                        fontSize: '11px',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)',
                        backdropFilter: 'blur(8px)',
                      }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#34d399', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Holographic Center HUD */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <AnimatePresence mode="wait">
                    {activePieIndex !== null ? (
                      <motion.div
                        key={`pay-pie-active-${activePieIndex}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="text-center px-1"
                      >
                        <p className="text-[9px] font-sans uppercase text-slate-400 truncate max-w-[80px]">
                          {payrollBreakdownData[activePieIndex].name}
                        </p>
                        <p className="text-xs font-sans font-bold text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]">
                          {totalCompensationValue > 0
                            ? `${Math.round((payrollBreakdownData[activePieIndex].value / totalCompensationValue) * 100)}%`
                            : '0%'}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="pay-pie-idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <p className="text-[9px] font-sans tracking-widest text-slate-500 dark:text-emerald-400/70 uppercase">NET PAY</p>
                        <p className="text-xs font-sans font-bold text-slate-800 dark:text-slate-200">
                          {currency}{totalNet > 1000 ? (totalNet / 1000).toFixed(0) + 'k' : totalNet.toFixed(0)}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Interactive Breakdown Cards */}
              <div className="space-y-2 text-xs">
                {payrollBreakdownData.map((item, idx) => (
                  <div
                    key={item.name}
                    onMouseEnter={() => setActivePieIndex(idx)}
                    onMouseLeave={() => setActivePieIndex(null)}
                    className={`rounded-xl border p-2.5 flex justify-between items-center transition cursor-pointer ${
                      activePieIndex === idx
                        ? 'border-cyan-400/60 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                        : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0 transition-transform"
                        style={{
                          backgroundColor: item.color,
                          transform: activePieIndex === idx ? 'scale(1.4)' : 'scale(1)',
                          boxShadow: activePieIndex === idx ? `0 0 8px ${item.color}` : 'none',
                        }}
                      />
                      <span className="text-slate-600 dark:text-slate-300 font-sans font-medium">{item.name}</span>
                    </div>
                    <span className="font-sans font-bold text-slate-900 dark:text-white">
                      {item.name === 'Deductions' ? '-' : '+'}{currency}{Math.abs(item.value).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Ledger Status Summary */}
        <ScrollReveal delay={0.12} direction="up" distance={24} className="h-full">
          <div className="h-full rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Period Settlement</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                </h3>
                <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-300 uppercase">{currentPeriod}</span>
              </div>
              <div className="mt-4 space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Processed Records:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{processedCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Draft / Pending:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{pendingCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-2 font-bold text-slate-900 dark:text-white">
                  <span>Net Total Payable:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{currency}{totalNet.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                onClick={() => setActivePage('payroll')}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-mono font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/30 hover:from-emerald-500 hover:to-teal-500 transition cursor-pointer"
              >
                <Calculator className="h-4 w-4" />
                <span>LAUNCH PAYROLL LEDGER</span>
              </button>
              <button
                onClick={() => setActivePage('reports')}
                className="w-full flex items-center justify-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
              >
                <FileBarChart className="h-3.5 w-3.5 text-emerald-400" />
                <span>GENERATE AUDIT REPORTS</span>
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Recent Payroll Entries Table */}
      <ScrollReveal delay={0.08} direction="up" distance={28}>
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
      </ScrollReveal>
    </div>
  );
};

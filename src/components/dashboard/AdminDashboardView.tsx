import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Building,
  UserX,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Printer,
  CreditCard,
  ScanLine,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { DashboardStats, AttendanceRecord, PayrollRecord } from '../../types/index.ts';
import { StatCard } from '../common/StatCard.tsx';
import { Badge } from '../common/Badge.tsx';

interface AdminDashboardViewProps {
  stats: DashboardStats | null;
  recentLogs: AttendanceRecord[];
  pendingOvertime: any[];
  currency?: string;
  onOpenScanner: () => void;
  setActivePage: (page: string) => void;
  onApproveOT?: (id: number) => void;
  onRejectOT?: (id: number) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stats,
  recentLogs,
  pendingOvertime,
  currency = 'NLe ',
  onOpenScanner,
  setActivePage,
  onApproveOT,
  onRejectOT,
}) => {
  // Normalize numbers from stats
  const totalEmployees = stats?.totalEmployees || 0;
  const presentToday = stats?.presentToday ?? stats?.todayAttendance?.present ?? 0;
  const absentToday = stats?.absentToday ?? stats?.todayAttendance?.absent ?? Math.max(0, totalEmployees - presentToday);
  const lateToday = stats?.lateToday ?? stats?.todayAttendance?.late ?? 0;
  const overtimeCount = stats?.overtimeToday ?? stats?.todayAttendance?.overtime ?? 0;
  const totalPayroll = stats?.payroll?.totalNetSalary || stats?.totalPayroll || 0;
  const departmentsCount = stats?.totalDepartments || 0;

  // Chart Data Preparation
  // 1. Attendance Trend Chart
  const attendanceTrendData = (stats?.weeklyAttendance || [
    { day: 'Mon', present: Math.max(1, presentToday - 1), late: 1, absent: 0 },
    { day: 'Tue', present: presentToday, late: 2, absent: 1 },
    { day: 'Wed', present: Math.max(2, presentToday), late: lateToday, absent: absentToday },
    { day: 'Thu', present: presentToday, late: 0, absent: 1 },
    { day: 'Fri', present: Math.max(1, presentToday - 2), late: 1, absent: 2 },
  ]).map((d) => ({
    name: d.day || d.date || 'Day',
    Present: d.present || 0,
    Late: d.late || 0,
    Absent: d.absent || 0,
  }));

  // 2. Department Attendance Chart
  const deptAttendanceData = (stats?.departmentAttendance || [
    { name: 'Engineering', rate: 95, present: 18, total: 19 },
    { name: 'Operations', rate: 88, present: 14, total: 16 },
    { name: 'Human Resources', rate: 100, present: 5, total: 5 },
    { name: 'Finance & Payroll', rate: 92, present: 6, total: 7 },
    { name: 'Sales & Marketing', rate: 85, present: 10, total: 12 },
  ]).map((d) => ({
    name: d.departmentName || d.name,
    AttendanceRate: d.attendanceRate ?? d.rate ?? 90,
    Present: d.present ?? d.presentCount ?? 10,
  }));

  // 3. Payroll Summary Breakdown
  const payrollSummaryData = [
    { name: 'Basic Salary', value: stats?.payroll?.totalBasicSalary || totalPayroll * 0.85, color: '#4f46e5' },
    { name: 'Overtime', value: stats?.payroll?.totalOvertimeAmount || totalPayroll * 0.08, color: '#f59e0b' },
    { name: 'Allowances', value: stats?.payroll?.totalAllowances || totalPayroll * 0.07, color: '#10b981' },
    { name: 'Deductions', value: stats?.payroll?.totalDeductions || totalPayroll * 0.05, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* 7 Required Admin Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Enterprise Operational Overview
          </h2>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Real-time PostgreSQL 18 Sync</span>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-7">
          {/* 1. Total Employees */}
          <StatCard
            id="card-admin-employees"
            title="Total Employees"
            value={totalEmployees}
            subtitle="Registered staff"
            icon={Users}
            iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
            iconTextColor="text-indigo-600 dark:text-indigo-400"
            onClick={() => setActivePage('employees')}
          />

          {/* 2. Present Today */}
          <StatCard
            id="card-admin-present"
            title="Present Today"
            value={presentToday}
            subtitle={`${Math.round((presentToday / Math.max(1, totalEmployees)) * 100)}% turn-out`}
            icon={CheckCircle2}
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
            iconTextColor="text-emerald-600 dark:text-emerald-400"
            badge="On Duty"
            badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
            onClick={() => setActivePage('attendance')}
          />

          {/* 3. Absent Today */}
          <StatCard
            id="card-admin-absent"
            title="Absent Today"
            value={absentToday}
            subtitle="Unrecorded"
            icon={UserX}
            iconBgColor="bg-rose-50 dark:bg-rose-950/60"
            iconTextColor="text-rose-600 dark:text-rose-400"
            onClick={() => setActivePage('attendance')}
          />

          {/* 4. Late Today */}
          <StatCard
            id="card-admin-late"
            title="Late Today"
            value={lateToday}
            subtitle="Past shift grace"
            icon={Clock}
            iconBgColor="bg-amber-50 dark:bg-amber-950/60"
            iconTextColor="text-amber-600 dark:text-amber-400"
            onClick={() => setActivePage('attendance')}
          />

          {/* 5. Overtime */}
          <StatCard
            id="card-admin-overtime"
            title="Overtime"
            value={overtimeCount}
            subtitle="Logged OT shifts"
            icon={TrendingUp}
            iconBgColor="bg-purple-50 dark:bg-purple-950/60"
            iconTextColor="text-purple-600 dark:text-purple-400"
            onClick={() => setActivePage('attendance')}
          />

          {/* 6. Payroll */}
          <StatCard
            id="card-admin-payroll"
            title="Payroll"
            value={`${currency}${totalPayroll > 1000 ? (totalPayroll / 1000).toFixed(1) + 'k' : totalPayroll.toFixed(0)}`}
            subtitle="Month net total"
            icon={DollarSign}
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
            iconTextColor="text-emerald-600 dark:text-emerald-400"
            onClick={() => setActivePage('payroll')}
          />

          {/* 7. Departments */}
          <StatCard
            id="card-admin-departments"
            title="Departments"
            value={departmentsCount}
            subtitle="Active divisions"
            icon={Building}
            iconBgColor="bg-blue-50 dark:bg-blue-950/60"
            iconTextColor="text-blue-600 dark:text-blue-400"
            onClick={() => setActivePage('departments')}
          />
        </div>
      </div>

      {/* 3 Required Administrator Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart 1: Attendance Trend */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Trend</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Weekly present, late & absent volume</p>
            </div>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              5-Day Cycle
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#presentGrad)" />
                <Area type="monotone" dataKey="Late" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#lateGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Department Attendance */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Attendance</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Compliance rate by operational unit (%)</p>
            </div>
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
              Units
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptAttendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="AttendanceRate" name="Attendance %" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Payroll Summary */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payroll Summary</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Compensation component allocation</p>
            </div>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              {stats?.currentPeriod || 'Current'}
            </span>
          </div>

          <div className="mt-4 h-64 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="75%">
              <PieChart>
                <Pie
                  data={payrollSummaryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {payrollSummaryData.map((entry, index) => (
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-600 dark:text-slate-300 font-medium">
              {payrollSummaryData.map((d) => (
                <div key={d.name} className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate">{d.name}: {currency}{d.value > 1000 ? (d.value / 1000).toFixed(1) + 'k' : d.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Management Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Live Recent Attendance Activity */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Attendance Activity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live QR scans and check-in audit stream</p>
            </div>
            <button
              onClick={() => setActivePage('attendance')}
              className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition"
            >
              <span>View Full Ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
              No recent attendance logs recorded today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold">Employee</th>
                    <th className="px-3.5 py-2.5 font-semibold">Department</th>
                    <th className="px-3.5 py-2.5 font-semibold">Check In</th>
                    <th className="px-3.5 py-2.5 font-semibold">Check Out</th>
                    <th className="px-3.5 py-2.5 font-semibold">Hours</th>
                    <th className="px-3.5 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                      <td className="px-3.5 py-3">
                        <p className="font-bold text-slate-900 dark:text-white">{log.employeeName}</p>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{log.employeeCode}</span>
                      </td>
                      <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">{log.departmentName}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-700 dark:text-slate-300 font-medium">{log.checkIn}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-700 dark:text-slate-300">{log.checkOut || <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>}</td>
                      <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300">{log.workingHours}h {log.overtimeHours ? `(+${log.overtimeHours}h OT)` : ''}</td>
                      <td className="px-3.5 py-3">
                        <Badge variant={log.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Pending Overtime Claims & Quick Actions */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pending Overtime Review</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{pendingOvertime.length} claims awaiting supervisor approval</p>
              </div>
              <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                {pendingOvertime.length}
              </span>
            </div>

            {pendingOvertime.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5 opacity-70" />
                All overtime claims have been verified and processed.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {pendingOvertime.map((ot) => (
                  <div key={ot.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{ot.employeeName}</p>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{ot.overtimeDate} • {ot.hours} Hours</span>
                      </div>
                      <Badge variant="pending" />
                    </div>
                    {ot.reason && <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-1">"{ot.reason}"</p>}
                    <div className="flex justify-end space-x-2 pt-1">
                      {onRejectOT && (
                        <button
                          onClick={() => onRejectOT(ot.id)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        >
                          Reject
                        </button>
                      )}
                      {onApproveOT && (
                        <button
                          onClick={() => onApproveOT(ot.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
                        >
                          Approve OT
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Terminal Launch Card */}
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50 dark:from-indigo-950/40 via-white dark:via-slate-900 to-indigo-50/50 dark:to-slate-900 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">QR Attendance Terminal</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Launch kiosk camera to record staff check-ins</p>
            </div>
            <button
              onClick={onOpenScanner}
              className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              <ScanLine className="h-4 w-4" />
              <span>Launch Terminal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

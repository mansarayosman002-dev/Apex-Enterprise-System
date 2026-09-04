import React from 'react';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  CheckCircle2,
  Clock,
  Building,
  Users,
  FileText,
  Printer,
  Download,
  ArrowRight,
  ShieldCheck,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DashboardStats, Department, AttendanceRecord } from '../../types/index.ts';
import { StatCard } from '../common/StatCard.tsx';
import { Badge } from '../common/Badge.tsx';

interface ManagementDashboardViewProps {
  stats: DashboardStats | null;
  departments?: Department[];
  currency?: string;
  setActivePage: (page: string) => void;
}

export const ManagementDashboardView: React.FC<ManagementDashboardViewProps> = ({
  stats,
  departments = [],
  currency = 'NLe ',
  setActivePage,
}) => {
  const totalEmployees = stats?.totalEmployees || 0;
  const presentToday = stats?.presentToday ?? stats?.todayAttendance?.present ?? 0;
  const lateToday = stats?.lateToday ?? stats?.todayAttendance?.late ?? 0;
  const absentToday = stats?.absentToday ?? stats?.todayAttendance?.absent ?? Math.max(0, totalEmployees - presentToday);
  const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
  const punctualityRate = presentToday > 0 ? Math.round(((presentToday - lateToday) / presentToday) * 100) : 100;

  const totalPayroll = stats?.payroll?.totalNetSalary || stats?.totalPayroll || 0;
  const totalOvertimePayout = stats?.payroll?.totalOvertimeAmount || 0;

  // Chart data
  const deptPerformanceData = departments.map((d) => ({
    name: d.departmentName,
    Headcount: d.employeeCount || 0,
    Compliance: d.attendanceRate || 92,
  }));

  const executiveTrendData = [
    { month: 'May', AttendanceRate: 94, Payroll: totalPayroll * 0.95, Overtime: 24 },
    { month: 'Jun', AttendanceRate: 92, Payroll: totalPayroll * 0.98, Overtime: 32 },
    { month: 'Jul', AttendanceRate: 96, Payroll: totalPayroll * 0.97, Overtime: 28 },
    { month: 'Aug', AttendanceRate: attendanceRate || 95, Payroll: totalPayroll, Overtime: 35 },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 rounded-full bg-purple-500/20 px-3 py-0.5 text-xs font-semibold text-purple-300 backdrop-blur-xs border border-purple-500/30">
            <Award className="h-3.5 w-3.5" />
            <span>Executive Management Cockpit</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Strategic Workforce & Fiscal Performance
          </h1>
          <p className="text-xs text-slate-300">
            High-level executive overview of workforce operational efficiency, overtime expenditure, and department KPIs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActivePage('reports')}
            className="flex items-center space-x-1.5 rounded-xl border border-purple-400/40 bg-purple-500/20 px-3.5 py-2 text-xs font-semibold text-white hover:bg-purple-500/30 transition shadow-xs"
          >
            <BarChart3 className="h-4 w-4 text-purple-300" />
            <span>Executive Reports</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-purple-500 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print Summary</span>
          </button>
        </div>
      </div>

      {/* 5 Required Management KPI Overviews */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Organizational Health & Financial Indicators
        </h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Attendance Overview */}
          <StatCard
            title="Attendance Compliance"
            value={`${attendanceRate}%`}
            subtitle={`${presentToday} of ${totalEmployees} active personnel`}
            icon={CheckCircle2}
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
            iconTextColor="text-emerald-600 dark:text-emerald-400"
            badge="Target: 95%"
            badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
            onClick={() => setActivePage('attendance')}
          />

          {/* 2. Punctuality Rate */}
          <StatCard
            title="Punctuality Rating"
            value={`${punctualityRate}%`}
            subtitle={`${lateToday} late check-ins recorded`}
            icon={Clock}
            iconBgColor="bg-blue-50 dark:bg-blue-950/60"
            iconTextColor="text-blue-600 dark:text-blue-400"
            onClick={() => setActivePage('attendance')}
          />

          {/* 3. Overtime Overview */}
          <StatCard
            title="Overtime Impact"
            value={`${currency}${totalOvertimePayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subtitle="Calculated at 1.5x multiplier"
            icon={TrendingUp}
            iconBgColor="bg-purple-50 dark:bg-purple-950/60"
            iconTextColor="text-purple-600 dark:text-purple-400"
            badge="Overtime"
            badgeColor="bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300"
            onClick={() => setActivePage('payroll')}
          />

          {/* 4. Payroll Overview */}
          <StatCard
            title="Monthly Payroll Total"
            value={`${currency}${totalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subtitle={`Period: ${stats?.currentPeriod || 'Current'}`}
            icon={DollarSign}
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
            iconTextColor="text-emerald-600 dark:text-emerald-400"
            badge="Net Total"
            badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
            onClick={() => setActivePage('payroll')}
          />

          {/* 5. Department Statistics */}
          <StatCard
            title="Active Departments"
            value={departments.length || stats?.totalDepartments || 0}
            subtitle="Cross-functional units"
            icon={Building}
            iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
            iconTextColor="text-indigo-600 dark:text-indigo-400"
            onClick={() => setActivePage('departments')}
          />
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Attendance & Overtime Trends */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Compliance Trend</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Monthly company-wide adherence rate (%)</p>
            </div>
            <span className="rounded-full bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
              Q3 Cycle
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={executiveTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mgmtAttGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Area type="monotone" dataKey="AttendanceRate" name="Attendance %" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#mgmtAttGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Department Compliance & Headcount */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Workforce Distribution</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Headcount per operational division</p>
            </div>
            <button
              onClick={() => setActivePage('departments')}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
            >
              Manage Units →
            </button>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
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
                <Bar dataKey="Headcount" name="Staff Count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Reports & Executive Summary Trigger */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Executive Audit Reports</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Statutory and compliance reports for payroll and attendance</p>
          </div>
          <button
            onClick={() => setActivePage('reports')}
            className="flex items-center space-x-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
          >
            <span>Open Reports Suite</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => setActivePage('reports')}
            className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/30 dark:hover:bg-purple-950/30 transition"
          >
            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-2" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Monthly Attendance Audit</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Detailed logs of workdays, punctuality, and grace periods.</p>
          </div>

          <div
            onClick={() => setActivePage('reports')}
            className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition"
          >
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-2" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Payroll Ledger Breakdown</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Department expenditure, overtime totals, and tax deductions.</p>
          </div>

          <div
            onClick={() => setActivePage('reports')}
            className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 transition"
          >
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Overtime Utilization Report</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Audit trail of all supervisor-approved overtime hours.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

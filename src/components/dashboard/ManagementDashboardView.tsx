import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  CheckCircle2,
  Clock,
  Building,
  Users,
  FileText,
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
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DashboardStats, Department, AttendanceRecord } from '../../types/index.ts';
import { StatCard } from '../common/StatCard.tsx';
import { Badge } from '../common/Badge.tsx';
import { ScrollReveal, ScrollStagger, ScrollStaggerItem } from '../common/ScrollReveal.tsx';

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

  const [hoveredMgmtBar, setHoveredMgmtBar] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <ScrollReveal direction="down" distance={20}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 p-6 text-white shadow-[0_0_25px_rgba(139,92,246,0.2)] border border-purple-500/30 cyber-corners backdrop-blur-md">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 rounded-full bg-purple-500/20 px-3 py-0.5 text-xs font-mono font-bold text-purple-300 border border-purple-500/30 shadow-[0_0_8px_rgba(139,92,246,0.25)]">
              <Award className="h-3.5 w-3.5" />
              <span>EXECUTIVE OVERVIEW</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase drop-shadow-[0_0_10px_rgba(139,92,246,0.2)]">
              Executive Overview
            </h1>
            <p className="text-xs text-slate-300 font-mono">
              Operational metrics, staffing distribution, and compensation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActivePage('reports')}
              className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-mono font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.35)] border border-purple-300/40 hover:from-purple-500 hover:to-indigo-500 transition cursor-pointer"
            >
              <BarChart3 className="h-4 w-4 text-purple-200" />
              <span>AUDIT REPORTS</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* 5 Required Management KPI Overviews */}
      <div>
        <ScrollReveal direction="up" distance={15}>
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Key Indicators
          </h2>
        </ScrollReveal>
        <ScrollStagger className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Attendance Overview */}
          <ScrollStaggerItem>
            <StatCard
              title="Attendance"
              value={`${attendanceRate}%`}
              subtitle={`${presentToday}/${totalEmployees} present`}
              icon={CheckCircle2}
              iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
              iconTextColor="text-emerald-600 dark:text-emerald-400"
              badge="Target: 95%"
              badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
              onClick={() => setActivePage('attendance')}
            />
          </ScrollStaggerItem>

          {/* 2. Punctuality Rate */}
          <ScrollStaggerItem>
            <StatCard
              title="Punctuality"
              value={`${punctualityRate}%`}
              subtitle={`${lateToday} late today`}
              icon={Clock}
              iconBgColor="bg-blue-50 dark:bg-blue-950/60"
              iconTextColor="text-blue-600 dark:text-blue-400"
              onClick={() => setActivePage('attendance')}
            />
          </ScrollStaggerItem>

          {/* 3. Overtime Overview */}
          <ScrollStaggerItem>
            <StatCard
              title="Overtime"
              value={`${currency}${totalOvertimePayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              subtitle="1.5x multiplier"
              icon={TrendingUp}
              iconBgColor="bg-purple-50 dark:bg-purple-950/60"
              iconTextColor="text-purple-600 dark:text-purple-400"
              badge="Overtime"
              badgeColor="bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300"
              onClick={() => setActivePage('payroll')}
            />
          </ScrollStaggerItem>

          {/* 4. Payroll Overview */}
          <ScrollStaggerItem>
            <StatCard
              title="Payroll"
              value={`${currency}${totalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              subtitle={stats?.currentPeriod || 'Current'}
              icon={DollarSign}
              iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
              iconTextColor="text-emerald-600 dark:text-emerald-400"
              badge="Net Total"
              badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
              onClick={() => setActivePage('payroll')}
            />
          </ScrollStaggerItem>

          {/* 5. Department Statistics */}
          <ScrollStaggerItem>
            <StatCard
              title="Departments"
              value={departments.length || stats?.totalDepartments || 0}
              subtitle="Active units"
              icon={Building}
              iconBgColor="bg-indigo-50 dark:bg-indigo-950/60"
              iconTextColor="text-indigo-600 dark:text-indigo-400"
              onClick={() => setActivePage('departments')}
            />
          </ScrollStaggerItem>
        </ScrollStagger>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Attendance & Overtime Trends */}
        <ScrollReveal direction="left" distance={25} delay={0.1} className="h-full">
          <div className="h-full rounded-2xl border border-purple-500/25 dark:border-purple-500/35 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <span>Attendance Compliance Trend</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Monthly company-wide adherence rate (%)</p>
              </div>
              <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-[10px] font-sans font-bold text-purple-600 dark:text-purple-300 shadow-[0_0_8px_rgba(139,92,246,0.2)]">
                Q3 Telemetry
              </span>
            </div>

            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={executiveTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <filter id="mgmtAreaGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#8b5cf6" floodOpacity="0.85" />
                    </filter>
                    <linearGradient id="mgmtAttGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
                      <stop offset="60%" stopColor="#8b5cf6" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8b5cf6" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={{ stroke: '#334155', strokeWidth: 1 }} tickLine={false} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    cursor={{ stroke: '#8b5cf6', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid rgba(139, 92, 246, 0.5)',
                      color: '#fff',
                      fontSize: '11px',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.35)',
                      backdropFilter: 'blur(8px)',
                    }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: '#c084fc', fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="AttendanceRate"
                    name="Attendance %"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#mgmtAttGrad)"
                    style={{ filter: 'url(#mgmtAreaGlow)' }}
                    isAnimationActive={true}
                    animationDuration={1600}
                    animationEasing="ease-out"
                    animationBegin={150}
                    activeDot={{
                      r: 6,
                      stroke: '#8b5cf6',
                      strokeWidth: 3,
                      fill: '#030712',
                      style: { filter: 'drop-shadow(0 0 10px #8b5cf6)' },
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ScrollReveal>

        {/* Chart 2: Department Compliance & Headcount */}
        <ScrollReveal direction="right" distance={25} delay={0.15} className="h-full">
          <div className="h-full rounded-2xl border border-purple-500/25 dark:border-purple-500/35 bg-white/90 dark:bg-slate-900/85 p-5 shadow-xs backdrop-blur-md cyber-corners flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                  <span>Department Workforce Distribution</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Headcount per operational division</p>
              </div>
              <button
                onClick={() => setActivePage('departments')}
                className="text-xs font-sans font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition"
              >
                MANAGE UNITS →
              </button>
            </div>

            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptPerformanceData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onMouseMove={(state: any) => {
                    if (state?.isTooltipActive) {
                      setHoveredMgmtBar(state.activeTooltipIndex ?? null);
                    } else {
                      setHoveredMgmtBar(null);
                    }
                  }}
                  onMouseLeave={() => setHoveredMgmtBar(null)}
                >
                  <defs>
                    <filter id="mgmtBarGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#a855f7" floodOpacity="0.9" />
                    </filter>
                    <linearGradient id="mgmtBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="mgmtBarGradActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.95} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8b5cf6" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={{ stroke: '#334155', strokeWidth: 1 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid rgba(139, 92, 246, 0.5)',
                      color: '#fff',
                      fontSize: '11px',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.35)',
                      backdropFilter: 'blur(8px)',
                    }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: '#c084fc', fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="Headcount"
                    name="Staff Count"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1400}
                    animationEasing="ease-out"
                    animationBegin={200}
                  >
                    {deptPerformanceData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={hoveredMgmtBar === index ? 'url(#mgmtBarGradActive)' : 'url(#mgmtBarGrad)'}
                        style={{
                          filter: hoveredMgmtBar === index ? 'url(#mgmtBarGlow)' : 'drop-shadow(0 0 3px rgba(139, 92, 246, 0.3))',
                          opacity: hoveredMgmtBar !== null && hoveredMgmtBar !== index ? 0.45 : 1,
                          transition: 'all 0.25s ease',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Reports & Executive Summary Trigger */}
      <ScrollReveal direction="up" distance={30} delay={0.2}>
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
      </ScrollReveal>
    </div>
  );
};
